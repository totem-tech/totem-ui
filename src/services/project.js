// *********
// IMPORTANT NOTE the terminology "project" has been replaced by "activity" in the UI. 
// It has not been replaced in the code.
// *********
import uuid from 'uuid'
import { Bond } from 'oo7'
import { hashToStr } from '../utils/convert'
import PromisE from '../utils/PromisE'
import { arrUnique, isFn } from '../utils/utils'
// services
import { hashTypes, query } from './blockchain'
import client from './chatClient'
import identities, { getSelected, selectedAddressBond } from './identity'
import partners from './partner'
import storage from './storage'
import timeKeeping from './timeKeeping'

export const MODULE_KEY = 'projects'
// read or write to cache storage
const cacheRW = (key, value) => storage.cache(MODULE_KEY, key, value)
// queue item type
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
    const [projects = new Map(), unknownIds = []] = clientResult

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
export const getProject = async (recordId) => {
    const projects = await fetchProjects([recordId])
    return projects.size > 0 ? Array.from(projects)[0][1] : undefined
}

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
export const getProjects = (forceUpdate = false, timeout = 10000) => new Promise(async (resolve, reject) => {
    const config = getProject
    config.bond = config.bond || new Bond()
    const {
        address: addressPrev,
        bond,
        unsubscribe,
        update,
        updatePromise,
    } = config
    const { address } = getSelected()
    const cacheKey = 'projects-' + address

    try {
        if (!navigator.onLine) return new Map(cacheRW(cacheKey) || [])
        if (!unsubscribe || address !== addressPrev) {
            // selected identity changed
            config.address = address
            isFn(unsubscribe) && unsubscribe()
            config.unsubscribe = await project.listByOwner(address, update)
        } else if (forceUpdate) {
            // once-off update
            await update(await project.listByOwner(address), true, true)
        }
    } catch (err) {
        reject(err)
    }

    try {
        await PromisE.timeout(updatePromise, Bond.proimse(bond), timeout)
        config.bond = null // remove bond
    } catch (e) {
        /* ignore timeout error  */
    }
    resolve(new Map(cacheRW(cacheKey) || []))
})
getProjects.update = async (recordIds, forceUpdate = false, throwError = false) => {
    const config = getProject
    const { updatePromise } = config
    recordIds = recordIds.map(hashToStr).sort()
    const cachedIds = (cacheRW(cacheKey) || []).map(([id]) => id).sort()
    const changed = JSON.stringify(recordIds) !== JSON.stringify(cachedIds)
    if (updatePromise && updatePromise.pending || !changed && !forceUpdate) return

    // use cache if times out
    try {
        // update cache and trigger bond
        config.updatePromise = new PromisE(fetchProjects(recordIds))
        const projects = await config.updatePromise
        // in case chat server does not have the project
        Array.from(projects).forEach(([_, project]) => {
            project.ownerAddress = project.ownerAddress || address
            project.isOwner = true
            project.title = project.title || 'Unknown'
            project.description = project.description || ''
        })
        // save to local storage
        cacheRW(cacheKey, projects)
        // update bond so that components that are subscribed to it gets updated
        const id = uuid.v1()
        getProjectsBond.changed(id)
        config.bond && config.bond.changed(id)
    } catch (err) {
        if (throwError) throw err
    }
}

// triggered whenever list of project is updated
export const getProjectsBond = new Bond()
selectedAddressBond.tie(() => getProjectsBond.changed(uuid.v1()))

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
        'api.query.projects.projectHashOwner',
        [recordId, callback].filter(Boolean),
        multi,
    ),
    // listByOwner retrieves a list of project hashes owned by @address
    //
    // Returns Promise/function
    listByOwner: (address, callback, multi = false) => query(
        'api.query.projects.ownerProjectsList',
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
        'api.query.projects.projectHashStatus',
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
        func: 'api.tx.projects.addNewProject',
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
        func: 'api.tx.projects.reassignProject',
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
        func: 'api.tx.projects.removeProject',
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
        func: 'api.tx.projects.setStatusProject',
        type: TX_STORAGE,
        args: [recordId, statusCode],
    }),
}
export default {
    fetchProjects,
    getProject,
    getProjects,
    getProjectsBond,
    openStatuses,
    statusCodes,
    ...project,
    tasks,
}