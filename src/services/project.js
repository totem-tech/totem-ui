import DataStorage from '../utils/DataStorage'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { runtime } from 'oo7-substrate'
import { getSelected, selectedAddressBond } from './identity'
import { project, timeKeeping } from './blockchain'
import client from './ChatClient'
import { bytesToHex } from '../utils/convert'
import { arrUnique, isBond, isUint8Arr } from '../utils/utils'

const CACHE_PREFIX = 'totem__cache_projects_'
let address;
export const userProjectsBond = new Bond()
export const timeKeepingProjectsBond = new Bond()

// retrieve full project details by hashes
export const fetchProjects = (projectHashesOrBond) => new Promise((resolve, reject) => {
    try {
        const process = projectHashes => {
            const uniqueHashes = arrUnique(projectHashes.flat().map(hash => {
                return isUint8Arr(hash) ? '0x' + bytesToHex(hash) : hash
            }))
            if (uniqueHashes.length === 0) return resolve(new Map())
            client.projectsByHashes(uniqueHashes, (_, projects = new Map(), unknownHashes = []) => {
                unknownHashes.forEach(hash => projects.set(hash, {}))
                resolve(projects)
            })
        }
        isBond(projectHashesOrBond) ? projectHashesOrBond.then(process) : process(projectHashesOrBond)
    } catch (err) {
        reject(err)
    }
})

// getProjects owned by selected identity
export const getAll = (forceUpdate = false) => new Promise((resolve, reject) => {
    address = getSelected().address
    const key = CACHE_PREFIX + address
    const projectsStorage = new DataStorage(key, true)
    const projectsCache = projectsStorage.getAll()
    if (!navigator.onLine || (!forceUpdate && projectsCache.size > 0)) return resolve(projectsCache)
    const promise = fetchProjects(project.listByOwner(address))
    promise.then(projects => {
        projectsStorage.setAll(projects)
        resolve(projects)
    })
    promise.catch(reject)
})