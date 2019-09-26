import DataStorage from '../src/utils/DataStorage'
import { isArr, isFn, isStr, objCopy, objClean, isValidNumber, isBool, isObj, isDefined } from '../src/utils/utils'
const projects = new DataStorage('projects.json', true)
// Must-have properties
const requiredKeys = ['name', 'ownerAddress', 'description']
// All the acceptable properties
const validKeys = [...requiredKeys, 'status']
// Internally managed keys : ['tsCreated', 'tsFirstUsed']
const descMaxLen = 160
const messages = {
    accessDenied: 'Access denied',
    arrayRequired: 'Array required',
    exists: 'Project already exists. Please use a different owner address, name and/or description to create a new project',
    invalidDescMaxLen: `Project description must not exceed ${descMaxLen} characters`,
    invalidParams: 'Invalid parameters supplied',
    loginRequired: 'You must be logged in to perform this action',
    projectInvalidKeys: `Project must contain all of the following properties: ${requiredKeys.join()} and an unique hash`,
    projectNotFound: 'Project not found',
}

// Create/get/update project
export const handleProject = (client, findUserByClientId) => (hash, project, create, callback) => {
    if (!isFn(callback)) return;
    const existingProject = projects.get(hash)
    if (create && !!existingProject) {
        return callback(messages.exists)
    }

    // return existing project
    if (!isObj(project)) return callback(null, existingProject)

    const user = findUserByClientId(client.id)
    if (!user) return callback(messages.loginRequired)
    const {userId} = existingProject
    if (!create && isDefined(userId) && user.id !== userId) return (messages.accessDenied)

    // check if project contains all the required properties
    const invalid = !hash || !project || requiredKeys.reduce((invalid, key) => invalid || !project[key], false)
    if (invalid) return callback(messages.projectInvalidKeys)
    if (project.description.length > descMaxLen) return callback(messages.invalidDescMaxLen)
    // exclude any unwanted data 
    project = objCopy(objClean(project, validKeys), existingProject, true)
    project.status = isValidNumber(project.status) ? project.status : 0
    project.tsCreated = project.createdAt || new Date()
    project.userId = create ? user.id : project.userId

    // Add/update project
    projects.set(hash, project)
    callback(null)
    console.log(`Project ${create ? 'created' : 'updated'}: ${hash}`)
}

// update project status
// Statuses:
// 0 : open
// 1 : reopened
// 2 : closed
// 99: deleted
export const handleProjectStatus = (hash, status, callback) => {
    if (!isFn(callback)) return;
    const project = projects.get(hash)
    if (!project) return callback(messages.projectNotFound);
    console.log('Status update: ', hash, project.status, '>>', status)
    project.status = status
    projects.set(hash, project)
    callback()
}

// user projects by list of wallet addresses
// Params
// @walletAddrs	array
// @callback	function: 
//						Params:
//						@err	string, 
//						@result map, 
export const handleProjects = (walletAddrs, callback) => {
    if (!isFn(callback)) return;
    if (!isArr(walletAddrs)) return callback(messages.arrayRequired)
    // Find all projects by supplied addresses and return Map
    const result = walletAddrs.reduce((res, address) => (
        mapCopy(projects.search({ ownerAddress: address }), res)
    ), new Map())

    callback(null, result)
}

// user projects by list of project hashes
// Params
// @hashArr	array
// @callback	function: 
//						Params:
//						@err	string, 
//						@result map, 
export const handleProjectsByHashes = (hashArr, callback) => {
    if (!isFn(callback)) return;
    if (!isArr(hashArr)) return callback(messages.arrayRequired)
    const hashesNotFound = new Array()
    // Find all projects by supplied hash and return Map
    const result = hashArr.reduce((res, hash) => {
        const project = projects.get(hash)
        !!project ? res.set(hash, project) : hashesNotFound.push(hash)
        return res
    }, new Map())
    callback(null, result, hashesNotFound)
}

export const handleProjectsSearch = (keyword, callback) => {
    if (!isFn(callback) || !keyword) return
    const result = new Map()
    const projectByHash = isStr(keyword) && keyword.startsWith('0x') ? projects.get(keyword) : null
    if (projectByHash) {
        // if supplied keyword is a hash
        result.set(keyword, projectByHash)
        return callback(null, result)
    }

    return callback(null, projects.search({
        name: keyword,
        description: keyword,
        ownerAddress: keyword
    }, false, false, true))
}

// projectTimeKeepingBan bans or un-bans a userId or address from any time keeping activities
//
// Params:
// @hash        string  : project hash
// @addresses   array   : User ID to ban
// @ban         boolean : whether to ban or unban user/address
export const handleProjectTimeKeepingBan = (hash, addresses = [], ban = false, callback) => {
    if (!isFn(callback)) return
    if (!hash || !isArr(addresses) || addresses.length === 0 || !isBool(ban)) return callback(messages.invalidParams)
    const project = projects.get(hash)
    if (!project) return callback(messages.projectNotFound)

    project.timeKeeping = project.timeKeeping || {}
    let {bannedAddresses: existingAddresses} = project.timeKeeping
    existingAddresses = existingAddresses || []
    
    const changed = addresses.reduce((changed, address) => {
        if (!isStr(address)) return changed
        const index = existingAddresses.indexOf(address)
        const found = index >= 0
        if (ban === true && !found) {
            existingAddresses.push(address)
            console.log('added', address)
            return true
        } else if (ban === false && found) {
            existingAddresses.splice(index, 1)
            return true
        }
        return changed
    }, false)

    if (changed) {
        project.timeKeeping.bannedAddresses = existingAddresses
        projects.set(hash, project)
    }
    callback(null, changed)
    console.log('handleProjectTimeKeepingBan', changed, addresses, ban)
}

export const handleProjectFirstUsedTS = (hash, callback) => {
    if (!isFn(callback)) return
    const project = projects.get(hash)
    if (!project) return callback(messages.projectNotFound)
    project.tsFirstUsed = new Date()
    projects.set(hash, project)
    callback()
}