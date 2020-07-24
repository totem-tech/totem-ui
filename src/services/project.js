// *********
// IMPORTANT NOTE the terminology "project" has been replaced by "activity" in the UI. 
// It has not been replaced in the code.
// *********
import { Observable } from 'rxjs'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { hashToStr } from '../utils/convert'
import PromisE from '../utils/PromisE'
import { arrUnique, isFn } from '../utils/utils'
// services
import { hashTypes, query, getConnection } from './blockchain'
import client from './chatClient'
import identities, { getSelected, selectedAddressBond } from './identity'
import partners from './partner'
import storage from './storage'
import timeKeeping from './timeKeeping'

export const MODULE_KEY = 'projects'
// read or write to cache storage
const cacheRW = (key, value) => storage.cache(MODULE_KEY, key, value)
const queryPrefix = 'api.query.projects.'
const txPrefix = 'api.tx.projects.'
// transaction queue item type
const TX_STORAGE = 'tx_storage'
// project status codes
export const statusCodes = {
    open: 0,
    reopen: 100,
    onHold: 200,
    abandon: 300,
    cancel: 400,
    close: 500,
    delete: 999,
}
// status codes that indicate project is open
export const openStatuses = [statusCodes.open, statusCodes.reopen]
let projectsObserver = null
export const rxProjects = Observable.create(o => projectsObserver = o)
setTimeout(() => selectedAddressBond.tie(() => getProjects(true)))

export const fetchProjects = async (recordIds = [], timeout = 10000) => {
    recordIds = await new PromisE(recordIds)
    recordIds = arrUnique(recordIds.flat().filter(Boolean))
    if (recordIds.length === 0) return new Map()
    const { firstSeen, totalBlocks } = timeKeeping.project
    const promise = Promise.all([
        firstSeen(recordIds, null, true),
        totalBlocks(recordIds, null, true),
        project.status(recordIds, null, true),
        client.projectsByHashes.promise(recordIds),
    ])
    const result = await PromisE.timeout(promise, timeout)
    const [arFristSeen, arTotalBlocks, arStatusCode, clientResult] = result
    const [projects = new Map(), unknownIds = []] = clientResult || []

    // Records that are somehow not found in the off-chain database
    unknownIds.forEach(recordId => projects.set(recordId, {}))

    // process projects to include extra information
    Array.from(projects).forEach(([recordId, project]) => {
        const index = recordIds.indexOf(recordId)
        project.status = arStatusCode[index]
        // exclude deleted project
        if (project.status === null) return projects.delete(recordId)

        const { ownerAddress } = project
        const { name } = identities.get(ownerAddress) || partners.get(ownerAddress) || {}
        project.ownerName = name
        project.firstSeen = arFristSeen[index]
        project.totalBlocks = arTotalBlocks[index]
    })
    return projects
}

// getProject retrieves a single project by hash
export const getProject = async (recordId) => (Array.from(await fetchProjects([recordId]))[0] || [])[1]

// getProjects retrieves projects along with relevant details owned by selected identity.
// Retrieved data is cached in localStorage and only updated when list of projects changes in the blockchain
// or manually triggered by invoking `getProjects(true)`.
//
// Params:
// @forceUpdate     Boolean: (optional) whether to attempt to update cached data immediately instead of re-using cache.
//                          Default: false
// @timeout         Integer: (optional) timeout if not resolved within given duration (in milliseconds).
//                          Default: 10000 (10 seconds)
// 
// Returns          Map: list of projects
export const getProjects = async (forceUpdate = false, timeout = 10000) => {
    let result
    const config = getProjects
    config.bond = config.bond || new Bond()
    const {
        address: addressPrev,
        unsubscribe,
    } = config
    const { address } = getSelected()
    const cacheKey = 'projects-' + address

    if (!navigator.onLine) return new Map(cacheRW(cacheKey) || [])
    if ((config.updatePromise || {}).rejected || address !== addressPrev) {
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
            config.unsubscribe = await project.listByOwner(address, async (result) => {
                try {
                    result = await config.update(result, cacheKey)
                    projectsObserver.next(result)
                    resolve(result)
                } catch (err) {
                    console.log(err)
                    reject(err)
                }
            })
        })())
    } else if (forceUpdate) {
        // once-off update
        config.updatePromise = config.update(await project.listByOwner(address), address, true)
    }

    const promise = PromisE.timeout(config.updatePromise, timeout)
    try {
        result = await promise
    } catch (err) {
        // if timed out, return cached. Otherwise, throw error
        if (!promise.timeout.rejected) throw err
    }
    return result || new Map(cacheRW(cacheKey) || [])
}
getProjects.update = async (recordIds, address, forceUpdate = false) => {
    let projects = null
    const cacheKey = 'projects-' + address
    // force convert to strings for comparison
    recordIds = recordIds.map(hashToStr).sort()
    let cached = cacheRW(cacheKey) || []
    const cachedIds = cached.map(([id]) => id).sort()
    let changed = JSON.stringify(recordIds) !== JSON.stringify(cachedIds)
    if (!changed && !forceUpdate) return new Map(cached)

    // use cache if times out
    // update cache and trigger bond
    projects = await fetchProjects(recordIds)
    // in case chat server does not have the project
    const projectsArr = Array.from(projects).map(([_, project]) => {
        project.ownerAddress = project.ownerAddress || address
        project.isOwner = true
        project.title = project.title || 'Unknown'
        project.description = project.description || ''
        return project
    })
    // save to local storage
    cached = cacheRW(cacheKey, projects)
    changed = JSON.stringify(cached) !== JSON.stringify(projectsArr)
    return projects
}

const project = {
    // getOwner retrives the owner address of a project
    //
    // Params:
    // @recordId    string/array: project ID(s)
    // @callback    function: (optional)
    // @multi       boolean: (optional) Default: false
    //
    // Returns Promise/function
    getOwner: (recordId, callback, multi = false) => query(
        queryPrefix + 'projectHashOwner',
        [recordId, callback].filter(Boolean),
        multi,
    ),
    // listByOwner retrieves a list of project hashes owned by @address
    //
    // Returns Promise/function
    listByOwner: (address, callback, multi = false) => query(
        queryPrefix + 'ownerProjectsList',
        [address, callback].filter(Boolean),
        multi,
    ),
    // status retrieves the status code of a project
    // params
    // @recordId    string/array: project ID(s)
    // @callback    function: (optional)
    //
    // Returns      Promise/function
    status: (recordId, callback, multi = false) => query(
        queryPrefix + 'projectHashStatus',
        [recordId, callback].filter(Boolean),
        multi,
    ),
}

// Save project related data to blockchain storage.
// Each function returns a task (an object) that can be used to create a queued transaction.
// Make sure to supply appropriate `title` and `descrption` properties to `@queueProps`
// and use the `addToQueue(task)` function from queue service to add the task to the queue
export const tasks = {
    // add a new project
    //
    // Params:
    // @ownerAddress    string
    // @recordId        string: project ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns      object
    add: (ownerAddress, recordId, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: txPrefix + 'addNewProject',
        type: TX_STORAGE,
        args: [recordId],
    }),
    // transfer ownership of a project to a new owner address 
    //
    // Params:
    // @ownerAddress    string/Bond: current owner of the project
    // @newOwnerAddress string/Bond: address which will be the new owner
    // @recordId        string: project ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    reassign: (ownerAddress, newOwnerAddress, recordId, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: txPrefix + 'reassignProject',
        type: TX_STORAGE,
        args: [newOwnerAddress, recordId],
    }),
    // remove a project
    //
    // Params:
    // @ownerAddress    string/Bond: current owner of the project
    // @recordId        string  : project ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    remove: (ownerAddress, recordId, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: txPrefix + 'removeProject',
        type: TX_STORAGE,
        args: [recordId],
    }),
    // save BONSAI token for a project
    //
    // Params:
    // @ownerAddress    string
    // @recordId     string: project ID
    // @token           string: hash generated using project details
    //
    // Returns          object
    saveBONSAIToken: (ownerAddress, recordId, token, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.bonsai.updateRecord',
        type: TX_STORAGE,
        args: [hashTypes.projectHash, recordId, token],
    }),
    // change project status
    //
    // Params:
    // @ownerAddress    string/Bond: current owner of the project
    // @recordId        string: project ID
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    setStatus: (ownerAddress, recordId, statusCode, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: txPrefix + 'setStatusProject',
        type: TX_STORAGE,
        args: [recordId, statusCode],
    }),
}
export default {
    fetchProjects,
    getProject,
    getProjects,
    openStatuses,
    rxProjects,
    statusCodes,
    ...project,
    tasks,
}