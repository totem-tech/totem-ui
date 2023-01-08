import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { useRxSubject } from '../utils/reactHelper'
import { hasValue, isFn, isSubjectLike } from '../utils/utils'
import RxSubject from './RxSubject'

const CharacterCount = props => {
    let { 
        hideOnEmpty,
        maxLength = 0,
        minLength = 0,
        show: _show = true,
        style,
        subject = '',
        valueModifier,
        warnLength = 0,
    } = props
    const [show] = !isSubjectLike(_show)
        ? [_show]
        : useRxSubject(_show)
    const modifier = useCallback(value => {
        let text = isFn(valueModifier)
            ? valueModifier(value)
            : value
        text = `${hasValue(text) && text || ''}`
        const len = text.length
        if (!len && hideOnEmpty) return ''

        warnLength = warnLength || maxLength * 0.9
        const isWarn = len >= warnLength
        const isMin = len < minLength
        const isMax = len > maxLength
        const color = len && (isMax || isMin)
            ? 'red'
            : isWarn
                ? 'orange'
                : 'grey'
        let content = len
        if (maxLength) content = `${len}/${maxLength}`

        return (
            <div style={{ position: 'relative' }}>
                <div style={{
                    bottom: 0,
                    color,
                    fontWeight: 'bold',
                    position: 'absolute',
                    right: 18,
                    ...style,
                }}>
                    {content}
                </div>
            </div>
        )
    })

    return !!show && !!maxLength && (
        <RxSubject {...{
            ...props,
            subject,
            valueModifier: modifier,
        }} />
    )
}
CharacterCount.propTypes = {
    hideOnEmpty: PropTypes.bool,
    initialValue: PropTypes.any,
    maxLength: PropTypes.number,
    minLength: PropTypes.number,
    subject: PropTypes.oneOfType([
        PropTypes.instanceOf(BehaviorSubject),
        PropTypes.any,
    ]),
    warnLength: PropTypes.number,
}
CharacterCount.defaultProps = {
    hideOnEmpty: true,
}
export default React.memo(CharacterCount)