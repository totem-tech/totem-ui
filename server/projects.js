import DataStorage from '../src/utils/DataStorage'
import { isArr, isBool, isDefined, isFn, isObj, isStr, isValidNumber, objCopy, objClean } from '../src/utils/utils'
import { getUserByClientId, idExists, userClientIds } from './users'
const projects = new DataStorage('projects.json', true)
// Must-have properties
const requiredKeys = ['name', 'ownerAddress', 'description']
// All the acceptable properties
const validKeys = [...requiredKeys, 'status']
const STATUS_CODES = [
    0, // open
    1, // reopened
    2, // closed
    9, //deleted
]
// Internally managed keys : ['tsCreated', 'tsFirstUsed']
const descMaxLen = 160
const messages = {
    accessDenied: 'Access denied',
    arrayRequired: 'Array required',
    exists: 'Project already exists. Please use a different owner address, name and/or description to create a new project',
    invalidDescMaxLen: `Project description must not exceed ${descMaxLen} characters`,
    invalidParams: 'Invalid parameters supplied',
    invalidStatusCode: `Invalid project status codes supplied. Acceptable codes: ${STATUS_CODES.join()}`,
    invalidUserIds: 'Invalid user ID(s) supplied',
    loginRequired: 'You must be logged in to perform this action',
    projectInvalidKeys: `Project must contain all of the following properties: ${requiredKeys.join()} and an unique hash`,
    projectNotFound: 'Project not found',
}

// Create/get/update project
export function handleProject(hash, project, create, callback) {
    const client = this
    if (!isFn(callback)) return;
    const existingProject = projects.get(hash)
    if (create && !!existingProject) {
        return callback(messages.exists)
    }

    // return existing project
    if (!isObj(project)) return callback(null, existingProject)

    const user = getUserByClientId(client.id)
    if (!user) return callback(messages.loginRequired)
    const {userId} = existingProject || {}
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

// Set project first time used timestamp, if not already set
//
// Params:
// @hash     string: project hash
// @callback function
export const handleProjectFirstUsedTS = (hash, callback) => {
    if (!isFn(callback)) return
    const project = projects.get(hash)
    if (!project) return callback(messages.projectNotFound)
    project.tsFirstUsed = new Date()
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
    if (!isArr(hashArr) || hashArr.length === 0) return callback(messages.arrayRequired)
    const hashesNotFound = new Array()
    // Find all projects by supplied hash and return Map
    const result = hashArr.reduce((res, hash) => {
        const project = projects.get(hash)
        !!project ? res.set(hash, project) : hashesNotFound.push(hash)
        return res
    }, new Map())
    callback(null, result, hashesNotFound)
}

// Search for projects
//
// Params:
// @keyword     string : search keyword(s), if keyword is a project hash (starts with '0x') will return the project with the hash.
//                       Otherwise, keyword will be matched against name, description and ownerAddress
// @callback    function: params: @error string, @result Map
export const handleProjectsSearch = (keyword, callback) => {
    if (!isFn(callback)) return
    if (!keyword) return callback(null, new Map())
    const projectByHash = isStr(keyword) && keyword.startsWith('0x') ? projects.get(keyword) : null
    if (projectByHash) {
        // if supplied keyword is a hash
        return callback(null, new Map([[keyword, projectByHash]]))
    }

    const keyValues = isObj(keyword) ? objClean(keyword, validKeys) : {
        name: keyword,
        description: keyword,
        ownerAddress: keyword
    }

    callback(null, projects.search(keyValues, false, false, true))
}

// Update project status
//
// Params:
// @hash        string: project hash
// @status      number: a valid project status code
// @callback    function: params: @error string
export const handleProjectStatus = (hash, status, callback) => {
    if (!isFn(callback)) return;
    const project = projects.get(hash)
    if (!project) return callback(messages.projectNotFound);
    if (STATUS_CODES.indexOf(status) === -1) return callback(messages.invalidStatusCode)
    console.log('Project status updated: ', hash, project.status, '>>', status)
    project.status = status
    projects.set(hash, project)
    callback()
}

// projectTimeKeepingBan bans or un-bans a userId or address from any time keeping activities
//
// Params:
// @hash        string  : project hash
// @addresses   array   : User ID to ban
// @ban         boolean : whether to ban or unban user/address
// @callback    function: params: @error string, @changed boolean
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
}

/*
 * Time keeping specific functions
 */ 
// projectTimeKeepingInvite 
export function projectTimeKeepingInvite(notificationId, senderId, userIds, {projectHash}) {
    const project = projects.get(projectHash)
    if (!project) return messages.projectNotFound
    // Only allow project owner to send invitations to time keeping
    if (project.userId && project.userId !== senderId) return messages.accessDenied

    const invalidIds = userIds.filter(userId => !idExists(userId))
    if (invalidIds.length > 0) return `${messages.invalidUserIds}: ${invalidIds.join(', ')}`

    const timeKeeping = project.timeKeeping || {}
    timeKeeping.invitations = (timeKeeping.invitations || {})
    userIds.forEach(userId => {
        if (timeKeeping.invitations[userId]) return;
        timeKeeping.invitations[userId] = {
            accepted: false,
            notificationId,
            tsAccepted: undefined,
            tsInvited: new Date(),
        }
    }),
    project.timeKeeping = timeKeeping
    projects.set(projectHash, project)
}