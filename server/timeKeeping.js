import DataStorage from '../src/utils/DataStorage'
import { arrReadOnly, isObj, isFn, mapSearch, objHasKeys, objCopy, objClean, objWithoutKeys } from '../src/utils/utils'
import { secondsToDuration, BLOCK_DURATION_SECONDS } from '../src/utils/time'
import { getProject, handleProjectFirstUsedTS } from './projects'
import { getUserByClientId, idExists } from './users'
const timeKeeping = new DataStorage('time-keeping.json', true)
const timeKeepingInvitations = new DataStorage('time-keeping-invitations.json', true)

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
    invalidUserIds: 'Invalid user ID(s) supplied',
    invalidProjectOwner: 'Invalid project owner ID supplied',
    loginRequired: 'Must be logged in to book/update an entry',
    notFound: 'Time keeping entry not found',
    projectNotFound: 'Project not found',
    usersAlreadyAcceptedProject: userIds => `User${userIds.length > 1 ? 's' : ''} already accepted the project: ${userIds.join()}`,
}

// add, get or update a time keeping entry
export function handleTimeKeepingEntry(hash, entry, callback) {
    const client = this
    if (!isFn(callback)) return

    let savedEntry = timeKeeping.get(hash)
    if (!isObj(entry)) return callback(null, savedEntry)

    const create = !savedEntry
    const user = getUserByClientId(client.id)
    if (!user) return callback(messages.loginRequired)

    const project = getProject(entry.projectHash)
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
    handleProjectFirstUsedTS(entry.projectHash, err => err && console.log(
        'Failed to save project first used timestamp. Project Hash: ', hash, ' Current Time:', new Date(),
        '\nError: ', err
    ))
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
export function handleTimeKeepingEntryApproval(hash, approve = false, callback) {
    const client = this
    if (!isFn(callback)) return
    const entry = timeKeeping.get(hash)
    if (!entry) return callback(messages.notFound)
    const user = getUserByClientId(client.id)
    const project = getProject(entry.projectHash)
    if (!user || user.id !== project.userId) return callback(messages.accessDenied)
    if (entry.approved) return callback(messages.alreadyApproved)
    entry.approved = approve
    timeKeeping.set(hash, entry)
    callback()
}

export function handleTimeKeepingDispute(hash, callback) {
    const client = this
}

// Retrieve list of invitations by project hash
export function handleTimeKeepingInvitations(projectHash, callback) {
    if (!isFn(callback)) return
    const client = this
    const user = getUserByClientId(client.id)
    if (!user) return callback(messages.loginRequired)

    const project = getProject(projectHash)
    if (!project) return callback(messages.projectNotFound)

    const isOwner = project.userId === user.id
    const projectInvites = new Map(timeKeepingInvitations.get(projectHash))
    // return all invitations only if requester is the project owner
    if (isOwner || projectInvites.length === 0) return callback(null, projectInvites)
    const userInvitation = projectInvites.get(user.id)
    const result = new Map()
    if (userInvitation) result.set(user.id, userInvitation)
    callback(null, result)
}


// onIdentityRequest
// notifyHandler
//
// Returns error string or undefined (success)
export function processTKIdentityRequest(notificationId, ownerId, workerIds, { projectHash, workerAddress }) {
    const project = getProject(projectHash)
    if (!project) return messages.projectNotFound
    // Only allow project owner to send invitations to time keeping
    if (!project.userId || project.userId !== ownerId) return messages.accessDenied

    const invalidIds = workerIds.filter(userId => !idExists(userId))
    if (invalidIds.length > 0) return `${messages.invalidUserIds}: ${invalidIds.join(', ')} `

    const projectInvites = new Map(timeKeepingInvitations.get(projectHash))
    const idsAreadyAccepted = workerIds.reduce((ids, workerId) => {
        const workerInvite = projectInvites.get(workerId)
        if (workerInvite) {
            // prevents overriding data but will still send an invitation to the worker
            workerInvite.accepted || !!workerInvite.workerAddress ? ids.push(workerId) : null
        } else {
            projectInvites.set(workerId, {
                notificationId,
                status: 'identity requested',
                tsInvited: new Date(),
                workerAddress,
            })
        }
        return ids
    }, [])

    if (idsAreadyAccepted.length > 0) return messages.usersAlreadyAcceptedProject(idsAreadyAccepted)
    // save/update data
    timeKeepingInvitations.set(projectHash, projectInvites)
}

// 
// notifyHandler
export function processTKIdentityResponse(nId, workerId, [ownerId], { projectHash, accepted, workerAddress }) {
    const project = getProject(projectHash)
    if (!project) return messages.projectNotFound
    if (ownerId !== project.userId) return messages.invalidProjectOwner

    const projectInvites = new Map(timeKeepingInvitations.get(projectHash))
    const workerInvite = projectInvites.get(workerId)
    if (!workerInvite) return messages.invitationNotFound
    workerInvite.status = `identity ${accepted && !!workerAddress ? 'supplied' : 'rejected'}`
    workerInvite.workerAddress = workerAddress
    // update data
    projectInvites.set(workerId, workerInvite)
    timeKeepingInvitations.set(projectHash, projectInvites)
}

export function processTKInvitation(notificationId, ownerId, workerIds, { projectHash, workerAddress }) {
    const project = getProject(projectHash)
    if (project.userId !== ownerId) return messages.accessDenied

    const projectInvites = new Map(timeKeepingInvitations.get(projectHash))
    workerIds.forEach(workerId => {
        const workerInvite = projectInvites.get(workerId) || { notificationId, tsInvited: new Date(), workerAddress }
        workerInvite.status = 'invitation sent'
        projectInvites.set(workerId, workerInvite)
    })
    if (projectInvites.size > 0) timeKeepingInvitations.set(projectHash, projectInvites)
}

export function processTKInvitationResponse(nId, workerId, [ownerId], { accepted, projectHash, workerAddress }) {
    const project = getProject(projectHash)
    if (ownerId !== project.userId) return messages.invalidProjectOwner
    const projectInvites = new Map(timeKeepingInvitations.get(projectHash))
    const workerInvite = projectInvites.get(workerId)
    if (!workerInvite) return messages.invitationNotFound
    workerInvite.status = `invitation ${accepted ? 'accepted' : 'rejected'}`
    projectInvites.set(workerId, workerInvite)
    timeKeepingInvitations.set(projectHash, projectInvites)
}