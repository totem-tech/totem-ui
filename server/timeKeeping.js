import DataStorage from '../src/utils/DataStorage'
import { isObj, isFn, objHasKeys, objCopy, objClean, objWithoutKeys } from '../src/utils/utils'
import { RATE_PERIODS, calcAmount, secondsToDuration, BLOCK_DURATION_SECONDS } from '../src/utils/time'
const timeKeeping = new DataStorage('time-keeping.json', true)

const REQUIRED_KEYS = [
    'address',
    'blockEnd',
    'blockStart',
    'projectHash',
    'rateAmount',
    'rateUnit',
    'ratePeriod',
]

// only update from the server
const OTHER_KEYS = [
    'approved',
    'duration',
    'blockCount',
    'totalAmount',
    'tsCreated',
    'tsUpdated',
    'updatedBy'
]

const messages = {
    alreadyApproved: 'Cannot update an already approved time keeping entry',
    invalidBlockCount: 'Block count must be a valid positive number',
    invalidKeys: `Time keeping entry must contain all of the following properties: ${REQUIRED_KEYS.join(', ')} and an unique hash`,
    loginRequired: 'Must be logged in to book/update an entry',
    notFound: 'Time keeping entry not found',
}

// add, get or update a time keeping entry
export const handleTimeKeepingEntry = (client, findUserByClientId) => (hash, entry, callback) => {
    console.log('handleTimeKeepingEntry')
    console.log('hash', hash)
    if (!isFn(callback)) return
    let savedEntry = timeKeeping.get(hash)
    if (!isObj(entry)) return callback(null, savedEntry)

    const create = !savedEntry
    const user = findUserByClientId(client.id)
    if (!user) return callback(messages.loginRequired)
    // validate entry
    if (!objHasKeys(entry, REQUIRED_KEYS, true)) return callback(messages.invalidKeys)

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
        savedEntry.approved = false
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
    console.log('handleTimeKeepingEntrySearch', query, matchExact, matchAll, ignoreCase, isFn(callback))
    if (!isFn(callback)) return
    const searchableKeys = ['address', 'projectHash', 'approved']
    let keyValues = {}
    if (isObj(query)) {
        keyValues = objClean(query, searchableKeys)
    } else {
        searchableKeys.forEach(key => keyValues[key] = query)
    }
    const result = timeKeeping.search(keyValues, matchExact, matchAll, ignoreCase)
    console.log('results:', result.size)
    callback(null, result)
}

// approve/disapprove a time keeping entry
export const handleTimeKeepingEntryApproval = (hash, approve = false, callback) => {
    if (!isFn(callback)) return
    const savedEntry = timeKeeping.get(hash)
    if (!savedEntry) return callback(messages.notFound)
    if (!approve && savedEntry.aproved) return callback(messages.alreadyApproved)
    savedEntry.approved = approve
    timeKeeping.set(hash, savedEntry)
    callback()
}

// notify user ????
export const handleNotify = (userId, hash, message) => {

}