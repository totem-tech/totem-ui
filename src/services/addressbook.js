import { Bond } from 'oo7'
import { runtime, pretty } from 'oo7-substrate'
const LOCAL_STORAGE_KEY = 'totem_addressbook'
const bond = new Bond()

const _save = entries => localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(entries || [])
) | updateBond()

// const _processAddress = (name, address) => {
//     const bond = new Bond()
//     bond.changed(address)
//     const lookup = runtime.indices.ss58Decode(bond).map(x => ({
//         address: x ? pretty(x) : address,
//         short: !x ? '' : address
//     }))
//     const notifyId = lookup.notify(()=> {
//         const value = lookup._value
//         const adrs = getAll()
//         const index = getIndex(name, address, adrs)
//         console.log('processaddress', value)
//         updateByIndex(index, name, value.address, value.short)
//         lookup.unnotify(notifyId)
//     })
// }

export const add = (name, address, short, tags) => {
    if (!name || !address) return;
    const adrs = getAll()
    // prevent adding multiple items with same name
    if (getIndex(name, address, adrs) >= 0) return;
    _save(adrs.concat([{
        address: pretty(address),
        name, 
        tags: tags || []
    }]))
    // _processAddress(name, address)
}

export const getAll = () => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]')

export const getByAddress = (address, _addresses) => (_addresses || getAll()).find(item => item.address === address)

export const getByName = (name, _addresses) => (_addresses || getAll()).find(item => item.name === name)

// returns array
export const getByTag = (tag, _addresses) => (_addresses || getAll()).filter(item => (item.tags || []).indexOf(tag.toLowerCase()) >= 0)

export const getIndex = (name, address, _addresses) => (_addresses || getAll())
    .findIndex(item => item.name === name && item.address === address)

export const remove = (name, address) => {
    const addresses = getAll()
    const index = getIndex(name, address, addresses)
    index >= 0 && removeByIndex(index, addresses)
}

export const removeByIndex = (index, _addresses) => {
    _addresses = _addresses || getAll()
    _addresses.splice(index, 1)
    _save(_addresses)
}

export const updateByIndex = (index, name, address, short) => {
    const addrs = getAll()
    if (index >= 0) {
        addrs[index].name = name
        addrs[index].address = address
        addrs[index].short = short
    }
}

const updateBond = () => bond.changed(getAll())
updateBond()

const addressbook = {
    add,
    getAll,
    getBond: ()=> bond,
    getByAddress,
    getByName,
    getByTag,
    getIndex,
    remove,
    removeByIndex
}

export default addressbook