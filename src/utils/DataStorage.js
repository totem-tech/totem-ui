import { mapSearch } from './utils'

let storage;
try {
    // Use browser localStorage if available
    storage = localStorage
} catch (e) {
    // for node server
    const nls = require('node-localstorage')
    const STORAGE_PATH = process.env.STORAGE_PATH || './server/data'
    storage = new nls.LocalStorage(STORAGE_PATH)
}

const load = (key, isMap = true) => {
    const data = JSON.parse(storage.getItem(key) || '[]')
    return isMap ? new Map(data) : data
}
const save = (key, value, isMap = true) => {
    value = isMap ? Array.from(value.entries()) : value
    storage.setItem(key, JSON.stringify(value, null, 4))
}

class DataStorage {
    constructor(filename, loadOnDemand = false) {
        this.filename = filename
        // whether to disable data cache
        this.loadOnDemand = loadOnDemand
        // this.Type = Map
        if (loadOnDemand) return
        this.data = this.getAll()
    }

    getAll() {
        if (!this.filename) return new this.Type()
        if (this.loadOnDemand) return load(this.filename)
        this.data = this.data || load(this.filename)
        return this.data
    }

    get(key) {
        return this.getAll().get(key)
    }

    set(key, value) {
        const data = this.getAll()
        data.set(key, value)
        if (!this.loadOnDemand) {
            this.data = data
        }
        save(this.filename, data)
    }

    delete(key) {
        const data = this.getAll()
        data.delete(key)
        if (!this.loadOnDemand) {
            this.data = data
        }
        save(this.filename, data)
    }

    search(keyValues, matchExact, matchAll, ignoreCase) {
        return mapSearch(this.getAll(), keyValues, matchExact, matchAll, ignoreCase)
    }
}
export default DataStorage

// const config = {
//     users: {
//         path: './server/data/users.json',
//         data: new Map(),
//         loadOnDemand: false,
//     },
//     faucetRequests: {
//         path: './server/data/faucet-requests.json',
//         data: new Map(),
//         loadOnDemand: true,
//     },
//     projects: {
//         path: './server/data/projects.json',
//         data: new Map(),
//         loadOnDemand: false,
//     },
//     companies: {
//         path: './server/data/companies.json',
//         data: new Map(),
//         loadOnDemand: false,
//     },
// }
// // ToDo: save file if not exists
// export const getAll = configKey => {
//     const item = config[configKey]
//     if (item && (item.loadOnDemand || item.data === null)) return filePromise(configKey);
//     return new Promise((resolve, reject) => {
//         if (!item) return reject('Invalid config key supplied');
//         resolve(item.data)
//     })

// }

// export const getItem = (configKey, key) => getAll(configKey).then(data => data.get(key)).catch(err => err)

// export const search = (configKey, keyValues, matchExact, matchAll, ignoreCase) => getAll(configKey).then(
//     data => mapSearch(data, keyValues, matchExact, matchAll, ignoreCase)
// ).catch(err => err)

// export const setItem = (configKey, key, value) => getAll(configKey).then(data => {
//     const item = config[configKey]
//     data.set(key, value)
//     if (!item.loadOnDemand) {
//         item.data = data
//     }
//     return saveMapToFile(item.path, data)
// }).catch(err => err)

// export const removeItem = (configKey, key) => getAll(configKey).then(data => {
//     const item = config[configKey]
//     data.delete(key)
//     if (!item.loadOnDemand) {
//         item.data = data
//     }
//     return saveMapToFile(item.path, data)
// }).catch(err => err)

// const saveMapToFile = (filepath, map) => new Promise((resolve, reject) => {
//     if (!isStr(filepath)) {
//         const err = 'Invalid file path ' + filepath
//         console.log(err)
//         return reject(err)
//     }
//     fs.writeFile(
//         filepath,
//         JSON.stringify(Array.from(map.entries())),
//         { flag: 'w' },
//         err => {
//             if (!err) return resolve(map);
//             console.log(`Failed to save ${filepath}. ${err}`)
//             reject(err)
//         }
//     )
// })

// export const filePromise = configKey => new Promise((resolve, reject) => {
//     const item = config[configKey]
//     if (!item) return reject('Invalid config key');
//     fs.readFile(item.path, { encoding: 'utf8' }, (err, data) => {
//         data = new Map(JSON.parse(data || '[]'))
//         if (!!err) {
//             console.log(item.path, 'file does not exist. Creating new file.')
//             return saveMapToFile(item.path, new Map())
//         } else if (!item.loadOnDemand) {
//             item.data = data
//         }
//         resolve(data)
//     })
// })

// export const loadFiles = (configKeys) => {
//     const keys = configKeys || Object.keys(config).filter(key => !config[key].loadOnDemand)
//     return Promise.all(keys.map(filePromise))
// }