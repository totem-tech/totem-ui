import { Bond } from 'oo7'

const _validSizes = [
    'desktop',
    'mobile',
]
let _forcedSize = ''
// forceLayout enforces and reverts a specific layout size and ignores layout change when window resizes
//
// Params:
// @size    string: a valid size name listed in `validSizes`. If not valid will set to dynamic layout base on `window.innerWidth` value.
export const forceLayout = size => {
    _forcedSize = _validSizes.includes(size) ? size : ''
    window.onresize()
}
window.forceLayout = forceLayout
export const getLayout = () => _forcedSize || (window.innerWidth <= 991 ? 'mobile' : 'desktop')
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