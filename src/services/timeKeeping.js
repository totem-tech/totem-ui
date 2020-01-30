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
import { hashToBytes, hashToStr, validateAddress, ss58Decode, ss58Encode } from '../utils/convert'
import { isArr, mapJoin, arrUnique } from '../utils/utils'
import { BLOCK_DURATION_SECONDS, secondsToDuration } from '../utils/time'
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

// to sumbit a new time record must submit with this hash
export const NEW_RECORD_HASH = '0x40518ed7e875ba87d6c7358c06b1cac9d339144f8367a0632af7273423dd124e'
// record status codes
export const statuses = {
    draft: 0,
    submit: 1,
    dispute: 100,
    reject: 200,
    accept: 300,
    invoice: 400,
    delete: 999,
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
        _config.hashesBond = worker.listWorkerProjects(address)
        // listen for changes to user invitations and update projects list
        _config.tieId = _config.hashesBond.tie(hashes => {
            hashes = hashes.map(h => hashToStr(h))
            const changed = !!Array.from(invitedProjects).find(([hash]) => !hashes.includes(hash))
                || !!hashes.find(hash => !invitedProjects.get(hash))

            !_config.firstAttempt && !_config.updateInProgress && changed && getProjects(true)
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
            hashes = hashes.flat().map(h => hashToStr(h))
                // exclude user owned projects
                .filter(hash => !userProjects.get(hash))

            //retrieve invited project details excluding own projects
            return fetchProjects(hashes).then(invitedProjects => {
                _config.updateInProgress = false
                _config.firstAttempt = false
                cacheStorage.setAll(invitedProjects)
                return mapJoin(userProjects, invitedProjects)
            })
        })
    })
    return _config.updatePromise
}

// Triggered whenever time keeping project list is updated
export const getProjectsBond = new Bond().defaultTo(uuid.v1())
setTimeout(() => getUserProjectsBond.tie(() => getProjectsBond.changed(uuid.v1())))

// getRecords retrieves records either by project or by selected worker
//
// Params:
// @projectHash     string/Bond/Uint8Array
// @ownerAddress    string/Bond/AccountID
// @archived        bool: whether to retrieve non-/archived records
//
// returns promise, resolves to a Map of records.
export const getTimeRecordsDetails = hashAr => {
    const result = new Map()
    if (!isArr(hashAr) || hashAr.length === 0) return result
    // retrieve all record details
    return Promise.all([
        Bond.promise(hashAr.map(record.get)),
        getProjects(),
    ]).then(([records, projects]) => {
        records.map((r, i) => !r ? null : ({
            ...r,
            // add extra information including duration in hh:mm:ss format
            duration: secondsToDuration(r.total_blocks * BLOCK_DURATION_SECONDS),
            hash: hashToStr(hashAr[i]),
            projectHash: hashToStr(r.project_hash),
            workerAddress: r.worker && ss58Encode(r.worker) || '',
        })).filter(Boolean)
            // populate the result Map
            .forEach(r => {
                const { name, ownerAddress } = projects.get(r.projectHash) || {}
                result.set(r.hash, {
                    ...r,
                    projectOwnerAddress: ownerAddress,
                    projectName: name,
                    workerName: partners.getAddressName(r.workerAddress),
                })
            })
        return result
        /*
        example Record from blockchain: {
            locked_status: false
            posting_period: 0
            project_hash: [...]
            reason_code: {ReasonCodeKey: 0, ReasonCodeTypeKey: 0}
            start_block: 1851599056011264
            submit_status: 0
            total_blocks: 3600
            worker: [...]
        }
        */
    })
}
window.getTimeRecordsDetails = getTimeRecordsDetails

// getTimeRecordsBond retrieves list of time record hashes
//
// Params:
// @archive     bool: whether to retrieve archived records
// @manage      bool: whether to retrieve own records only or all records from owned projects
// @projectHash string: (optional) if @manage === true, will only retrieve hashes from supplied @projectHash
//
// returns      promise: resolves to a single dimentional array of time record hashes (string)
export const getTimeRecordsBond = (archive = false, manage = false, projectHash = null) => getProjects().then(projects => {
    let func, args2d
    if (!manage) {
        // own records only, from all accepted projects of selected identity
        func = archive ? record.listArchive : record.list
        args2d = [[getSelected().address]]
    } else {
        // all records by all workers from projects owned by selected identity
        func = archive ? record.listByProjectArchive : record.listByProject
        args2d = projectHash ? [[projectHash]] : Array.from(projects)
            .map(([projectHash, { isOwner }]) => isOwner && [projectHash])
            .filter(Boolean)
    }
    return Bond.promise(args2d.map(args => func.apply(null, args)))
        // flatten array, convert to strings and remove duplicates
        .then(ar2d => arrUnique(ar2d.flat().map(hashToStr)))
})
window.getTimeRecordsBond = getTimeRecordsBond

export const getProjectWorkers = projectHash => Bond.promise([
    worker.listWorkers(projectHash),
    // ToDo: add invited workers bond here
    worker.listInvited(projectHash),
    project.getOwner(projectHash),
]).then(([acceptedAddresses, invitedAddresses, ownerAddress]) => {
    const allAddresses = ([...acceptedAddresses, ...invitedAddresses]).map(w => ss58Encode(w))
    ownerAddress = ss58Encode(ownerAddress)
    const { address: selectedAddress } = getSelected()
    const isOwner = ownerAddress === selectedAddress
    const workers = new Map()

    allAddresses.forEach((address, i) => {
        if (isOwner || selectedAddress === address) {
            let { name, userId } = partners.get(address) || identities.get(address) || {}
            if (!userId && identities.get(address)) {
                // address is own identitty
                userId = (getUser() || {}).id
            }
            !workers.get(address) && workers.set(address, {
                accepted: i < acceptedAddresses.length,
                address,
                name,
                invited: true,
                userId,
            })
        }
    })
    return { isOwner, ownerAddress, workers }
})

export const record = {
    // Blockchain transaction
    // (project owner) approve/reject a time record
    //
    // Params:
    // @workerAddress   string/bond
    // @projectHash     string/bond/Uint8Array
    // @recordHash      string/bond/Uint8Array
    // @status          integer: default 0
    // @reason          object: {ReasonCode: integer, ReasonCodeType: integer}
    approve: (ownerAddress, workerAddress, projectHash, recordHash, accepted, reason) => post({
        sender: validateAddress(ownerAddress),
        call: calls.timekeeping.authoriseTime(
            ss58Decode(workerAddress),
            hashToBytes(projectHash),
            hashToBytes(recordHash),
            accepted ? statuses.accept : statuses.reject,
            reason || {
                ReasonCodeKey: 0,
                ReasonCodeTypeKey: 0
            },
        ),
        compact: false,
        longevity: true
    }),
    // get details of a record
    get: recordHash => runtime.timekeeping.timeRecord(hashToBytes(recordHash)),
    isOwner: (hash, address) => runtime.timeKeeping.timeHashOwner(hashToBytes(hash), ss58Decode(address)),
    // list of all record hashes by worker
    list: workerAddress => runtime.timekeeping.workerTimeRecordsHashList(ss58Decode(workerAddress)),
    // list of all archived record hashes by worker
    listArchive: workerAddress => runtime.timekeeping.workerTimeRecordsHashListArchive(ss58Decode(workerAddress)),
    // list of all record hashes in a project 
    listByProject: projectHash => runtime.timekeeping.projectTimeRecordsHashList(hashToBytes(projectHash)),
    // list of all archived record hashes in a project 
    listByProjectArchive: projectHash => runtime.timekeeping.projectTimeRecordsHashListArchive(hashToBytes(projectHash)),
    // Blockchain transaction
    // Add or update a time record. To add a new record, must use `NEW_RECORD_HASH`.
    // 
    // @postingPeriod u16: 15 fiscal periods (0-14) // not yet implemented use default 0
    // add/update record
    save: (workerAddress, projectHash, recordHash, status, reason, blockCount, postingPeriod, blockStart, blockEnd, breakCount) => post({
        sender: validateAddress(workerAddress),
        call: calls.timekeeping.submitTime(
            hashToBytes(projectHash),
            hashToBytes(recordHash || NEW_RECORD_HASH),
            status || 0,
            reason || {
                ReasonCodeKey: 0,
                ReasonCodeTypeKey: 0
            },
            blockCount || 0,
            postingPeriod || 0,
            blockStart || 0,
            blockEnd || 0,
            breakCount || 0,
        ),
        compact: false,
        longevity: true
    }),
}

export const worker = {
    // Blockchain transaction
    // (worker) accept invitation to a project
    accept: (projectHash, workerAddress, accepted) => post({
        sender: validateAddress(workerAddress),
        call: calls.timekeeping.workerAcceptanceProject(hashToBytes(projectHash), accepted),
        compact: false,
        longevity: true
    }),
    // status of invitation
    accepted: (projectHash, workerAddress) => runtime.timekeeping.workerProjectsBacklogStatus([
        hashToBytes(projectHash),
        ss58Decode(workerAddress)
    ]),
    // Blockchain transaction
    // (project owner) invite a worker to join a project
    add: (projectHash, ownerAddress, workerAddress) => post({
        sender: validateAddress(ownerAddress),
        call: calls.timekeeping.notifyProjectWorker(
            ss58Decode(workerAddress),
            hashToBytes(projectHash),
        ),
        compact: false,
        longevity: true
    }),
    // check if worker is banned. undefined: not banned, object: banned
    banned: (projectHash, address) => runtime.timekeeping.projectWorkersBanList([
        hashToBytes(projectHash),
        ss58Decode(address)
    ]),
    // ban project worker
    banWorker: (projectHash, ownerAddress, recordHash) => post({
        sender: validateAddress(ownerAddress),
        call: calls.timekeeping.banWorker(
            hashToBytes(projectHash),
            hashToBytes(recordHash)
        ),
        compact: false,
        longevity: true
    }),
    // workers that have been invited to but hasn't responded yet
    listInvited: projectHash => runtime.timekeeping.projectInvitesList(hashToBytes(projectHash)),
    // workers that has accepted invitation
    listWorkers: projectHash => runtime.timekeeping.projectWorkersList(hashToBytes(projectHash)),
    // projects that worker has been invited to or accepted
    listWorkerProjects: workerAddress => runtime.timekeeping.workerProjectsBacklogList(ss58Decode(workerAddress)),
    // workers total booked time in blocks accross all projects
    totalBlocks: address => runtime.timekeeping.totalBlocksPerAddress(ss58Decode(address)),
    // workers total booked time in blocks on a specific project
    totalBlocksByProject: (address, projectHash) => runtime.timekeeping.totalBlocksPerProjectPerAddress([
        ss58Decode(address),
        hashToBytes(projectHash)
    ]),
    // unban project worker
    unbanWorker: (projectHash, ownerAddress, workerAddress) => post({
        sender: validateAddress(ownerAddress),
        call: calls.timekeeping.banWorker(
            hashToBytes(projectHash),
            ss58Decode(workerAddress),
        ),
        compact: false,
        longevity: true
    }),
}
const timeKeeping = {
    getProjects,
    getProjectWorkers,
    getTimeRecordsBond,
    getTimeRecordsDetails,
    project: {
        // timestamp of the very first recorded time on a project
        firstSeen: projectHash => runtime.timekeeping.projectFirstSeen(hashToBytes(projectHash)),
        // get total blocks booked in a project
        totalBlocks: projectHash => runtime.timekeeping.totalBlocksPerProject(hashToBytes(projectHash)),
    },
    record,
    worker,
}
window.timeKeeping = timeKeeping
export default timeKeeping