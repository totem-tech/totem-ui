import uuid from 'uuid'
import { Bond } from 'oo7'
import { runtime } from 'oo7-substrate'
import { hashToBytes, hashToStr, ss58Decode } from '../utils/convert'
import { arrUnique, isBond, isUint8Arr } from '../utils/utils'
// services
import { hashTypes } from './blockchain'
import client from './chatClient'
import identities, { getSelected, selectedAddressBond } from './identity'
import partners from './partner'
import storage from './storage'
import timeKeeping from './timeKeeping'

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

// getProjects retrieves projects owned by selected identity
// Retrieved data is cached in localStorage and only updated there is changes to invitation or manually triggered by setting `@_forceUpdate` to `true`.
//
// Params:
// @_forceUpdate    Boolean
// 
// Returns Promise
export const getProjects = (_forceUpdate = false) => {
    _forceUpdate = _forceUpdate || _config.firstAttempt
    const { address } = getSelected()
    const key = 'projects-' + address
    const cachedAr = cacheRW(key) || []
    const projectsCache = new Map(cachedAr)

    if (_config.address !== address) {
        _config.address = address
        // update projects list whenever list of projects changes
        if (_config.hashesBond) _config.hashesBond.untie(_config.tieId)
        _config.hashesBond = project.listByOwner(address)
        _config.tieId = _config.hashesBond.tie(hashes => {
            hashes = hashes.map(h => hashToStr(h))
            const changed = !!hashes.find(hash => !projectsCache.get(hash))
                || !!cachedAr.find(([hash]) => !hashes.includes(hash))
            if (_config.firstAttempt) return
            if (_config.updateInProgress) return //_config.updatePromise.then(() => getProjects())
            if (changed) return getProjects(true)
        })
    }

    if (!navigator.onLine || !_forceUpdate && projectsCache.size > 0) {
        return new Promise(resolve => resolve(projectsCache))
    }
    if (_config.updateInProgress) return _config.updatePromise
    _config.updateInProgress = true
    // if not online resolve to cached projects and update whenever goes online
    _config.updatePromise = fetchProjects(_config.hashesBond).then(projects => {
        // in case chat server does not have the project
        Array.from(projects).forEach(([_, project]) => {
            project.ownerAddress = project.ownerAddress || address
            project.isOwner = true
        })
        _config.updateInProgress = false
        _config.firstAttempt = false
        cacheRW(key, projects)
        _forceUpdate && getProjectsBond.changed(uuid.v1())
        return projects
    })
    return _config.updatePromise
}

// triggered whenever list of project is updated
export const getProjectsBond = new Bond().defaultTo(uuid.v1())
selectedAddressBond.tie(() => getProjectsBond.changed(uuid.v1()))

const project = {
    // getOwner retrives the owner address of a project
    //
    // Params:
    // @projectHash string/Bond/Uint8Array
    //
    // Returns Bond
    getOwner: projectHash => runtime.projects.projectHashOwner(hashToBytes(projectHash)),
    // listByOwner retrieves a list of project hashes owned by @address
    //
    // Returns Bond
    listByOwner: address => runtime.projects.ownerProjectsList(ss58Decode(address)),
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