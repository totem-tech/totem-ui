import DataStorage from '../utils/DataStorage'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { calls, post, runtime } from 'oo7-substrate'
import identities, { getSelected, selectedAddressBond } from './identity'
import { hashToBytes, validateAddress, ss58Decode } from '../utils/convert'
import client from './chatClient'
import { hashToStr } from '../utils/convert'
import { arrUnique, isBond, isUint8Arr } from '../utils/utils'
import timeKeeping from './timeKeeping'
import partners from './partner'

const CACHE_PREFIX = 'totem__cache_projects_'
const cacheStorage = new DataStorage(undefined, true)
// let _config.address, projectsBond, projectsBondTieId;
const _config = {
    address: undefined,
    firstAttempt: true,
    hashesBond: undefined,
    tieId: undefined,
    updateInProgress: false,
    updatePromise: undefined,
}

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
    cacheStorage.name = CACHE_PREFIX + address
    const projectsCache = cacheStorage.getAll()
    if (_config.address !== address) {
        _config.address = address
        // update projects list whenever list of projects changes
        if (_config.hashesBond) _config.hashesBond.untie(_config.tieId)
        _config.hashesBond = project.listByOwner(address)
        _config.tieId = _config.hashesBond.tie(hashes => {
            hashes = hashes.map(h => hashToStr(h))
            const changed = !!hashes.find(hash => !projectsCache.get(hash))
                || !!Array.from(projectsCache).find(([hash]) => !hashes.includes(hash))
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
        cacheStorage.setAll(projects)
        _forceUpdate && getProjectsBond.changed(uuid.v1())
        return projects
    })
    return _config.updatePromise
}

// triggered whenever list of project is updated
export const getProjectsBond = new Bond().defaultTo(uuid.v1())
selectedAddressBond.tie(() => getProjectsBond.changed(uuid.v1()))

const project = {
    // add a new project
    //
    // Params:
    // @address string/Bond
    // @hash    string: an unique hash generated by using project name, owner address and description
    //
    // Returns Bond : expected values from returned bond =>
    //              1. {signing: true/false}
    //              2. {sending: true/false}
    //              3. 'ready'
    //              4. {finalized: 'TXID'}
    //              5. {failed: {code: xxx, message: 'error message'}}
    add: (ownerAddress, hash) => post({
        sender: validateAddress(ownerAddress),
        call: calls.projects.addNewProject(hashToBytes(hash)),
        compact: false,
        longevity: true
    }),
    // close a project
    //
    // Params:
    // @ownerAddress    string/Bond: current owner of the project
    // @hash            string     : unique hash/ID of the project
    //
    // Returns Bond : expected values from returned bond =>
    //              1. {signing: true/false}
    //              2. {sending: true/false}
    //              3. 'ready'
    //              4. {finalized: 'TXID'}
    //              5. {failed: {code: xxx, message: 'error message'}}
    close: (ownerAddress, hash) => post({
        sender: validateAddress(ownerAddress),
        call: calls.projects.setStatusProject(hashToBytes(hash), statusCodes.close),
        compact: false,
        longevity: true
    }),
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
    // reassign transfers ownership of a project to a new owner address 
    //
    // Params:
    // @ownerAddress    string/Bond: current owner of the project
    // @newOwnerAddress string/Bond: address which will be the new owner
    // @hash            string     : unique hash/ID of the project
    //
    // Returns Bond : expected values from returned bond =>
    //              1. {signing: true/false}
    //              2. {sending: true/false}
    //              3. 'ready'
    //              4. {finalized: 'TXID'}
    //              5. {failed: {code: xxx, message: 'error message'}}
    reassign: (ownerAddress, newOwnerAddress, hash) => post({
        sender: validateAddress(ownerAddress),
        call: calls.projects.reassignProject(newOwnerAddress, hashToBytes(hash)),
        compact: false,
        longevity: true
    }),
    // remove a project
    //
    // Params:
    // @ownerAddress    string/Bond: current owner of the project
    // @hash            string     : unique hash/ID of the project
    //
    // Returns Bond : expected values from returned bond =>
    //              1. {signing: true/false}
    //              2. {sending: true/false}
    //              3. 'ready'
    //              4. {finalized: 'TXID'}
    //              5. {failed: {code: xxx, message: 'error message'}}
    remove: (ownerAddress, hash) => post({
        sender: validateAddress(ownerAddress),
        call: calls.projects.removeProject(hashToBytes(hash)),
        compact: false,
        longevity: true
    }),
    // reopenProject removes project
    //
    // Params:
    // @ownerAddress    string/Bond: current owner of the project
    // @hash            string     : unique hash/ID of the project
    //
    // Returns Bond : expected values from returned bond =>
    //              1. {signing: true/false}
    //              2. {sending: true/false}
    //              3. 'ready'
    //              4. {finalized: 'TXID'}
    //              5. {failed: {code: xxx, message: 'error message'}}
    reopen: (ownerAddress, hash) => post({
        sender: validateAddress(ownerAddress),
        call: calls.projects.setStatusProject(hashToBytes(hash), statusCodes.reopen),
        compact: false,
        longevity: true
    }),
    // status retrieves the status code of a project
    // params
    // @projecthash    string/Uint8Array
    status: projecthash => runtime.projects.projectHashStatus(hashToBytes(projecthash)),
}
export default {
    fetchProjects,
    getProject,
    getProjects,
    getProjectsBond,
    openStatuses,
    statusCodes,
    ...project,
}