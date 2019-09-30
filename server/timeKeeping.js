import DataStorage from '../src/utils/DataStorage'
import { arrReadOnly, isObj, isFn, objHasKeys, objCopy, objClean, objWithoutKeys } from '../src/utils/utils'
import { secondsToDuration, BLOCK_DURATION_SECONDS } from '../src/utils/time'
import { handleProject as getProject, handleProjectFirstUsedTS as setFirstUsed } from './projects'
const timeKeeping = new DataStorage('time-keeping.json', true)

const REQUIRED_KEYS = arrReadOnly([
    'address',
    'blockEnd',
    'blockStart',
    'projectHash',
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
    accessDenied: 'Access denied',
    alreadyApproved: 'Cannot update an already approved time keeping entry',
    invalidBlockCount: 'Block count must be a valid positive number',
    invalidKeys: `Time keeping entry must contain all of the following properties: ${REQUIRED_KEYS.join(', ')} and an unique hash`,
    loginRequired: 'Must be logged in to book/update an entry',
    notFound: 'Time keeping entry not found',
}

// add, get or update a time keeping entry
export const handleTimeKeepingEntry = (client, findUserByClientId) => (hash, entry, callback) => {
    if (!isFn(callback)) return
    let savedEntry = timeKeeping.get(hash)
    if (!isObj(entry)) return callback(null, savedEntry)
    const create = !savedEntry
    const user = findUserByClientId(client.id)
    if (!user) return callback(messages.loginRequired)

    getProject(client, findUserByClientId)(entry.projectHash, null, null, (_, project = {}) => {
        const addrs = (project.timeKeeping || {}).bannedAddresses || []
        const isBanned = addrs && addrs.indexOf(entry.address) >= 0
        if (!create && (savedEntry.userId !== user.id || isBanned)) return callback(messages.accessDenied)
        if (!create && savedEntry.approved) return callback(messages.alreadyApproved)
        // validate entry
        if (!objHasKeys(entry, REQUIRED_KEYS, true)) return callback(messages.invalidKeys)
    
        savedEntry = objCopy(objWithoutKeys(entry, OTHER_KEYS), savedEntry)
        const { blockEnd, blockStart, tsCreated } = savedEntry
        savedEntry.blockCount = blockEnd - blockStart
        if (savedEntry.blockCount < 0) return callback(messages.invalidBlockCount)
        savedEntry.duration = secondsToDuration(BLOCK_DURATION_SECONDS * savedEntry.blockCount)
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
        if (!create || project.tsFirstUsed) return
        setFirstUsed(entry.projectHash, err => err && console.log(
            'Failed to save project first used timestamp. Project Hash: ', hash, ' Current Time:', new Date(),
            '\nError: ', err
        ))
    })
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
export const handleTimeKeepingEntryApproval = (client, findUserByClientId) => (hash, approve = false, callback) => {
    if (!isFn(callback)) return
    const entry = timeKeeping.get(hash)
    if (!entry) return callback(messages.notFound)
    const user = findUserByClientId(client.id)
    getProject(client, findUserByClientId)(entry.projectHash, null, null, (_, project = {}) => {
        if (!user || user.id !== project.userId) return callback(messages.accessDenied)
        if (entry.approved) return callback(messages.alreadyApproved)
        entry.approved = approve
        timeKeeping.set(hash, entry)
        callback()
    })
}

export const handleTimeKeepingDispute = (hash, callback) => {
    
}

// notify user ????
export const handleNotify = (userId, hash, message) => {

}