import { Bond } from 'oo7'
import { isDefined } from '../utils/utils'
import storage from './storage'

const MODULE_KEY = 'window'
let _forcedSize = ''
export const MOBILE = 'mobile'
export const DESKTOP = 'desktop'
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// forceLayout enforces and reverts a specific layout size and ignores layout change when window resizes
//
// Params:
// @size    string: a valid size name listed in `validSizes`. If not valid will set to dynamic layout base on `window.innerWidth` value.
export const forceLayout = size => {
    _forcedSize = [DESKTOP, MOBILE].includes(size) ? size : ''
    window.onresize()
}
window.forceLayout = forceLayout
export const getLayout = () => _forcedSize || (window.innerWidth <= 991 ? MOBILE : DESKTOP)
export const layoutBond = new Bond().defaultTo(getLayout())

// getUrlParam reads the URL parameters
//
// Params:
// @name    string: (optional) if supplied will return a specific paramenter as string.
//                  Otherwise, will return an object containing all the URL parameters with respective values.
//
// returns  string/object
export const getUrlParam = name => {
    const params = {}
    const regex = /[?&]+([^=&]+)=([^&]*)/gi
    window.location.href.replace(regex, (_, key, value) => params[key] = value)
    return name ? params[name] || '' : params
}

// Main content grid column count
export const gridColumns = numCol => {
    const value = isDefined(numCol) ? { gridColumns: numCol } : undefined
    value && gridColumnsBond.changed(numCol)
    return rw(value).gridColumns || 1
}
export const gridColumnsBond = new Bond().defaultTo(gridColumns())

// set layout name on window resize 
window.onresize = () => {
    const size = getLayout()
    if (layoutBond._value !== size) layoutBond.changed(size)
}

export default {
    forceLayout,
    getLayout,
    getUrlParam,
    layoutBond,
}