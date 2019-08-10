// IN-PROGRESS. NOT YET READY TO USE
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
        loadOnDemand: false,
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

export const getAll = configKey => {
    const item = config[configKey]
    if (item && !item.loadOnDemand) return new Promise((resolve) => resolve(item.data, configKey));
    return filePromise(configKey)
}

export const getItem = (configKey, key) => new Promise((resolve, reject) => {
    getAll(configKey)
    .then(data => resolve(data.get(key)))
    .catch(reject)
})

export const search = (configKey, keyValues, matchExact, matchAll, ignoreCase) => new Promise((resolve, reject) => {
    getAll(configKey)
    .then(data => resolve(mapSearch(data, keyValues, matchExact, matchAll, ignoreCase)))
    .catch(reject)
})

export const setItem = (configKey, key, value) => new Promise((resolve, reject) => {
    const item = config[configKey]
    getAll(configKey)
    .then(data => {
        data.set(key, value) 
        if (!item.loadOnDemand) {
            item.data = data
        }
        saveMapToFile(item.path, data).then(resolve).catch(reject)
    })
    .catch(reject)
})

export const removeItem = (configKey, key) => new Promise((resolve, reject) => {
    const item = config[configKey]
    getAll(configKey)
    .then(data => {
        data.delete(key) 
        if (!item.loadOnDemand) {
            item.data = data
        }
        saveMapToFile(item.path, data).then(resolve).catch(reject)
    })
    .catch(reject)
})

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
            if (!err) return resolve();
            console.log(`Failed to save ${filepath}. ${err}`)
            reject(err)
        }
	)
})

export const filePromise = configkey => new Promise((resolve, reject) => {
    const item = config[configkey]
    if (!item) return reject('Invalid config key');
    return fs.readFile(item.path, 'utf8', (err, data) => {
        if(!!err) {
            console.log(item.path, 'file does not exist. Creating new file.')
            setTimeout(()=> saveMapToFile(item.path, new Map()))
        } else if(!item.loadOnDemand) {
            item.data = new Map(JSON.parse(data || '[]'))
        }
        resolve(data, configkey)
    })
})

export const loadFiles = (configKeys)=> {
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