import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { getUrlParam as _getUrlParam, isBool, isDefined, isFn } from '../utils/utils'
import storage from './storage'
import { useRxSubject } from './react'

const MODULE_KEY = 'window'
let _forcedLayout = ''
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
export const checkDarkPreferred = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
export const MOBILE = 'mobile'
export const DESKTOP = 'desktop'
export const rxGridColumns = new BehaviorSubject(gridColumns())
export const rxOnline = new BehaviorSubject()
export const rxInverted = new BehaviorSubject(
    [undefined, true].includes(rw().invertedBrowser)
        ? !!checkDarkPreferred()
        : rw().inverted
)
export const rxLayout = new BehaviorSubject(getLayout())
export const rxVisible = new BehaviorSubject(true)
export const gridClasses = [
    '',
    'col-2',
    'col-3',
    'col-4',
    'col-5',
    'col-6',
]

// forceLayout enforces and reverts a specific layout size and ignores layout change when window resizes
//
// Params:
// @size    string: a valid size name listed in `validSizes`. If not valid will set to dynamic layout base on `window.innerWidth` value.
export const forceLayout = size => {
    _forcedLayout = [DESKTOP, MOBILE].includes(size) ? size : ''
    window.onresize()
}

export function getLayout() {
    return _forcedLayout || (window.innerWidth <= 991 ? MOBILE : DESKTOP)
}

/**
 * @name    getUrlParam
 * @summary read parameters of a given URL
 * 
 * @param   {String} name   (optional) if supplied will return a specific paramenter as string.
 *                          Otherwise, will return an object containing all the URL parameters with respective values.
 * @param   {String} url    Default: `window.location.href`
 * 
 * @returns {String|Object}
 */
export const getUrlParam = (name, url = window.location.href) => _getUrlParam(name, url)

// gridColumns read/writes main content grid column count
export function gridColumns(numCol) {
    const value = isDefined(numCol) ? { gridColumns: numCol } : undefined
    value && rxGridColumns.next(numCol)
    return rw(value).gridColumns || 1
}
export const setClass = (selector, obj, retry = true) => {
    const el = document.querySelector(selector)
    if (!el) return retry && setTimeout(() => setClass(selector, obj, false), 100)
    Object.keys(obj).forEach(className => {
        const func = obj[className] ? 'add' : 'remove'
        el.classList[func](className)
    })
}

/**
 * @summary user browser dark more settings
 * 
 * @param {Boolean} useBrowser 
 */
export const setInvertedBrowser = (useBrowser) => {
    if (!isBool(useBrowser)) return rw().invertedBrowser

    const inverted = useBrowser
        ? checkDarkPreferred()
        : rxInverted.value
    rxInverted.next(inverted)
    setTimeout(() => rw({
        invertedBrowser: !!useBrowser,
    }))
    return false
}

/**
 * @name toggleFullscreen
 * @summary fullscreen enters/exits an element into fullscreen mode.
 * @description If the target element is already in fullscreen mode will simply exit fullscreen.
 * If another element is in fullscreen mode, will exit it from fullscreen and enter target into full screen with a 
 * slight delay. If no/invalid selector supplied, will exit any fullscreen element.
 * 
 * @param {String} selector (optional) CSS selector of the target element to toggle fullscreen
 */
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
    toggleFullscreen.lastSelector = el && selector || ''
    return el
}
toggleFullscreen.lastSelector = null

/**
 * @name    useInverted
 * @summary custom React hook that returns a boolean value indicating whether inverted/dark mode is in use
 * 
 * @param   {Boolean|String} reverse whether to reverse the value of inverted
 * 
 * @reutrns {Boolean}
 */
export const useInverted = (reverse = false) => {
    const [inverted] = useRxSubject(rxInverted, inverted => {
        if (!reverse) return inverted
        switch (`${reverse}`) {
            // always reverse the value of inverted
            case 'true':
            case 'always': return !inverted
            // reverse only when inverted
            case 'inverted': return inverted ? !inverted : inverted
            // reverse only when not inverted
            case 'not inverted': return inverted ? inverted : !inverted
            default: return inverted
        }
    })
    return inverted
}
// set layout name on window resize 
window.onresize = () => {
    const layout = getLayout()
    rxLayout.value !== layout && rxLayout.next(layout)
}
window.addEventListener('online', () => rxOnline.next(true))
window.addEventListener('offline', () => rxOnline.next(false))
let ignoredFirstInverted = false
rxInverted.subscribe(inverted => {
    ignoredFirstInverted && rw({
        inverted,
        invertedBrowser: false,
    })
    ignoredFirstInverted = true
    setClass('body', { inverted })
})
rxLayout.subscribe(layout => {
    setClass('body', {
        desktop: layout === DESKTOP,
        mobile: layout === MOBILE,
    })
})
document.addEventListener('visibilitychange', () =>
    rxVisible.next(document.visibilityState === 'visible')
)
rxGridColumns.subscribe(numCol => {
    const el = document.getElementById('main-content')
    if (!el) return
    const next = gridClasses[numCol - 1]
    el.classList.remove('simple-grid', ...gridClasses.filter(c => c && c !== next))
    next && el.classList.add('simple-grid', next)
})
export default {
    checkDarkPreferred,
    MOBILE,
    DESKTOP,
    forceLayout,
    getLayout,
    getUrlParam,
    gridColumns,
    rxGridColumns,
    rxInverted,
    rxLayout,
    rxOnline,
    rxVisible,
    toggleFullscreen,
}