import { Bond } from 'oo7'
import { fetchProjects, getAll as getUserProjects } from './project'
import { timeKeeping } from './blockchain'
import { getSelected } from './identity'
import DataStorage from '../utils/DataStorage'
import { bytesToHex } from '../utils/convert'
import { mapJoin } from '../utils/utils'

// Only stores projects that not owned by the selected identity
const CACHE_PREFIX = 'totem__cache_timekeeping_projects_'
export const getAll = (forceUpdate = false) => new Promise((resolve, reject) => {
    const { address } = getSelected()
    const cacheStorage = new DataStorage(CACHE_PREFIX + address)
    const invitedProjects = cacheStorage.getAll()
    getUserProjects(forceUpdate).then(userProjects => {
        if (!navigator.onLine || (!forceUpdate && invitedProjects.size > 0)) {
            return resolve(mapJoin(userProjects, invitedProjects))
        }

        timeKeeping.invitation.listByWorker(address).then((hashes = []) => {
            hashes = hashes.map(h => '0x' + bytesToHex(h)).filter(hash => !userProjects.get(hash))
            const promise = fetchProjects(hashes)
            promise.then(invitedProjects => {
                cacheStorage.setAll(invitedProjects)
                resolve(mapJoin(userProjects, invitedProjects))
            })
            promise.catch(reject)
        })
    })
})