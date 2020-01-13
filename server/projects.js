import DataStorage from '../src/utils/DataStorage'
import { isArr, isBool, isDefined, isFn, isObj, isStr, isValidNumber, objCopy, objClean } from '../src/utils/utils'
import { getUserByClientId, idExists, userClientIds } from './users'
const projects = new DataStorage('projects.json', true)
// Must-have properties
const requiredKeys = ['name', 'ownerAddress', 'description']
// All the acceptable properties
const validKeys = [...requiredKeys]
const STATUS_CODES = [
    0,   // open
    100, // reopen
    200, // on-hold
    300, // abandon
    400, // cancel
    500, // close
    999, // delete
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
    invitationNotFound: 'invitation not found',
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
    if (!isObj(project)) return callback(
        !!existingProject ? null : messages.projectNotFound,
        existingProject
    )

    const user = getUserByClientId(client.id)
    if (!user) return callback(messages.loginRequired)
    const { userId } = existingProject || {}
    if (!create && isDefined(userId) && user.id !== userId) return (messages.accessDenied)

    // check if project contains all the required properties
    const invalid = !hash || !project || requiredKeys.reduce((invalid, key) => invalid || !project[key], false)
    if (invalid) return callback(messages.projectInvalidKeys)
    if (project.description.length > descMaxLen) return callback(messages.invalidDescMaxLen)
    // exclude any unwanted data and only update the properties that's supplied
    project = { ...existingProject, ...objClean(project, validKeys) }
    project.tsCreated = project.createdAt || new Date()
    if (create) {
        project.userId = user.id
    }

    // Add/update project
    projects.set(hash, project)
    callback(null)
    console.log(`Project ${create ? 'created' : 'updated'}: ${hash} `)
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