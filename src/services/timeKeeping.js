import { Bond } from 'oo7'
import { runtime } from 'oo7-substrate'
import uuid from 'uuid'
import { addressToStr, hashToBytes, hashToStr, ss58Decode, ss58Encode } from '../utils/convert'
import { arrUnique, isArr, isObj, mapJoin } from '../utils/utils'
import { BLOCK_DURATION_SECONDS, secondsToDuration } from '../utils/time'
// services
import { getUser } from './chatClient'
import identities, { getSelected } from './identity'
import partners from './partner'
import project, {
    fetchProjects,
    getProjects as getUserProjects,
    getProjectsBond as getUserProjectsBond
} from './project'
import storage from './storage'

// to sumbit a new time record must submit with this hash
export const NEW_RECORD_HASH = '0x40518ed7e875ba87d6c7358c06b1cac9d339144f8367a0632af7273423dd124e'
export const MODULE_KEY = 'time-keeping'
const TX_STORAGE = 'tx_storage'
// read/write to module settings storage
const rw = value => storage.settings.module(MODULE_KEY, value)
// read or write to cache storage
const cacheRW = (key, value) => storage.cache(MODULE_KEY, key, value)
const _config = {
    address: undefined,
    firstAttempt: true,
    hashesBond: undefined,
    tieId: undefined,
    updateInProgress: false,
    updatePromise: undefined,
}
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
// timeKeeping form values and states for use with the TimeKeeping form
export const formData = formData => {
    if (isObj(formData)) rw({ formData }) | formDataBond.changed(uuid.v1())
    return rw().formData || {}
}
export const formDataBond = new Bond().defaultTo(uuid.v1())

// getProjects returns all the projects user owns along with the projects they have been invited to (accepted or not).
// Retrieved data is cached in localStorage and only updated there is changes to invitation or manually triggered by setting `@_forceUpdate` to `true`.
//
// Params:
// @forceUpdate bool: if true and user is online, forces to update the cache.
export const getProjects = (_forceUpdate = false) => {
    _forceUpdate = _forceUpdate || _config.firstAttempt
    const { address } = getSelected()
    const key = 'projects-' + address
    const cachedAr = cacheRW(key) || []
    const invitedProjects = new Map(cachedAr)

    if (_config.address !== address) {
        _config.firstAttempt = true
        _config.address = address
        if (_config.hashesBond) _config.hashesBond.untie(_config.tieId)
        _config.hashesBond = worker.listWorkerProjects(address)
        // listen for changes to user invitations and update projects list
        _config.tieId = _config.hashesBond.tie(hashes => {
            hashes = hashes.map(h => hashToStr(h))
            const changed = !!hashes.find(hash => !invitedProjects.get(hash))
                || !!cachedAr[address].find(([hash]) => !hashes.includes(hash))
            if (_config.firstAttempt || _config.updateInProgress) return
            if (changed) return getProjects(true)
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

                cacheRW(key, invitedProjects)
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
    // flatten array, convert to strings and remove duplicates
    hashAr = arrUnique(hashAr.flat().map(hashToStr))
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

// getTimeRecordsBonds get a list of bonds to retrieve time record hashes for gived properties
//
// Params:
// @archive     bool: whether to retrieve archived records
// @manage      bool: whether to retrieve own records only or all records from owned projects
// @projectHash string: (optional) if @manage === true, will only retrieve hashes from supplied @projectHash
//
// returns      promise: resolves to a single dimentional array of bonds which all resolves to time record hashes (bytes)
export const getTimeRecordsBonds = (archive, manage, projectHash) => getProjects().then(projects => {
    let func
    if (!manage) {
        // own records only, from all accepted projects of selected identity
        func = archive ? record.listArchive : record.list
        return [func.call(null, getSelected().address)]
    }

    // all records by all workers from projects owned by selected identity
    func = archive ? record.listByProjectArchive : record.listByProject
    if (!!projectHash) return [func.call(null, projectHash)]
    return Array.from(projects)
        // filter projects
        .map(([projectHash, { isOwner }]) => isOwner && projectHash).filter(Boolean)
        .map(h => func.call(null, h))
})

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

// retrieve data from blockchain storage
export const record = {
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
}

// Save timekeeping record related data to blockchain storage.
// Each function returns a task (an object) that can be used to create a queued transaction.
// Make sure to supply appropriate `title` and `descrption` properties to `@queueProps`
// and use the `addToQueue(task)` function from queue service to add the task to the queue
export const recordTasks = {
    // (project owner) approve/reject a time record
    //
    // Params:
    // @workerAddress   string/bond
    // @projectHash     string/bond/Uint8Array
    // @recordHash      string/bond/Uint8Array
    // @status          integer: default 0
    // @reason          object: {ReasonCode: integer, ReasonCodeType: integer}
    // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
    approve: (ownerAddress, workerAddress, projectHash, recordHash, accepted, reason, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.timekeeping.authoriseTime',
        type: TX_STORAGE,
        args: [
            workerAddress,
            hashToStr(projectHash),
            hashToStr(recordHash),
            accepted ? statuses.accept : statuses.reject,
            reason || {
                ReasonCodeKey: 0,
                ReasonCodeTypeKey: 0
            },
        ],
    }),
    // Add or update a time record. To add a new record, must use `NEW_RECORD_HASH`.
    // 
    // Params:
    // @address         string: worker's address (create or update) or owner address (only set as draft)
    // @projectHash     string
    // @recordHash      string: leave empty to create a new record, otherwise, use existing record's hash
    // @status          int: record status code
    // @reason          object: valid properties => ReasonCodeKey, ReasonCodeTypeKey
    // @postingPeriod   u16: 15 fiscal periods (0-14) // not yet implemented use default 0
    // @blockStart      int: block number when timekeeeping started
    // @blockEnd        int: block number when timekeeping ended
    // @blockCount      int: total number of blocks worker has been active
    // @breakCount      int: number of breaks taken during record period
    // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
    save: (address, projectHash, recordHash, status, reason, blockCount, postingPeriod, blockStart, blockEnd, breakCount, queueProps) => ({
        ...queueProps,
        address: address,
        func: 'api.tx.timekeeping.submitTime',
        type: TX_STORAGE,
        args: [
            hashToStr(projectHash),
            hashToStr(recordHash || NEW_RECORD_HASH),
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
        ],
    }),
}

// retrieve data from blockchain storage
export const worker = {
    // status of invitation
    accepted: (projectHash, workerAddress) => runtime.timekeeping.workerProjectsBacklogStatus([
        hashToBytes(projectHash),
        ss58Decode(workerAddress)
    ]),
    acceptedList: arr => Bond.all(arr.map(({ projectHash: p, workerAddress: w }) => worker.accepted(p, w))),
    // check if worker is banned. undefined: not banned, object: banned
    banned: (projectHash, address) => runtime.timekeeping.projectWorkersBanList([
        hashToBytes(projectHash),
        ss58Decode(address)
    ]),
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
}

// Save timekeeping worker related data to blockchain storage.
// Each function returns a task (an object) that can be used to create a queued transaction.
// Make sure to supply appropriate `title` and `descrption` properties to `@queueProps`
// and use the `addToQueue(task)` function from queue service to add the task to the queue
export const workerTasks = {
    // (worker) accept invitation to a project
    //
    // Params:
    // @projectHash     string
    // @workerAddress   string
    // @accepted        boolean: indicates acceptence or rejection
    // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
    accept: (projectHash, workerAddress, accepted, queueProps = {}) => ({
        ...queueProps,
        address: workerAddress,
        func: 'api.tx.timekeeping.workerAcceptanceProject',
        type: TX_STORAGE,
        args: [
            hashToStr(projectHash),
            accepted,
        ],
    }),
    // (project owner) invite a worker to join a project
    //
    // Params: 
    // @projecthash     string
    // @ownerAddress    string
    // @workerAddress   string
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    add: (projectHash, ownerAddress, workerAddress, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.timekeeping.notifyProjectWorker',
        type: TX_STORAGE,
        args: [
            addressToStr(workerAddress),
            hashToStr(projectHash),
        ],
    }),
    // ban project worker
    //
    // Params:
    // @projectHash     string
    // @ownerAddress    string
    // @recordHash      string
    // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
    banWorker: (projectHash, ownerAddress, recordHash, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.timekeeping.banWorker',
        type: TX_STORAGE,
        args: [
            hashToStr(projectHash),
            hashToStr(recordHash)
        ],
    }),
    // unban project worker
    //
    // Params:
    // @projectHash     string
    // @ownerAddress    string
    // @ownerAddress    string
    // @recordHash      string
    // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
    unbanWorker: (projectHash, ownerAddress, workerAddress, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.timekeeping.banWorker',
        type: TX_STORAGE,
        args: [
            hashToStr(projectHash),
            addressToStr(workerAddress),
        ],
    }),
}
export default {
    formData,
    formDataBond,
    getProjects,
    getProjectWorkers,
    getTimeRecordsBonds,
    getTimeRecordsDetails,
    project: {
        // timestamp of the very first recorded time on a project
        firstSeen: projectHash => runtime.timekeeping.projectFirstSeen(hashToBytes(projectHash)),
        // get total blocks booked in a project
        totalBlocks: projectHash => runtime.timekeeping.totalBlocksPerProject(hashToBytes(projectHash)),
    },
    record,
    recordTasks,
    worker,
    workerTasks,
}