
import { BehaviorSubject } from 'rxjs'
import storage from '../../utils/storageHelper'
import { isArr, isDefined } from '../../utils/utils'
import { query as queryBlockchain } from '../../services/blockchain'
import {
    BLOCK_DURATION_REGEX,
    BLOCK_DURATION_SECONDS,
    durationToSeconds,
    secondsToDuration
} from '../../utils/time'

// to sumbit a new time record must submit with this hash | DO NOT CHANGE
export const NEW_RECORD_HASH = '0x40518ed7e875ba87d6c7358c06b1cac9d339144f8367a0632af7273423dd124e'
export const MODULE_KEY = 'timekeeping'
// transaction queue item type
const TX_STORAGE = 'tx_storage'
// read/write to module settings storage
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// read or write to cache storage
const rwCache = (key, value) => storage.cache(MODULE_KEY, key, value)
// const cacheKeyProjects = address => `projects-${address}`
export const durationPreferences = {
    blocks: 'blocks',
    hhmmss: 'hhmmss',
    hhmm05: 'hhmm05',
    hhmm10: 'hhmm10',
    hhmm15: 'hhmm15',
    hhmm30: 'hhmm30',
}
export const DURATION_ZERO = '00:00:00'
export const durationToBlockCount = duration => !BLOCK_DURATION_REGEX.test(duration)
    ? 0
    : parseInt(durationToSeconds(duration) / BLOCK_DURATION_SECONDS)
export const rxDurtionPreference = new BehaviorSubject(
    rw().timeConversion || durationPreferences.hhmmss
)
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

/**
 * @name    blocksToDuration
 * @summary convert number of blocks rounded to specified/user-selected preference
 * 
 * @param   {Number} numBlocks 
 * @param   {String} preference             (optional) duration format. See `durationPreferences`.
 *                                          Default: `rxDurtionPreference.value`
 * @param   {Number} blockDurationSeconds   (optional) number of seconds per block.
 *                                          Default: `BLOCK_DURATION_SECONDS`
 * 
 * @returns {String|Number}
 */
export const blocksToDuration = (
    numBlocks,
    preference,
    blockDurationSeconds = BLOCK_DURATION_SECONDS
) => {
    preference = !!Object
        .values(durationPreferences)
        .includes(preference)
        ? preference
        : rxDurtionPreference.value
    if (preference === durationPreferences.blocks) return numBlocks

    let numMinutes = numBlocks * blockDurationSeconds / 60
    let roundToMins = parseInt(
        preference.split('hhmm')[1]
    )

    numMinutes = !roundToMins
        ? numMinutes
        : Math.round(numMinutes / roundToMins) * roundToMins
    return secondsToDuration(numMinutes * 60)
}
export const query = {
    /*
     * Timekeeping project related queries
     */
    activity: {
        // timestamp of the very first recorded time on a project
        firstSeen: (recordId, callback, multi) => queryBlockchain(
            query.activity.firstSeen_func,
            [recordId, callback].filter(isDefined),
            multi,
        ),
        firstSeen_func: 'api.query.timekeeping.projectFirstSeen',
        // get total blocks booked in a project
        totalBlocks: (recordId, callback, multi) => queryBlockchain(
            query.activity.totalBlocks_func,
            [recordId, callback].filter(isDefined),
            multi,
        ),
        totalBlocks_func: 'api.query.timekeeping.totalBlocksPerProject'
    },
    /* 
     * Timekeeping record related queries
     */
    record: {
        // get details of timekeeping record(s)
        get: (recordId, callback) => queryBlockchain(
            query.record.get_func,
            [recordId, callback].filter(isDefined),
            isArr(recordId),
        ),
        get_func: 'api.query.timekeeping.timeRecord',
        /**
         * @name    isOwner
         * @summary fetch the owner identity of a time record
         * 
         * @param   {String|String[]} recordId 
         * @param   {Function}        callback 
         * 
         * @returns {String|String[]}
         */
        isOwner: (recordId, callback) => queryBlockchain(
            query.record.isOwner_func,
            [recordId, callback].filter(isDefined),
            isArr(recordId),
        ),
        isOwner_func: 'api.query.timekeeping.timeHashOwner',
        // list of all recordIds by worker
        list: (workerAddress, callback) => queryBlockchain(
            query.record.list_func,
            [workerAddress, callback].filter(isDefined),
            isArr(workerAddress),
        ),
        list_func: 'api.query.timekeeping.workerTimeRecordsHashList',
        // list of all archived recordIds by worker
        listArchive: (workerAddress, callback) => queryBlockchain(
            query.record.listArchive_func,
            [workerAddress, callback].filter(isDefined),
            isArr(workerAddress),
        ),
        listArchive_func: 'api.query.timekeeping.workerTimeRecordsHashListArchive',
        // list of all record hashes in a project 
        listByActivity: (activityId, callback) => queryBlockchain(
            query.record.listByActivity_func,
            [activityId, callback].filter(isDefined),
            isArr(activityId),
        ),
        listByActivity_func: 'api.query.timekeeping.projectTimeRecordsHashList',
        // list of all archived record hashes in a project 
        listByActivityArchive: (activityId, callback, multi) => queryBlockchain(
            query.record.listByActivityArchive_func,
            [activityId, callback].filter(isDefined),
            multi,
        ),
        listByActivityArchive_func: 'api.query.timekeeping.projectTimeRecordsHashListArchive',
    },
    /*
     * Timekeeping worker related queries
     */
    worker: {
        // status of invitation | DOES NOT WORK | deprecated
        accepted: (activityId, workerAddress, callback, multi) => queryBlockchain(
            query.worker.accepted_func,
            [activityId, workerAddress, callback].filter(isDefined),
            multi,
        ),
        accepted_func: 'api.query.timekeeping.workerProjectsBacklogStatus',
        // check if worker is banned. Result: undefined: not banned, object: banned
        banned: (activityId, callback, multi) => queryBlockchain(
            query.worker.banned_func,
            [activityId, callback].filter(isDefined),
            multi,
        ),
        banned_func: 'api.query.timekeeping.projectWorkersBanList',
        // workers that have been invited to but hasn't responded yet
        listInvited: (activityId, callback, multi) => queryBlockchain(
            query.worker.listInvited_func,
            [activityId, callback].filter(isDefined),
            multi,
        ),
        listInvited_func: 'api.query.timekeeping.projectInvitesList',
        // workers that has accepted invitation
        listWorkers: (activityId, callback, multi) => queryBlockchain(
            query.worker.listWorkers_func,
            [activityId, callback].filter(isDefined),
            multi,
        ),
        listWorkers_func: 'api.query.timekeeping.projectWorkersList',
        /**
         * @name    listWorkerActivities
         * @summary Activities that worker has been invited to or accepted
         *
         * @param   {String|Array}  workerAddress   identity
         * @param   {Function}      callback        (optional) to subscribe to blockchain storage state changes
         *  
         * @returns {String[]|String[][]|Function}   Activity IDs or unsubscribe function
         */
        listWorkerActivities: (workerAddress, callback) => queryBlockchain(
            query.worker.listWorkerActivities_func,
            [workerAddress, callback].filter(isDefined),
            isArr(workerAddress),
        ),
        listWorkerActivities_func: 'api.query.timekeeping.workerProjectsBacklogList',
        // worker's total booked time (in blocks) accross all activities (unused!)
        //
        // Params:
        // @workerAddress   string/array: array for multi query
        // @callback        function: (optional) to subscribe to blockchain storage state changes
        // @multi           boolean: (optional) indicates multiple storage states are being queried in a single request
        //  
        // Returns          promise
        totalBlocks: (workerAddress, callback, multi) => queryBlockchain(
            query.worker.totalBlocks_func,
            [workerAddress, callback].filter(isDefined),
            multi,
        ),
        totalBlocks_func: 'api.query.timekeeping.totalBlocksPerAddress',
        // worker's total booked time (in blocks) for a specific project
        //
        // Params:
        // @workerAddress   string/array: array for multi query
        // @activityId       string/array: array for multi query
        // @callback        function: (optional) to subscribe to blockchain storage state changes
        // @multi           boolean: (optional) indicates multiple storage states are being queried in a single request
        //  
        // returns          promise
        totalBlocksByActivity: (workerAddress, activityId, callback) => queryBlockchain(
            query.worker.totalBlocksByActivity_func,
            [
                isArr(activityId) && !isArr(workerAddress)
                    ? activityId.map(() => workerAddress)
                    : workerAddress,
                activityId,
                callback
            ].filter(isDefined),
            isArr(activityId),
        ),
        totalBlocksByActivity_func: 'api.query.timekeeping.totalBlocksPerProjectPerAddress',
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
        // @activityId       string
        // @recordHash      string
        // @status          integer: default 0
        // @reason          object: {ReasonCode: integer, ReasonCodeType: integer}
        // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
        approve: (
            ownerAddress,
            workerAddress,
            activityId,
            recordId,
            accepted,
            reason,
            queueProps = {}
        ) => ({
            ...queueProps,
            address: ownerAddress,
            func: 'api.tx.timekeeping.authoriseTime',
            type: TX_STORAGE,
            args: [
                workerAddress,
                activityId,
                recordId,
                accepted
                    ? statuses.accept
                    : statuses.reject,
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
        // @activityId       string
        // @recordId        string: leave empty to create a new record, otherwise, use existing record's hash
        // @status          int: record status code
        // @reason          object: valid properties => ReasonCodeKey, ReasonCodeTypeKey
        // @postingPeriod   u16: 15 fiscal periods (0-14) // not yet implemented use default 0
        // @blockStart      int: block number when timekeeping started
        // @blockEnd        int: block number when timekeeping ended
        // @blockCount      int: total number of blocks worker has been active
        // @breakCount      int: number of breaks taken during record period
        // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
        save: (
            address,
            activityId,
            recordId,
            status,
            reason,
            blockCount,
            postingPeriod,
            blockStart,
            blockEnd,
            breakCount,
            queueProps = {}
        ) => ({
            ...queueProps,
            address: address,
            func: 'api.tx.timekeeping.submitTime',
            type: TX_STORAGE,
            args: [
                activityId,
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
        // @activityId       string
        // @workerAddress   string
        // @accepted        boolean: indicates acceptence or rejection
        // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
        accept: (
            activityId,
            workerAddress,
            accepted,
            queueProps = {}
        ) => ({
            ...queueProps,
            address: workerAddress,
            func: 'api.tx.timekeeping.workerAcceptanceProject',
            type: TX_STORAGE,
            args: [activityId, accepted],
        }),
        // (project owner) invite a worker to join a project
        //
        // Params:
        // @activityId       string
        // @ownerAddress    string
        // @workerAddress   string
        // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
        add: (
            activityId,
            ownerAddress,
            workerAddress,
            queueProps = {}
        ) => ({
            ...queueProps,
            address: ownerAddress,
            func: 'api.tx.timekeeping.notifyProjectWorker',
            type: TX_STORAGE,
            args: [workerAddress, activityId],
        }),
        // ban project worker
        //
        // Params:
        // @activityId       string
        // @ownerAddress    string
        // @recordId        string
        // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
        banWorker: (
            activityId,
            ownerAddress,
            recordId,
            queueProps = {}
        ) => ({
            ...queueProps,
            address: ownerAddress,
            func: 'api.tx.timekeeping.banWorker',
            type: TX_STORAGE,
            args: [activityId, recordId],
        }),
        // unban project worker
        //
        // Params:
        // @activityId       string
        // @ownerAddress    string
        // @ownerAddress    string
        // @recordHash      string
        // @queueProps      object: provide task specific properties (eg: description, title, then, next...)
        unbanWorker: (
            activityId,
            ownerAddress,
            workerAddress,
            queueProps = {}
        ) => ({
            ...queueProps,
            address: ownerAddress,
            func: 'api.tx.timekeeping.banWorker',
            type: TX_STORAGE,
            args: [activityId, workerAddress],
        }),
    },
}

setTimeout(() => {
    rxDurtionPreference.ignoredFirst = !isDefined(rxDurtionPreference.value)
    rxDurtionPreference.subscribe(value => {
        if (!value || rw().timeConversion === value) return
        rw({ timeConversion: value })
    })

    // remove legacy values
    storage.settings.module('time-keeping', null)
    rwCache('formData', null)
})

export default {
    blocksToDuration,
    durationPreferences,
    // forceUpdate,
    // getProjects,
    MODULE_KEY,
    NEW_RECORD_HASH,
    query,
    queueables,
    rxDurtionPreference,
    statuses,
}