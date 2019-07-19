import { Bond } from 'oo7'
import { pretty } from 'oo7-substrate'
import storageService from './storage'

const bond = new Bond()
const _save = entries => storageService.addressbook(entries) | bond.changed(entries)

export const add = (name, address, tags, type, visibility) => {
    if (!name || !address) return;
    const addresses = getAll()
    // prevent adding multiple items with same name
    if (getIndex(name, address, addresses) >= 0) return;
    _save(addresses.concat([{
        address: pretty(address),
        name, 
        tags: tags || [],
        type,
        visibility,
        isPublic: false
    }]))
}

export const getAll = () => storageService.addressbook()

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

export const updateByIndex = (index, name, address, tags, type, visibility) => {
    const addresses = getAll()
    if (index >= 0) {
        addresses[index].name = name
        addresses[index].address = address
        addresses[index].tags = tags
        addresses[index].type = type
        addresses[index].visibility = visibility
    }
    _save(addresses)
}

// Set partner as public
export const setPublic = (index, isPublic) => {
    const addresses = getAll()
    if (index < 0 || index >= addresses.length) return;
    addresses[index].isPublic = isPublic
    _save(addresses)
}

const addressbook = {
    add,
    getAll,
    getBond: ()=> bond,
    getByAddress,
    getByName,
    getByTag,
    getIndex,
    remove,
    removeByIndex,
    setPublic,
    updateByIndex
}
// Pre-load addressbook into bond
bond.changed(getAll())
export default addressbook