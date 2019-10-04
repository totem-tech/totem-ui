import { isStr, mapSearch } from './utils'

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

const read = (key, isMap = true) => {
    const data = JSON.parse(storage.getItem(key) || '[]')
    return isMap ? new Map(data) : data
}
const write = (key, value, isMap = true) => {
    // invalid key: ignore request
    if (!isStr(key)) return false
    value = isMap ? Array.from(value.entries()) : value
    storage.setItem(key, JSON.stringify(value, null, 4))
}

class DataStorage {
    constructor(filename, disableCache = false, split = false) {
        this.filename = filename
        // whether to disable data cache
        this.disableCache = disableCache
        this.Type = Map
        this.data = disableCache ? new this.Type() : this.getAll()
        // ToDo: @split === true store all ids in a single file and individual values in separate files individually under a separate directory
        // This may help if any file needs larger amount of concurrent operations
    }

    getAll() {
        if (!this.filename) return new this.Type()
        if (this.disableCache) return read(this.filename)
        this.data = this.data || read(this.filename)
        return this.data
    }

    get(key) {
        return this.getAll().get(key)
    }

    set(key, value) {
        const data = this.getAll()
        data.set(key, value)
        if (!this.disableCache) {
            this.data = data
        }
        write(this.filename, data)
    }

    delete(key) {
        const data = this.getAll()
        data.delete(key)
        if (!this.disableCache) {
            this.data = data
        }
        write(this.filename, data)
    }

    search(keyValues, matchExact, matchAll, ignoreCase) {
        return mapSearch(this.getAll(), keyValues, matchExact, matchAll, ignoreCase)
    }
}
export default DataStorage