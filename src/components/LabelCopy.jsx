import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import { Popup } from 'semantic-ui-react'
import { copyToClipboard, deferred, isFn, isStr, isValidNumber, objWithoutKeys, textEllipsis } from '../utils/utils'
import { translated } from '../services/language'
import { iUseReducer, useRxSubject } from '../services/react'
import { MOBILE, rxLayout } from '../services/window'
import Invertible from './Invertible'
import Label from './Label'

const textsCap = translated({
    copiedMsg: 'copied to clipboard',
    copyMsg: 'copy to clipboard',
}, true)[1]

function LabelCopy(props) {
    const [state, setState] = iUseReducer(null, {
        copied: false,
        open: undefined,
    })
    const closeDeferred = useCallback(deferred(
        () => setState({ copied: false, open: false }),
        1000,
    ), [setState])
    let {
        content,
        El,
        ignoreAttributes,
        maxLength,
        numDots,
        onClick,
        split,
        style,
        value,
    } = props
    try {
        value = isStr(value)
            ? value
            : JSON.stringify(value)
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
        name: state.copied
            ? 'check'
            : 'copy outline',
        style: {
            paddingRight: content === null
                ? 0
                : 5
        }
    }

    const trigger = (
        <El {...{
            ...objWithoutKeys(props, ignoreAttributes),
            content: (
                <span>
                    {content === null || content
                        ? content
                        : textEllipsis(
                            value,
                            maxLength,
                            numDots,
                            split,
                            )}
                </span>
            ),
            icon,
            key: 'El',
            draggable: true,
            onDragStart: e => {
                e.stopPropagation()
                e.dataTransfer.setData('Text', value)
            },
            onClick: e => {
                e.preventDefault()
                isFn(onClick) && onClick(e, value)
                copyToClipboard(value)
                setState({ copied: true, open: true })
                closeDeferred()
            },
            onMouseEnter: () => setState({ open: true }),
            onMouseLeave: () => setState({ open: false }),
            style: {
                whiteSpace: 'nowrap',
                ...style,
            }
        }} />
    )
    
    return (
        <Invertible {...{
            content: state.copied
                ? textsCap.copiedMsg
                : textsCap.copyMsg,
            El: Popup,
            key: 'popup',
            eventsEnabled: false,
            hideOnScroll: true,
            open: state.open,
            size: 'mini',
            trigger,
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
    onClick: PropTypes.func,
    split: PropTypes.bool,
    value: PropTypes.any.isRequired,
}
LabelCopy.defaultProps = {
    className: 'clickable',
    El: Label,
    ignoreAttributes: [
        'El',
        'ignoreAttributes',
        'maxLength',
        'numDots',
        'split',
        'value',
    ],
}
export default React.memo(LabelCopy)