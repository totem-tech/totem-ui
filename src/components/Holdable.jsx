import React, { useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import { isFn, objWithoutKeys } from '../utils/utils'

function Holdable(props) {
    let {
        duration,
        El,
        ignoreAttributes,
        onClick,
        onHold,
        onMouseDown,
        onMouseLeave,
        onMouseUp,
        onTouchEnd,
        onTouchStart,
    } = props
    El = React.memo(El)
    const [state] = useState(() => ({
        allowClick: true,
        timeoutId: null,
    }))
    const clearTimerCb = useCallback(callback => (...args) => {
        isFn(callback) && callback(...args)
        clearTimeout(state.timeoutId)
    })
    const startTimeCb = useCallback(callback => (...args) => {
        args[0].persist()
        state.allowClick = true
        isFn(callback) && callback(...args)
        state.timeoutId = setTimeout(() => {
            state.allowClick = false
            onHold(...args)
        }, duration)
    }, [state, duration])
    const touchable = 'ontouchstart' in document.documentElement
    const eventHandlers = isFn(onHold) && {
        onClick: (...args) => state.allowClick
            && isFn(onClick)
            && onClick(...args),
        ...!touchable
            ? {
                onMouseDown: startTimeCb(onMouseDown),
                onMouseLeave: clearTimerCb(onMouseLeave),
                onMouseUp: clearTimerCb(onMouseUp),
            }
            : {
                onTouchEnd: clearTimerCb(onTouchEnd),
                onTouchStart: startTimeCb(onTouchStart)
            }
    }
    return (
        <El {...{
            ...objWithoutKeys(props, ignoreAttributes),
            ...eventHandlers,
        }} />
    )
}
Holdable.propTypes = {
    // duration in milliseconds to trigger the onHold event
    duration: PropTypes.number,
    El: PropTypes.oneOfType([
        // PropTypes.string,
        PropTypes.elementType,
    ]),
    ignoreAttributes: PropTypes.arrayOf(PropTypes.string),
    onHold: PropTypes.func,
}
Holdable.defaultProps = {
    duration: 1000,
    El: 'span',
    ignoreAttributes: [
        'duration',
        'El',
        'ignoreAttributes',
        'onHold',
    ]
}
export default React.memo(Holdable)