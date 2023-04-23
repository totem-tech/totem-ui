import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { useRxSubject } from '../utils/reactHelper'
import { hasValue, isFn, isSubjectLike } from '../utils/utils'
import RxSubjectView from './RxSubjectView'

/**
 * @name    CharacterCount
 * @summary display and auto-update the character count of the (text/string) value of a RxJS subject.
 * 
 * @param   {Object}    props
 * @param   {String}    props.color         (optional) default text color
 *                                          Default: 'grey'
 * @param   {String}    props.colorError    (optional) text color when character count reached maximum or below minimum.
 *                                          Default: 'red'
 * @param   {String}    props.colorWarn     (optional) text color when character count is between warn and max length.
 *                                          Default: 'orange'
 * @param   {Boolean}   props.hideOnEmpty   (optional) whether to hide count if empty value (character count is 0).
 *                                          Default: false
 * @param   {Number}    props.maxLength     (optional) warn when value reaches maximum allowed length.
 *                                          Default: 0
 * @param   {Number}    props.minLength     (optional) warn when value is below minimum required length.
 *                                          Default: 0
 * @param   {Boolean}   props.show          (optional) control (default) visibility of counter externally.
 *                                          Default: true
 * @param   {Object}    props.style         (optional) CSS styles
 * @param   {BehaviorSubject} props.subject RxJS subject containing the value.
 * @param   {Function}  props.valueModifier (optional)
 * @param   {Number}    props.warnLength    (optional) warn when character count reaches certain length but below max.
 *                                          Default: maxLength * 0.9
 * 
 * @returns {Element}
 */
const CharacterCount = props => {
    let {
        color,
        colorError,
        colorWarn,
        hideOnEmpty,
        maxLength,
        minLength,
        show: _show,
        style,
        subject,
        valueModifier,
        warnLength = maxLength * 0.9,
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

        // warnLength = warnLength || maxLength * 0.9
        const isWarn = len >= warnLength
        const isMin = len < minLength
        const isMax = len > maxLength
        const color = len && (isMax || isMin)
            ? colorError
            : isWarn
                ? colorWarn
                : color
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

    return !!show && (
        <RxSubjectView {...{
            ...props,
            subject,
            valueModifier: modifier,
        }} />
    )
}
CharacterCount.propTypes = {
    color: PropTypes.string,
    colorError: PropTypes.string,
    colorWarn: PropTypes.string,
    hideOnEmpty: PropTypes.bool,
    initialValue: PropTypes.any,
    maxLength: PropTypes.number,
    minLength: PropTypes.number,
    show: PropTypes.bool,
    style: PropTypes.object,
    subject: PropTypes.oneOfType([
        PropTypes.instanceOf(BehaviorSubject),
        PropTypes.any,
    ]),
    valueModifier: PropTypes.func,
    warnLength: PropTypes.number,
}
CharacterCount.defaultProps = {
    color: 'grey',
    colorError: 'red',
    colorWarn: 'orange',
    hideOnEmpty: true,
    // maxLength: 0,
    minLength: 0,
    show: true,
}
export default React.memo(CharacterCount)