import React from 'react'
import PropTypes from 'prop-types'
import { Label } from 'semantic-ui-react'
import { copyToClipboard, isStr, isValidNumber, objWithoutKeys, textEllipsis } from '../utils/utils'
import { translated } from '../services/language'
import { setToast } from '../services/toast'
import { useRxSubject } from '../services/react'
import { MOBILE, rxLayout } from '../services/window'

const textsCap = translated({
    copiedMsg: 'copied to clipboard:'
}, true)[1]

export default function LabelCopy(props) {
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
    
    return (
        <El {...{
            ...objWithoutKeys(props, ignoreAttributes),
            content: content === null || content
                ? content
                : textEllipsis(value, maxLength, numDots, split),
            onClick: () => {
                copyToClipboard(value)
                setToast({
                    content: `${textsCap.copiedMsg} ${value}`,
                    status: 'success',
                    style: { overflowX: 'hidden' },
                }, 1000, value)
            },
            style: {
                whiteSpace: 'nowrap',
                ...style,
            }
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
    icon: {
        className: 'no-margin',
        name: 'copy outline',
        style: { paddingRight: 5 }
    },
    ignoreAttributes: [
        'El',
        'ignoreAttributes',
        'maxLength',
        'numDots',
        'split',
        'value',
    ],
}