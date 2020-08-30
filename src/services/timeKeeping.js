import { Bond } from 'oo7'
import uuid from 'uuid'
import { Subject } from 'rxjs'
import { isObj, mapJoin, isFn, isDefined } from '../utils/utils'
// services
import { getSelected } from './identity'
import {
    fetchProjects,
    getProjects as getUserProjects,
} from './project'
import storage from './storage'
import { query as queryBlockchain } from './blockchain'
import PromisE from '../utils/PromisE'

// to sumbit a new time record must submit with this hash
export const NEW_RECORD_HASH = '0x40518ed7e875ba87d6c7358c06b1cac9d339144f8367a0632af7273423dd124e'
export const MODULE_KEY = 'time-keeping'
const queryPrefix = 'api.query.timekeeping.'
const txPrefix = 'api.tx.timekeeping.'
// transaction queue item type
const TX_STORAGE = 'tx_storage'
const rxProjects = new Subject()
// read/write to module settings storage
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// read or write to cache storage
const cacheRW = (key, value) => storage.cache(MODULE_KEY, key, value)
const cacheKeyProjects = address => `projects-${address}`
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

// @forceUpdate updates only specified @recordIds in the projects list.
//
// Params:
// @recordids   array: array of project IDs
export const forceUpdate = async (recordIds, ownerAddress) => {
    const updateProjects = await fetchProjects(recordIds, ownerAddress)
    const projects = await getProjects()
    Array.from(updateProjects)
        .forEach(([recordId, project]) =>
            projects.set(recordId, project)
        )
}

// getProjects retrieves projects along with relevant details owned by selected identity.
// Retrieved data is cached in localStorage and only updated when list of projects changes in the blockchain
// or manually triggered by invoking `getProjects(true)`.
//
// Params:
// @forceUpdate     Boolean: (optional) whether to attempt to update cached data immediately instead of re-using cache.
//                      Default: false
// @callback        function: (optional) indicates whether to subscribe to changes on the list of projects.
//                      If  a valid functin supplied, it will be invoked with the value whenever projects list changes.
// 
// Returns          Map: list of projects
export const getProjects = async (forceUpdate, callback, timeout = 10000) => {
    const config = getProjects
    // auto update whenever user projects change
    config.unsubscribeUP = config.unsubscribeUP || await getUserProjects(false, () => getProjects())

    if (isFn(callback)) {
        const interceptor = async (result) => {
            console.log({ result })
            // include user owned projects
            result = mapJoin(await getUserProjects(), result)
            callback(result)
        }
        const subscribed = rxProjects.subscribe(interceptor)
        // makes sure query.worker.listWorkerProjects is subscribed
        getProjects(forceUpdate).then(callback)
        return () => subscribed.unsubscribe()
    }
    // similar process as service.project.getProjects
    let result
    const {
        address: addressPrev,
        unsubscribe,
        updatePromise,
    } = config
    const { address } = getSelected() || {}
    if (!address) return
    const cacheKey = cacheKeyProjects(address)

    if (!navigator.onLine) return new Map(cacheRW(cacheKey) || [])
    if (address !== addressPrev || !updatePromise || updatePromise.rejected) {
        // selected identity changed
        config.address = address
        isFn(unsubscribe) && unsubscribe()
        config.updatePromise = new PromisE((resolve, reject) => (async () => {
            try {
                await getConnection()
            } catch (err) {
                // reset update promise
                config.updatePromise = null
                // use cache if not connected
                return resolve(new Map(cacheRW(cacheKey) || []))
            }
            config.unsubscribe = await query.worker.listWorkerProjects(address, async (recordIds) => {
                try {
                    const projects = await fetchProjects(recordIds, address)
                    saveProjects(projects, address)
                    resolve(projects)
                } catch (err) {
                    reject(err)
                }
            })
        })())
    } else if (forceUpdate) {
        // once-off update
        config.updatePromise = fetchProjects(query.worker.listWorkerProjects(address), address)
        // update rxProjects
        config.updatePromise.then(projects => saveProjects(projects, address))
    }

    const promise = PromisE.timeout(getUserProjects(), config.updatePromise, timeout)
    try {
        const [ownedProject, invitedProjects] = await promise
        result = mapJoin(ownedProject, invitedProjects)
    } catch (err) {
        // if timed out, return cached. Otherwise, throw error
        if (!promise.timeout.rejected) throw err
    }
    return result || new Map(cacheRW(cacheKey) || [])
}

// save projects to local storage and trigger change on `rxProjects`
//
// Params:
// @projects        Map/2D Array
// @ownerAddress    string: identity that owns the projects
const saveProjects = (projects, ownerAddress) => {
    if (!projects || !ownerAddress) return
    const cacheKey = cacheKeyProjects(ownerAddress)
    cacheRW(cacheKey, projects)
    // update rxProjects
    rxProjects.next(projects)
}

export const query = {
    /*
     * Timekeeping project related queries
     */
    project: {
        // timestamp of the very first recorded time on a project
        firstSeen: (recordId, callback, multi) => queryBlockchain(
            queryPrefix + 'projectFirstSeen',
            [recordId, callback].filter(isDefined),
            multi,
        ),
        // get total blocks booked in a project
        totalBlocks: (recordId, callback, multi) => queryBlockchain(
            queryPrefix + 'totalBlocksPerProject',
            [recordId, callback].filter(isDefined),
            multi,
        )
    },
    /* 
     * Timekeeping record related queries
     */
    record: {
        // get details of a record
        get: (recordId, callback, multi) => queryBlockchain(
            queryPrefix + 'timeRecord',
            [recordId, callback].filter(isDefined),
            multi,
        ),
        // check if worker is owner of the record | unused
        isOwner: (recordId, workerAddress, callback, multi) => queryBlockchain(
            queryPrefix + 'workerTimeRecordsHashList',
            [recordId, workerAddress, callback].filter(isDefined),
            multi,
        ),
        // list of all recordIds by worker
        list: (workerAddress, callback, multi) => queryBlockchain(
            queryPrefix + 'workerTimeRecordsHashList',
            [workerAddress, callback].filter(isDefined),
            multi,
        ),
        // list of all archived recordIds by worker
        listArchive: (workerAddress, callback, multi) => queryBlockchain(
            queryPrefix + 'workerTimeRecordsHashListArchive',
            [workerAddress, callback].filter(isDefined),
            multi,
        ),
        // list of all record hashes in a project 
        listByProject: (projectId, callback, multi) => queryBlockchain(
            queryPrefix + 'projectTimeRecordsHashList',
            [projectId, callback].filter(isDefined),
            multi,
        ),
        // list of all archived record hashes in a project 
        listByProjectArchive: (projectId, callback, multi) => queryBlockchain(
            queryPrefix + 'projectTimeRecordsHashListArchive',
            [projectId, callback].filter(isDefined),
            multi,
        ),
    },
    /*
     * Timekeeping worker related queries
     */
    worker: {
        // status of invitation | DOES NOT WORK | deprecated
        accepted: (projectId, workerAddress, callback, multi) => queryBlockchain(
            queryPrefix + 'workerProjectsBacklogStatus',
            [projectId, workerAddress, callback].filter(isDefined),
            multi,
        ),
        // check if worker is banned. undefined: not banned, object: banned
        banned: (projectId, callback, multi) => queryBlockchain(
            queryPrefix + 'projectWorkersBanList',
            [projectId, callback].filter(isDefined),
            multi,
        ),
        // workers that have been invited to but hasn't responded yet
        listInvited: (projectId, callback, multi) => queryBlockchain(
            queryPrefix + 'projectInvitesList',
            [projectId, callback].filter(isDefined),
            multi,
        ),
        // workers that has accepted invitation
        listWorkers: (projectId, callback, multi) => queryBlockchain(
            queryPrefix + 'projectWorkersList',
            [projectId, callback].filter(isDefined),
            multi,
        ),
        // projects that worker has been invited to or accepted
        //
        // Params:
        // @workerAddress   string/array: array for multi query
        // @callback        function: (optional) to subscribe to blockchain storage state changes
        // @multi           boolean: (optional) indicates multiple storage states are being queried in a single request
        //  
        // returns          promise
        listWorkerProjects: (workerAddress, callback, multi) => queryBlockchain(
            queryPrefix + 'workerProjectsBacklogList',
            [workerAddress, callback].filter(isDefined),
            multi,
        ),
        // worker's total booked time (in blocks) accross all projects (unused!)
        //
        // Params:
        // @workerAddress   string/array: array for multi query
        // @callback        function: (optional) to subscribe to blockchain storage state changes
        // @multi           boolean: (optional) indicates multiple storage states are being queried in a single request
        //  
        // Returns          promise
        totalBlocks: (workerAddress, callback, multi) => queryBlockchain(
            queryPrefix + 'totalBlocksPerAddress',
            [workerAddress, callback].filter(isDefined),
            multi,
        ),
        // worker's total booked time (in blocks) for a specific project
        //
        // Params:
        // @workerAddress   string/array: array for multi query
        // @recordId        string/array: array for multi query
        // @callback        function: (optional) to subscribe to blockchain storage state changes
        // @multi           boolean: (optional) indicates multiple storage states are being queried in a single request
        //  
        // returns          promise
        totalBlocksByProject: (workerAddress, recordId, callback, multi = false) => queryBlockchain(
            queryPrefix + 'totalBlocksPerProjectPerAddress',
            [workerAddress, recordId, callback].filter(isDefined),
            multi,
        ),
    },
}


// Save timekeeping record related data to blockchain storage.
// Each function returns an object that can be used to create a queued transaction.
// Make sure to supply appropriate `title` and `descrption` properties to `@queueProps`.
//
// Example usage:
// services.queue.addToQueue(queueables.record.approve(..., {title, description}))
export const queueables = {
    /*
     * Timekeeping record related queueables
     */
    record: {
        // (project owner) approve/reject a time record
        //
        // Params:
        // @workerAddress   string
        // @projectId       string
        // @recordHash      string
        // @status          integer: default 0
        // @reason          object: {ReasonCode: integer, ReasonCodeType: integer}
        // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
        approve: (ownerAddress, workerAddress, projectId, recordId, accepted, reason, queueProps = {}) => ({
            ...queueProps,
            address: ownerAddress,
            func: txPrefix + 'authoriseTime',
            type: TX_STORAGE,
            args: [
                workerAddress,
                projectId,
                recordId,
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
        // @projectId       string
        // @recordId        string: leave empty to create a new record, otherwise, use existing record's hash
        // @status          int: record status code
        // @reason          object: valid properties => ReasonCodeKey, ReasonCodeTypeKey
        // @postingPeriod   u16: 15 fiscal periods (0-14) // not yet implemented use default 0
        // @blockStart      int: block number when timekeeeping started
        // @blockEnd        int: block number when timekeeping ended
        // @blockCount      int: total number of blocks worker has been active
        // @breakCount      int: number of breaks taken during record period
        // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
        save: (address, projectId, recordId, status, reason, blockCount, postingPeriod, blockStart, blockEnd, breakCount, queueProps) => ({
            ...queueProps,
            address: address,
            func: txPrefix + 'submitTime',
            type: TX_STORAGE,
            args: [
                projectId,
                recordId || NEW_RECORD_HASH,
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
    },
    /*
     * Worker related queueables
     */
    worker: {
        // (worker) accept invitation to a project
        //
        // Params:
        // @projectId       string
        // @workerAddress   string
        // @accepted        boolean: indicates acceptence or rejection
        // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
        accept: (projectId, workerAddress, accepted, queueProps = {}) => ({
            ...queueProps,
            address: workerAddress,
            func: txPrefix + 'workerAcceptanceProject',
            type: TX_STORAGE,
            args: [projectId, accepted],
        }),
        // (project owner) invite a worker to join a project
        //
        // Params: 
        // @projectId       string
        // @ownerAddress    string
        // @workerAddress   string
        // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
        add: (projectId, ownerAddress, workerAddress, queueProps = {}) => ({
            ...queueProps,
            address: ownerAddress,
            func: txPrefix + 'notifyProjectWorker',
            type: TX_STORAGE,
            args: [workerAddress, projectId],
        }),
        // ban project worker
        //
        // Params:
        // @projectId       string
        // @ownerAddress    string
        // @recordId        string
        // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
        banWorker: (projectId, ownerAddress, recordId, queueProps = {}) => ({
            ...queueProps,
            address: ownerAddress,
            func: txPrefix + 'banWorker',
            type: TX_STORAGE,
            args: [projectId, recordId],
        }),
        // unban project worker
        //
        // Params:
        // @projectId       string
        // @ownerAddress    string
        // @ownerAddress    string
        // @recordHash      string
        // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
        unbanWorker: (projectId, ownerAddress, workerAddress, queueProps = {}) => ({
            ...queueProps,
            address: ownerAddress,
            func: txPrefix + 'banWorker',
            type: TX_STORAGE,
            args: [projectId, workerAddress],
        }),
    },
}

export default {
    formData,
    formDataBond,
    getProjects,
    query,
    queueables,
}