import DataStorage from '../src/utils/DataStorage'
import { arrReadOnly, isObj, isFn, objHasKeys, objCopy, objClean, objWithoutKeys } from '../src/utils/utils'
import { RATE_PERIODS, calcAmount, secondsToDuration, BLOCK_DURATION_SECONDS } from '../src/utils/time'
const timeKeeping = new DataStorage('time-keeping.json', true)

const REQUIRED_KEYS = arrReadOnly([
    'address',
    'blockEnd',
    'blockStart',
    'projectHash',
    'rateAmount',
    'rateUnit',
    'ratePeriod',
])

// only update from the server
const OTHER_KEYS = arrReadOnly([
    'approved', // true => approved, false => rejected, undefined: not set yet
    'duration',
    'blockCount',
    'totalAmount',
    'tsCreated',
    'tsUpdated',
    'updatedBy'
])

const messages = {
    alreadyApproved: 'Cannot update an already approved time keeping entry',
    invalidBlockCount: 'Block count must be a valid positive number',
    invalidKeys: `Time keeping entry must contain all of the following properties: ${REQUIRED_KEYS.join(', ')} and an unique hash`,
    loginRequired: 'Must be logged in to book/update an entry',
    notFound: 'Time keeping entry not found',
    permissionDenied: 'Permission denied'
}

// add, get or update a time keeping entry
export const handleTimeKeepingEntry = (client, findUserByClientId) => (hash, entry, callback) => {
    if (!isFn(callback)) return
    let savedEntry = timeKeeping.get(hash)
    if (!isObj(entry)) return callback(null, savedEntry)

    const create = !savedEntry
    const user = findUserByClientId(client.id)
    if (!user) return callback(messages.loginRequired)
    if (!create && savedEntry.userId !== user.id) return callback(messages.permissionDenied)
    // validate entry
    if (!objHasKeys(entry, REQUIRED_KEYS, true)) return callback(messages.invalidKeys + JSON.stringify(entry, null, 4))

    if (!create && savedEntry.approved) return callback(messages.alreadyApproved)
    savedEntry = objCopy(objWithoutKeys(entry, OTHER_KEYS), savedEntry)
    const { blockEnd, blockStart, rateAmount, ratePeriod, tsCreated, userId } = savedEntry
    savedEntry.blockCount = blockEnd - blockStart
    if (savedEntry.blockCount < 0) return callback(messages.invalidBlockCount)
    savedEntry.duration = secondsToDuration(BLOCK_DURATION_SECONDS * savedEntry.blockCount)
    savedEntry.totalAmount = calcAmount(savedEntry.blockCount, rateAmount, ratePeriod)
    savedEntry.tsCreated = tsCreated || new Date()

    if (create) {
        savedEntry.userId = user.id
        savedEntry.approved = undefined
    } else {
        savedEntry.tsUpdated = new Date()
        savedEntry.updatedBy = user.id
    }

    // add to/update storage
    timeKeeping.set(hash, savedEntry)

    console.log('Time keeping entry added', hash)
    callback()
}

export const handleTimeKeepingEntrySearch = (query, matchExact, matchAll, ignoreCase, callback) => {
    if (!isFn(callback)) return
    const searchableKeys = ['address', 'projectHash', 'approved']
    let keyValues = {}
    if (isObj(query)) {
        keyValues = objClean(query, searchableKeys)
    } else {
        searchableKeys.forEach(key => keyValues[key] = query)
    }
    callback(null, timeKeeping.search(keyValues, matchExact, matchAll, ignoreCase))
}

// approve/disapprove a time keeping entry
export const handleTimeKeepingEntryApproval = (hash, approve = false, callback) => {
    if (!isFn(callback)) return
    const savedEntry = timeKeeping.get(hash)
    if (!savedEntry) return callback(messages.notFound)
    if (savedEntry.approved) return callback(messages.alreadyApproved)
    savedEntry.approved = approve
    timeKeeping.set(hash, savedEntry)
    callback()
}

export const handleTimeKeepingBan = (projectHash, userAddress, ban = false, callback) => {
    
}

export const handleTimeKeepingDispute = (hash, callback) => {
    
}

// notify user ????
export const handleNotify = (userId, hash, message) => {

}