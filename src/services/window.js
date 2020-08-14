import { Subject } from 'rxjs'
import { Bond } from 'oo7'
import { isDefined, isFn } from '../utils/utils'
import storage from './storage'

const MODULE_KEY = 'window'
let _forcedSize = ''
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
export const MOBILE = 'mobile'
export const DESKTOP = 'desktop'
export const gridColumnsBond = new Bond().defaultTo(gridColumns())
export const layoutBond = new Bond().defaultTo(getLayout())
export const rxOnline = new Subject()

// forceLayout enforces and reverts a specific layout size and ignores layout change when window resizes
//
// Params:
// @size    string: a valid size name listed in `validSizes`. If not valid will set to dynamic layout base on `window.innerWidth` value.
export const forceLayout = size => {
    _forcedSize = [DESKTOP, MOBILE].includes(size) ? size : ''
    window.onresize()
}

// fullscreen enters/exits an element into fullscreen mode.
// If the target element is already in fullscreen mode will simply exit fullscreen.
// If another element is in fullscreen mode, will exit it from fullscreen 
// and enter target into full screen with a slight delay.
// If no/invalid selector supplied, will exit any fullscreen element.
//
// Params:
// @selector    string: (optional) CSS selector of the target element to toggle fullscreen
export const toggleFullscreen = (selector) => {
    // target element to toggle fullscreen
    const el = document.querySelector(selector) || {}
    var fsEl = document.fullscreenElement
        || document.webkitFullscreenElement
        || document.mozFullScreenElement
        || document.msFullscreenElement
    const isFS = isDefined(fsEl)

    // function to exit fullscreen
    const exitFS = document.exitFullscreen
        || document.mozCancelFullScreen
        || document.webkitExitFullscreen
        || document.msExitFullscreen

    // exit if already in fullscreen mode
    if (isFS) {
        exitFS.call(document)
        // target element has just been toggled 
        if (fsEl === el) return
    }

    // function to enter fullscreen
    const goFS = el.requestFullscreen
        || el.mozRequestFullScreen /* Firefox */
        || el.webkitRequestFullscreen /* Chrome, Safari, Brave & Opera */
        || el.msRequestFullscreen /* IE/Edge */


    isFn(goFS) && setTimeout(() => goFS.call(el), isFS ? 50 : 0)
}

export function getLayout() {
    return _forcedSize || (window.innerWidth <= 991 ? MOBILE : DESKTOP)
}

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

// gridColumns read/writes main content grid column count
export function gridColumns(numCol) {
    const value = isDefined(numCol) ? { gridColumns: numCol } : undefined
    value && gridColumnsBond.changed(numCol)
    return rw(value).gridColumns || 1
}

// set layout name on window resize 
window.onresize = () => layoutBond.changed(getLayout())
window.addEventListener('online', () => rxOnline.next(true))
window.addEventListener('offline', () => rxOnline.next(false))

export default {
    MOBILE,
    DESKTOP,
    gridColumnsBond,
    layoutBond,
    forceLayout,
    toggleFullscreen,
    getLayout,
    getUrlParam,
    gridColumns,
}