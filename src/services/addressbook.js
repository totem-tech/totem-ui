import { Bond } from 'oo7'
const LOCAL_STORAGE_KEY = 'totem_addressbook'
const bond = new Bond()

export const add = (name, address, tags) => name && address && _save(getAll().concat([{
    name, 
    address,
    tags: tags || []
}]))

export const getAll = () => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]')

export const getByTag = tag => getAll().filter(item => (item.tags || []).indexOf(tag.toLowerCase()) >= 0)

export const getIndex = (name, address, _addresses) => (_addresses || getAll())
    .findIndex(item => item.name === name && item.address === address)

export const remove = (name, address) => {
    const addresses = getAll()
    removeByIndex(getIndex(name, address, addresses), addresses)
}

export const removeByIndex = (index, _addresses) => {
    _addresses = _addresses || getAll()
    _addresses.splice(index, 1)
    _save(_addresses)
}

const _save = addresses => localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(addresses || [])
) | updateBond()

const updateBond = () => bond.changed(getAll())
updateBond()

const addressbook = {
    add,
    getAll,
    getByTag,
    getIndex,
    remove,
    removeByIndex,
    bond
}

export default addressbook