import { Bond } from 'oo7'
import { calls, post, runtime } from 'oo7-substrate'
import uuid from 'uuid'
import project, {
    fetchProjects,
    getProjects as getUserProjects,
    getProjectsBond as getUserProjectsBond
} from './project'
import { getSelected } from './identity'
import DataStorage from '../utils/DataStorage'
import { bytesToHex, hashBytes, validateAddress, ss58Decode, ss58Encode } from '../utils/convert'
import { mapJoin } from '../utils/utils'
import { getAddressName } from '../components/ProjectDropdown'
import partners from './partners'
import identities from './identity'
import { getUser } from './ChatClient'

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

export const getProjectWorkers = projectHash => Bond.promise([
    timeKeeping.invitation.listByProject(projectHash),
    // ToDo: add invited workers bond here
    new Bond().defaultTo([]),
    project.getOwner(projectHash),
]).then(([acceptedAddresses, invitedAddresses, ownerAddress]) => {
    const allAddresses = ([...acceptedAddresses, ...invitedAddresses]).map(w => ss58Encode(w))
    ownerAddress = ss58Encode(ownerAddress)
    const { address: selectedAddress } = getSelected()
    const isOwner = ownerAddress === selectedAddress
    const workers = new Map()

    allAddresses.forEach((address, i) => {
        if (isOwner || selectedAddress === address) {
            let { name, userId } = identities.get(address) || {}
            let isPartner, isOwnIdentity;
            if (name) {
                // address is own identitty
                userId = (getUser() || {}).id
                isOwnIdentity = true
            } else {
                const partner = partners.get(address) || {}
                name = partner.name
                userId = partner.userId
                isPartner = true
            }
            !workers.get(address) && workers.set(address, {
                accepted: i < acceptedAddresses.length,
                address: address,
                addressName: getAddressName(address),
                invited: true,
                isOwnIdentity,
                isPartner,
                userId,
            })
        }
    })
    return workers
})

const timeKeeping = {
    invitation: {
        // Blockchain transaction
        // (worker) accept invitation to a project
        accept: (projectHash, workerAddress, accepted) => {
            return post({
                sender: validateAddress(workerAddress),
                call: calls.timekeeping.workerAcceptanceProject(hashBytes(projectHash), accepted),
                compact: false,
                longevity: true
            })
        },
        // Blockchain transaction
        // (project owner) invite a worker to join a project
        add: (projectHash, ownerAddress, workerAddress) => {
            return post({
                sender: validateAddress(ownerAddress),
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
                sender: validateAddress(workerAddress),
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
        //
        // Params:
        // workerAddress, projectHash, recordHash, 
        // @status  integer: default 0
        // @lockedreason
        approve: (workerAddress, projectHash, recordHash, status = 0, locked = false, reason = {}) => {
            return post({
                sender: validateAddress(workerAddress),
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
        validateAddress(address)
    ),
}
export default timeKeeping