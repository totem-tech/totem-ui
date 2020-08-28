// *********
// IMPORTANT NOTE the terminology "project" has been replaced by "activity" in the UI. 
// It has not been replaced in the code.
// *********
import { Subject } from 'rxjs'
import { bytesToHex } from '../utils/convert'
import PromisE from '../utils/PromisE'
import { arrUnique, isFn, isStr } from '../utils/utils'
// services
import { hashTypes, query as queryBlockchain, getConnection } from './blockchain'
import client from './chatClient'
import identities, { getSelected, rxSelected } from './identity'
import partners from './partner'
import storage from './storage'
import { query as tkQuery } from './timeKeeping'

export const MODULE_KEY = 'projects'
const rxProjects = new Subject()
// read or write to cache storage
const cacheRW = (key, value) => storage.cache(MODULE_KEY, key, value)
const cacheKeyProjects = address => `projects-${address}`
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
setTimeout(() => rxSelected.subscribe(() => getProjects(true)))

// retrieve project details by record IDs
//
// Params:
// @recordIds       array: array of project IDs
// @ownAddress      string: address of the users own identity to determine if user owns individual records.
// @timeout         integer: (optional) duration in milliseconds to timeout the request
//
// Returns          map: list of projects
export const fetchProjects = async (recordIds = [], ownAddress, timeout = 10000) => {
    recordIds = await new PromisE(recordIds)
    recordIds = arrUnique(
        recordIds.map(id => isStr(id) ? id : bytesToHex(id))
    ).filter(Boolean)
    if (recordIds.length === 0) return new Map()
    const { firstSeen, totalBlocks } = tkQuery.project
    const promise = Promise.all([
        firstSeen(recordIds, null, true),
        totalBlocks(recordIds, null, true),
        query.status(recordIds, null, true),
        client.projectsByHashes.promise(recordIds),
    ])
    const result = await PromisE.timeout(promise, timeout)
    const [arFristSeen, arTotalBlocks, arStatusCode, clientResult] = result
    const [projects = new Map(), unknownIds = []] = clientResult || []

    // Records that are somehow not found in the off-chain database
    unknownIds.forEach(recordId => projects.set(recordId, {}))

    // process projects to include extra information
    const resultArr = Array.from(projects).map(([recordId, project]) => {
        const index = recordIds.indexOf(recordId)
        project.status = arStatusCode[index]
        // exclude deleted project
        if (project.status === null) return

        const { description, name, ownerAddress } = project
        const { name: ownerName } = identities.get(ownerAddress) || partners.get(ownerAddress) || {}
        return [recordId, {
            ...project,
            ownerName: ownerName,
            firstSeen: arFristSeen[index],
            totalBlocks: arTotalBlocks[index],
            ownerAddress: ownerAddress || ownAddress,
            isOwner: ownAddress === ownerAddress || getSelected().address === ownerAddress,
            name: name || '',
            description: description || '',
        }]
    })
    return new Map(resultArr.filter(Boolean))
}

// @forceUpdate updates only specified @recordIds in the projects list.
//
// Params:
// @recordids   array: array of project IDs
export const forceUpdate = async (recordIds, ownerAddress) => {
    const updateProjects = await fetchProjects(recordIds, ownerAddress)
    const projects = await getProjects()
    Array.from(updateProjects).forEach(
        ([recordId, project]) => projects.set(recordId, project)
    )
    // save to local storage
    saveProjects(projects, ownerAddress)
}

// getProject retrieves a single project by hash
export const getProject = async (recordId) => (await getProjects()).get(recordId)

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
export const getProjects = async (forceUpdate = false, callback, timeout = 10000) => {
    if (isFn(callback)) {
        const subscribed = rxProjects.subscribe(callback)
        // makes sure query.worker.listWorkerProjects is subscribed
        getProjects(forceUpdate).then(callback)
        return () => subscribed.unsubscribe()
    }

    let result
    const config = getProjects
    const {
        address: addressPrev,
        unsubscribe,
        updatePromise,
    } = config
    const { address } = getSelected()
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
            config.unsubscribe = await query.listByOwner(address, async (recordIds) => {
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
        config.updatePromise = fetchProjects(query.listByOwner(address), address)
        // update rxProjects
        config.updatePromise.then(projects => saveProjects(projects, address))
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
    // getOwner retrives the owner address of a project
    //
    // Params:
    // @recordId    string/array: array for multi query
    // @callback    function: (optional) to subscribe to blockchain storage state changes
    // @multi       boolean: (optional) indicates multiple storage states are being queried in a single request
    //
    // Returns Promise/function
    getOwner: (recordId, callback, multi = false) => queryBlockchain(
        queryPrefix + 'projectHashOwner',
        [recordId, callback].filter(Boolean),
        multi,
    ),
    // listByOwner retrieves a list of project hashes owned by @address
    //
    // Params:
    // @address     string/array: array for multi query
    // @callback    function: (optional) to subscribe to blockchain storage state changes
    // @multi       function: (optional) indicates multiple storage states are being queried in a single request
    //
    // Returns      promise
    listByOwner: (address, callback, multi = false) => queryBlockchain(
        queryPrefix + 'ownerProjectsList',
        [address, callback].filter(Boolean),
        multi,
    ),
    // status retrieves the status code of a project
    // params
    // @recordId    string/array: array for multi query
    // @callback    function: (optional) to subscribe to blockchain storage state changes
    // @multi       function: (optional) indicates multiple storage states are being queried in a single request
    //
    // Returns      promise
    status: (recordId, callback, multi = false) => queryBlockchain(
        queryPrefix + 'projectHashStatus',
        [recordId, callback].filter(Boolean),
        multi,
    ),
}

// queueables helps create queueable blockchain transactions relevant to projects.
// Make sure to supply appropriate `title` and `descrption` properties to `@queueProps`
// so that user can be notified by a toast message.
//
// Usage Example:
// const queueProps = {
//      title: 'a simple title',   
//      description: 'short description about the action being executed',
// }
// queueService.addToQueue(queueables.add('', '', queueProps))
export const queueables = {
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
    // @ownerAddress    string: current owner of the project
    // @newOwnerAddress string: address which will be the new owner
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
    // @ownerAddress    string: current owner of the project
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
    // @ownerAddress    string: current owner of the project
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
    statusCodes,
    queueables,
    query,
}