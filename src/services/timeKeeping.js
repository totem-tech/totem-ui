import { Bond } from 'oo7'
import uuid from 'uuid'
import project, {
    fetchProjects,
    getProjects as getUserProjects,
    getProjectsBond as getUserProjectsBond
} from './project'
import { hashBytes, validatedSenderAddress } from './blockchain'
import { getSelected, selectedAddressBond } from './identity'
import DataStorage from '../utils/DataStorage'
import { bytesToHex, ss58Decode, ss58Encode } from '../utils/convert'
import { isBool, mapJoin } from '../utils/utils'
import { getAddressName } from '../components/ProjectDropdown'
import partners from './partners'

// Only stores projects that not owned by the selected identity
const CACHE_PREFIX = 'totem__cache_timekeeping_projects_'

const cacheStorage = new DataStorage(undefined, true)
const _config = {
    address: undefined,
    firstAttempt: true,
    hashesBond: undefined,
    tieId: undefined,
    updateInProgress: false,
    updatePromise: undefined,
}

// getProjects returns all the projects user owns along with the projects they have been invited to (accepted or not).
// Retrieved data is cached in localStorage and only updated there is changes to invitation or manually triggered by setting `@_forceUpdate` to `true`.
//
// Params:
// @forceUpdate bool: if true and user is online, forces to update the cache.
export const getProjects = (_forceUpdate = false) => {
    _forceUpdate = _forceUpdate || _config.firstAttempt
    const { address } = getSelected()
    cacheStorage.name = CACHE_PREFIX + address
    const invitedProjects = cacheStorage.getAll()
    if (_config.address !== address) {
        _config.firstAttempt = true
        _config.address = address
        if (_config.hashesBond) _config.hashesBond.untie(_config.tieId)
        _config.hashesBond = timeKeeping.invitation.listByWorker(address)
        // listen for changes to user invitations and update projects list
        _config.tieId = _config.hashesBond.tie(hashes => {
            hashes = hashes.map(h => '0x' + bytesToHex(h))
            const changed = !!Array.from(invitedProjects).find(([hash]) => !hashes.includes(hash))
                || !!hashes.find(hash => !invitedProjects.get(hash))

            !_config.firstAttempt && _config.updateInProgress && changed && getProjects(true)
        })
    }
    if (_config.updateInProgress && _config.updatePromise) return _config.updatePromise
    // retrieve user owned projects
    _config.updatePromise = getUserProjects().then(userProjects => {
        if (!navigator.onLine || !_forceUpdate && invitedProjects.size > 0) {
            return mapJoin(userProjects, invitedProjects)
        }

        _config.updateInProgress = true
        // invited project hashes
        return Bond.promise([_config.hashesBond]).then(hashes => {
            hashes = hashes.flat().map(h => '0x' + bytesToHex(h))
                // exclude user owned projects
                .filter(hash => !userProjects.get(hash))

            //retrieve invited project details excluding own projects
            return fetchProjects(hashes).then(invitedProjects => {
                _config.updateInProgress = false
                _config.firstAttempt = false
                cacheStorage.setAll(invitedProjects)
                _forceUpdate && getProjectsBond.changed(uuid.v1())
                const joined = mapJoin(userProjects, invitedProjects)
                return joined
            })
        })
    })
    return _config.updatePromise
}

// Triggered whenever time keeping project list is updated
export const getProjectsBond = new Bond().defaultTo(uuid.v1())
getUserProjectsBond.tie(() => getProjectsBond.changed(uuid.v1()))

export const getProjectInvites = projectHash => Bond.promise([
    timeKeeping.invitation.listByProject(projectHash),
    project.getOwner(projectHash),
]).then(([addresses, ownerAddress]) => {
    addresses = addresses.map(w => ss58Encode(w))
    ownerAddress = ss58Encode(ownerAddress)
    const { address } = getSelected()
    const isOwner = ownerAddress === address
    const invitations = new Map()
    if (addresses.length === 0) return invitations
    return Bond.promise(
        addresses.map(address => timeKeeping.invitation.status(projectHash, address))
    ).then(statuses => {
        statuses.flat().forEach((status, i) => {
            if (!isOwner && address !== addresses[i]) return
            const identity = partners.get(addresses[i]) || {}
            const { userId } = identity
            invitations.set(addresses[i], {
                accepted: status,
                address: addresses[i],
                addressName: getAddressName(addresses[i]),
                invited: isBool(status),
                projectHash,
                status,
                userId,
            })
        })
        return invitations
    })
})

const timeKeeping = {
    invitation: {
        // Blockchain transaction
        // (worker) accept invitation to a project
        accept: (projectHash, workerAddress, accepted) => {
            return post({
                sender: validatedSenderAddress(workerAddress),
                call: calls.timekeeping.workerAcceptanceProject(hashBytes(projectHash), accepted),
                compact: false,
                longevity: true
            })
        },
        // Blockchain transaction
        // (project owner) invite a worker to join a project
        add: (projectHash, ownerAddress, workerAddress) => {
            return post({
                sender: validatedSenderAddress(ownerAddress),
                call: calls.timekeeping.notifyProjectWorker(
                    ss58Decode(workerAddress),
                    hashBytes(projectHash),
                ),
                compact: false,
                longevity: true
            })
        },
        // status of an invitation
        status: (projectHash, workerAddress) => runtime.timekeeping.workerProjectsBacklogStatus([
            hashBytes(projectHash),
            ss58Decode(workerAddress)
        ]),
        listByProject: projectHash => runtime.timekeeping.projectWorkersList(hashBytes(projectHash)),
        // projects that worker has been invited to or accepted
        listByWorker: workerAddress => runtime.timekeeping.workerProjectsBacklogList(ss58Decode(workerAddress)),
    },
    record: {
        // Blockchain transaction
        // @postingPeriod u16: 15 fiscal periods (0-14) // not yet implemented use default 0
        add: (workerAddress, projectHash, recordHash, blockCount, postingPeriod, blockStart, blockEnd) => {
            return post({
                sender: validatedSenderAddress(workerAddress),
                call: calls.timekeeping.submitTime(
                    hashBytes(projectHash),
                    hashBytes(recordHash),
                    blockCount,
                    postingPeriod,
                    blockStart,
                    blockEnd,
                ),
                compact: false,
                longevity: true
            })
        },
        // Blockchain transaction
        // (project owner) approve a time record
        approve: (workerAddress, projectHash, recordHash, status = 0, locked = false, reason = {}) => {
            return post({
                sender: validatedSenderAddress(workerAddress),
                call: calls.timekeeping.authoriseTime(
                    ss58Encode(workerAddress),
                    hashBytes(projectHash),
                    hashBytes(recordHash),
                    status,
                    locked,
                    reason,
                ),
                compact: false,
                longevity: true
            })
        },
        // get details of a record
        get: (recordHash) => runtime.timekeeping.timeRecord(hashBytes(recordHash)),
        isOwner: (hash, address) => runtime.timeKeeping.timeHashOwner(hashBytes(hash), ss58Decode(address)),
        // list of all record hashes booked by worker
        list: workerAddress => runtime.timekeeping.workerTimeRecordsHashList(ss58Decode(workerAddress)),
        // list of all record hashes in a project 
        listByProject: projectHash => runtime.timekeeping.projectTimeRecordsHashList(hashBytes(projectHash)),
    },
    // list of workers that accepted invitation
    workers: projectHash => runtime.timekeeping.projectWorkersList(hashBytes(projectHash)),
    // check if worker is banned. undefined: not banned, object: banned
    workerBanStatus: (projectHash, address) => runtime.timekeeping.projectWorkersBanList(
        hashBytes(projectHash),
        validatedSenderAddress(address)
    ),
}
export default timeKeeping