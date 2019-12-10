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
export const getLayout = () => _forcedSize || (window.innerWidth <= 991 ? 'mobile' : 'desktop')
export const layoutBond = new Bond().defaultTo(getLayout())

window.onresize = () => {
    const size = getLayout()
    if (layoutBond._value !== size) layoutBond.changed(size)
}
