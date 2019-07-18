import { isDefined, isValidNumber } from '../components/utils'
const PREFIX = 'totem_'
const storage = {}
export const getItem = key => JSON.parse(localStorage.getItem(PREFIX + key))
export const setItem = (key, value) => localStorage.setItem(PREFIX + key, JSON.stringify(value))

storage.walletIndex = index => {
    const key = 'wallet-index'
    return isDefined(index) && isValidNumber(index) ? setItem(key, index) : getItem(key) || 0
}

export default storage