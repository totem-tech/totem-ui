import React from 'react'
import PropTypes from 'prop-types'
import { Label, Popup } from 'semantic-ui-react'
import { copyToClipboard, isStr, isValidNumber, objWithoutKeys, textEllipsis } from '../utils/utils'
import { translated } from '../services/language'
import { iUseReducer, useRxSubject } from '../services/react'
import { MOBILE, rxLayout } from '../services/window'

const textsCap = translated({
    copiedMsg: 'copied to clipboard',
    copyMsg: 'copy to clipboard',
}, true)[1]

export default function LabelCopy(props) {
    const [state, setState] = iUseReducer(null, {
        copied: false,
        open: undefined,
    })
    let {
        content,
        El,
        ignoreAttributes,
        maxLength,
        numDots,
        split,
        style,
        value,
    } = props
    try {
        value = isStr(value) ? value : JSON.stringify(value)
    } catch (e) {
        // catch circular objects
        value = ''
    }
    if (!content && content !== null) {
        maxLength = isValidNumber(maxLength)
            ? maxLength
            : maxLength === null
                ? value.length
                : useRxSubject(rxLayout, l => l !== MOBILE ? 20 : 13)[0]
    }
    
    const icon = props.icon || {
        className: 'no-margin',
        name: state.copied ? 'check' : 'copy outline',
        style: { paddingRight: 5 }
    }

    const el = (
        <El {...{
            ...objWithoutKeys(props, ignoreAttributes),
            content: content === null || content
                ? content
                : textEllipsis(value, maxLength, numDots, split),
            icon,
            key: 'El',
            onClick: () => {
                copyToClipboard(value)
                setState({ copied: true, open: true, })

                setTimeout(() => {
                    setState({ copied: false, open: false })
                }, 1000)
            },
            onMouseEnter: () => setState({ open: true }),
            onMouseLeave: () => setState({ open: false}),
            style: {
                whiteSpace: 'nowrap',
                ...style,
            }
        }} />
    ) 
    return (
        <Popup {...{
            content: state.copied
                ? textsCap.copiedMsg
                : textsCap.copyMsg,
            key: 'popup',
            eventsEnabled: false,
            hideOnScroll: true,
            open: state.open,
            size: 'mini',
            trigger: el,
        }} />
    )
}
LabelCopy.propTypes = {
    // @content if not supplied and @maxLength is not `null` will be shortened
    content: PropTypes.any,
    El: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.string,
    ]).isRequired,
    // @ignoreAttributes attributes to not pass on to the element
    ignoreAttributes: PropTypes.array.isRequired,
    // @maxLength if `null`, text will not be shortened.
    // Otherwise, if falsy, will use 20 for desktop and 13 for mobile
    maxLength: PropTypes.number,
    // @numDots number of dots to use when shortening the value.
    // Deafult: 3
    numDots: PropTypes.number,
    split: PropTypes.bool,
    value: PropTypes.any.isRequired,
}
LabelCopy.defaultProps = {
    className: 'clickable',
    El: Label,
    // icon: {
    //     className: 'no-margin',
    //     name: 'copy outline',
    //     style: { paddingRight: 5 }
    // },
    ignoreAttributes: [
        'El',
        'ignoreAttributes',
        'maxLength',
        'numDots',
        'split',
        'value',
    ],
}