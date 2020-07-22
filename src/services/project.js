import uuid from 'uuid'
import { Bond } from 'oo7'
import { runtime } from 'oo7-substrate'
import { hashToBytes, hashToStr, ss58Decode, addressToStr } from '../utils/convert'
import { arrUnique, isBond, isUint8Arr, isFn } from '../utils/utils'
// services
import { hashTypes, getConnection, query } from './blockchain'
import client from './chatClient'
import identities, { getSelected, selectedAddressBond } from './identity'
import partners from './partner'
import storage from './storage'
import timeKeeping, { record } from './timeKeeping'
import PromisE from '../utils/PromisE'

export const MODULE_KEY = 'projects'
// read or write to cache storage
const cacheRW = (key, value) => storage.cache(MODULE_KEY, key, value)
const TX_STORAGE = 'tx_storage'
const _config = {
    address: undefined,
    firstAttempt: true,
    hashesBond: undefined,
    tieId: undefined,
    updateInProgress: false,
    updatePromise: undefined,
}

// *********
// IMPORTANT NOTE the terminology "project" has been replaced by "activity" in the UI. It has not been replaced in the code.
// *********

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
export const openStatuses = [statusCodes.open, statusCodes.reopen]

// retrieve full project details by hashes
export const fetchProjects = (projectHashesOrBond = []) => new Promise((resolve, reject) => {
    try {
        const process = projectHashes => {
            const uniqueHashes = arrUnique(projectHashes.flat().map(hash => {
                return isUint8Arr(hash) ? hashToStr(hash) : hash
            })).filter(hash => !['0x00'].includes(hash)) // ingore any invalid hash

            if (uniqueHashes.length === 0) return resolve(new Map())

            const firstSeenBond = Bond.all(uniqueHashes.map(h => timeKeeping.project.firstSeen(h)))
            const totalBlocksBond = Bond.all(uniqueHashes.map(h => timeKeeping.project.totalBlocks(h)))
            const statusesBond = Bond.all(uniqueHashes.map(h => project.status(h)))

            Bond.all([firstSeenBond, totalBlocksBond, statusesBond]).then(result => {
                const [arFristSeen, arTotalBlocks, arStatusCode] = result
                client.projectsByHashes(uniqueHashes, (err, projects = new Map(), unknownHashes = []) => {
                    if (err) return reject(err)
                    unknownHashes.forEach(hash => projects.set(hash, {}))
                    Array.from(projects)
                        .forEach(([hash, project]) => {
                            const index = uniqueHashes.indexOf(hash)
                            project.status = arStatusCode[index]
                            //exclude deleted project
                            if (project.status === null) return projects.delete(hash)

                            const { ownerAddress } = project
                            const { name } = identities.get(ownerAddress) || partners.get(ownerAddress) || {}
                            project.ownerName = name
                            project.firstSeen = arFristSeen[index]
                            project.totalBlocks = arTotalBlocks[index]
                        })
                    resolve(projects)
                })
            })
        }
        isBond(projectHashesOrBond) ? projectHashesOrBond.then(process) : process(projectHashesOrBond)
    } catch (err) {
        reject(err)
    }
})

// getProject retrieves a single project by hash
export const getProject = projectHash => fetchProjects([projectHash]).then(projects => {
    return projects.size > 0 ? Array.from(projects)[0][1] : undefined
})

// getProjects retrieves projects along with relevant details owned by selected identity.
// Retrieved data is cached in localStorage and only updated when list of projects changes in the blockchain
// or manually triggered by invoking `getProjects(true)`.
//
// Params:
// @forceUpdate     Boolean: (optional)
// 
// Returns          Map: list of projects
export async function getProjects(forceUpdate) {
    const config = getProject
    const {
        address: addressPrev,
        unsubscribe,
        timeout = 10000, // force timeout after 10 seconds
    } = config
    const { address } = getSelected()
    const cacheKey = 'projects-' + address
    const update = async (recordIds) => {
        recordIds = recordIds.map(h => hashToStr(h)).sort()
        const cachedIds = (cacheRW(cacheKey) || []).map(([id]) => id).sort()
        const changed = JSON.stringify(recordIds) !== JSON.stringify(cachedIds)
        if (config.updatePromise || !changed && !forceUpdate) return

        const promise = fetchProjects(recordIds)
        // use cache if times out
        config.updatePromise = PromisE.timeout(promise, timeout)
        // update cache and trigger bond
        promise.then(projects => {
            // in case chat server does not have the project
            Array.from(projects).forEach(([_, project]) => {
                project.ownerAddress = project.ownerAddress || address
                project.isOwner = true
                project.title = project.title || 'Unknown'
                project.description = project.description || ''
            })
            config.updatePromise = null
            // save to local storage
            cacheRW(cacheKey, projects)
            // update bond so that components that are subscribed to it gets updated
            getProjectsBond.changed(uuid.v1())
            return projects
        })
    }
    if (!unsubscribe || address !== addressPrev) {
        // selected identity changed
        config.address = address
        isFn(unsubscribe) && unsubscribe()
        config.unsubscribe = await project.listByOwner(address, update)
    } else if (forceUpdate) {
        // once-off update
        await project.listByOwner(address).then(update)
    }

    if (!navigator.onLine) return new Map(cacheRW(cacheKey) || [])

    // if fetchProjects is still in-progress wait for it to finish
    try {
        if (config.updatePromise) await config.updatePromise
    } catch (e) { /* ignore timeout error  */ }
    return new Map(cacheRW(cacheKey) || [])
}

// triggered whenever list of project is updated
export const getProjectsBond = new Bond().defaultTo(uuid.v1())
selectedAddressBond.tie(() => getProjectsBond.changed(uuid.v1()))

const project = {
    // getOwner retrives the owner address of a project
    //
    // Params:
    // @recordId    string/Uint8Array: must be a valid hex
    // @callback    function: (optional) if included will return a function to unsubscribe
    //
    // Returns Bond
    getOwner: (recordId, callback) => query(
        'api.query.projects.projectHashOwner',
        [hashToStr(recordId), callback].filter(Boolean),
    ),
    // listByOwner retrieves a list of project hashes owned by @address
    //
    // Returns Bond
    // listByOwner: address => runtime.projects.ownerProjectsList(ss58Decode(address)),
    listByOwner: (address, callback) => query(
        'api.query.projects.ownerProjectsList',
        [addressToStr(address), callback].filter(Boolean),
    ),
    // status retrieves the status code of a project
    // params
    // @projecthash    string/Uint8Array
    status: projecthash => runtime.projects.projectHashStatus(hashToBytes(projecthash)),
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
    // @hash            string: an unique hash generated by using project name, owner address and description
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns      object
    add: (ownerAddress, hash, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.projects.addNewProject',
        type: TX_STORAGE,
        args: [hashToStr(hash)],
    }),
    // transfer ownership of a project to a new owner address 
    //
    // Params:
    // @ownerAddress    string/Bond: current owner of the project
    // @newOwnerAddress string/Bond: address which will be the new owner
    // @hash            string: unique hash/ID of the project
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    reassign: (ownerAddress, newOwnerAddress, hash, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.projects.reassignProject',
        type: TX_STORAGE,
        args: [
            newOwnerAddress,
            hashToStr(hash)
        ],
    }),
    // remove a project
    //
    // Params:
    // @ownerAddress    string/Bond: current owner of the project
    // @hash            string     : unique hash/ID of the project
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    remove: (ownerAddress, hash, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.projects.removeProject',
        type: TX_STORAGE,
        args: [hashToStr(hash)],
    }),
    // save BONSAI token for a project
    //
    // Params:
    // @ownerAddress    string
    // @projectHash     string: project ID
    // @token           string: hash generated using project details (same properties that are stored on the off-chain database)
    //
    // Returns          object
    saveBONSAIToken: (ownerAddress, projectHash, token, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.bonsai.updateRecord',
        type: TX_STORAGE,
        args: [
            hashTypes.projectHash,
            hashToStr(projectHash),
            hashToStr(token),
        ],
    }),
    // change project status
    //
    // Params:
    // @ownerAddress    string/Bond: current owner of the project
    // @hash            string: unique hash/ID of the project
    // @queueProps      string: provide task specific properties (eg: description, title, then, next...)
    //
    // returns          object
    setStatus: (ownerAddress, hash, statusCode, queueProps = {}) => ({
        ...queueProps,
        address: ownerAddress,
        func: 'api.tx.projects.setStatusProject',
        type: TX_STORAGE,
        args: [
            hashToStr(hash),
            statusCode,
        ],
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