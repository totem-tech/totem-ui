// IN-PROGRESS. NOT YET READY TO USE
// TODO: OOP implementation, use node-localstorage instead of json files????
import fs from 'fs'
import { isStr, mapSearch } from '../src/utils/utils'

const config = {
    users: {
        path: './server/data/users.json',
        data: new Map(),
        loadOnDemand: false,
    },
    faucetRequests: {
        path: './server/data/faucet-requests.json',
        data: new Map(),
        loadOnDemand: true,
    },
    projects: {
        path: './server/data/projects.json',
        data: new Map(),
        loadOnDemand: false,
    },
    companies: {
        path: './server/data/companies.json',
        data: new Map(),
        loadOnDemand: false,
    },
}
// ToDo: save file if not exists
export const getAll = configKey => {
    const item = config[configKey]
    if (item && (item.loadOnDemand || item.data === null)) return filePromise(configKey);
    return new Promise((resolve, reject) => {
        if (!item) return reject('Invalid config key supplied');
        resolve(item.data)
    })

}

export const getItem = (configKey, key) => getAll(configKey).then(data => data.get(key)).catch(err => err)

export const search = (configKey, keyValues, matchExact, matchAll, ignoreCase) => getAll(configKey).then(
    data => mapSearch(data, keyValues, matchExact, matchAll, ignoreCase)
).catch(err => err)

export const setItem = (configKey, key, value) => getAll(configKey).then(data => {
    const item = config[configKey]
    data.set(key, value)
    if (!item.loadOnDemand) {
        item.data = data
    }
    return saveMapToFile(item.path, data)
}).catch(err => err)

export const removeItem = (configKey, key) => getAll(configKey).then(data => {
    const item = config[configKey]
    data.delete(key)
    if (!item.loadOnDemand) {
        item.data = data
    }
    return saveMapToFile(item.path, data)
}).catch(err => err)

const saveMapToFile = (filepath, map) => new Promise((resolve, reject) => {
    if (!isStr(filepath)) {
        const err = 'Invalid file path ' + filepath
        console.log(err)
        return reject(err)
    }
    fs.writeFile(
        filepath,
        JSON.stringify(Array.from(map.entries())),
        { flag: 'w' },
        err => {
            if (!err) return resolve(map);
            console.log(`Failed to save ${filepath}. ${err}`)
            reject(err)
        }
    )
})

export const filePromise = configKey => new Promise((resolve, reject) => {
    const item = config[configKey]
    if (!item) return reject('Invalid config key');
    fs.readFile(item.path, { encoding: 'utf8' }, (err, data) => {
        data = new Map(JSON.parse(data || '[]'))
        if (!!err) {
            console.log(item.path, 'file does not exist. Creating new file.')
            return saveMapToFile(item.path, new Map())
        } else if (!item.loadOnDemand) {
            item.data = data
        }
        resolve(data)
    })
})

export const loadFiles = (configKeys) => {
    const keys = configKeys || Object.keys(config).filter(key => !config[key].loadOnDemand)
    return Promise.all(keys.map(filePromise))
}

// // load all files required
// var promises = [
// 	{type: 'companies', path: companiesFile, saveFn: saveCompanies},
// 	{type: 'faucetRequests', path: faucetRequestsFile, saveFn: saveFaucetRequests},
// 	{type: 'projects', path: projectsFile, saveFn: saveProjects},
// 	{type: 'users', path: usersFile, saveFn: saveUsers},
// ].map(item => new Promise((resolve, reject) => {
// 	const { type, path, saveFn } = item
// 	if (!isStr(path)) return console.log('Invalid file path', path);
// 	console.info('Reading file', path)
// 	return fs.readFile(path, 'utf8', (err, data) => {
// 		// Create empty file if does already not exists 
// 		if(!!err) {
// 			console.log(path, 'file does not exist. Creating new file.')
// 			setTimeout(saveFn)
// 		} else {
// 			const map = new Map(JSON.parse(data || '[]'))
// 			switch(type) {
// 				case 'companies':
// 					companies = map
// 					break
// 				case 'faucetRequests':
// 					faucetRequests = map
// 					break
// 				case 'projects':
// 					projects = map
// 					break
// 				case 'users':
// 					users = map
// 					break
// 			}
// 		}
// 		resolve(true)
// 	})
// }))
// // Start chat server
// Promise.all(promises).then(function(results){
// 	server.listen(wsPort, () => console.log('\nChat app https Websocket listening on port ', wsPort))
// }).catch(err=> err && console.log('Promise error:', err)) 