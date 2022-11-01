import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Checkbox } from 'semantic-ui-react'
import Text from './Text'
import {
    arrUnique,
    className,
    generateHash,
    hasValue,
    isArr,
    isDefined,
    isFn,
    isObj,
    objWithoutKeys,
} from '../utils/utils'
import { useRxSubject } from '../utils/reactHelper'

function CheckboxGroup(props) {
    const {
        rxValue,
        style,
        title,
    } = props
    const [value, setValue] = useRxSubject(rxValue || props.value)
    
    return (
        <div {...{ style, title }}>
            {getCheckboxes(props, value, setValue)}
        </div>
    )
}
CheckboxGroup.propTypes = {
    ignoreAttributes: PropTypes.array,
    inline: PropTypes.bool,
    multiple: PropTypes.bool, // if true, allows multiple selection
    name: PropTypes.string,
    options: PropTypes.array,
    required: PropTypes.bool,
    rxValue: PropTypes.shape({
        subscribe: PropTypes.func.isRequired,
    }),
    style: PropTypes.object,
    type: PropTypes.string,
    value: PropTypes.any,
    width: PropTypes.number,
}
CheckboxGroup.defaultProps = {
    ignoreAttributes: [
        'defaultChecked',
        'error',
        'ignoreAttributes',
        'inline',
        'multiple',
        'name',
        'options',
        'required',
        'rxValue',
        'type',
        'value',
        'width',
    ],
}
export default React.memo(CheckboxGroup)

const getCheckboxes = (props, value, setValue) => {
    const {
        disabled,
        ignoreAttributes,
        inline,
        multiple,
        name,
        options = [],
        radio,
        readOnly,
    } = props
    const allowMultiple = !radio && !!multiple
    const commonProps = objWithoutKeys(props, ignoreAttributes)

    if (allowMultiple) {
        value = !hasValue(value)
            ? []
            : !isArr(value)
                ? [value]
                : value
        value = arrUnique(value.flat())
    }

    return options.map((option, i) => {
        const checked = allowMultiple
            ? value.indexOf(option.value) >= 0
            : value === option.value
        option.id = option.id || generateHash(
            `${name}${i}${JSON.stringify(option.value)}${checked}`,
            'blake2',
            32,
        )
        return !option.hidden && (
            <Checkbox {...{
                ...commonProps,
                disabled: disabled || readOnly,
                ...option,
                checked,
                key: option.id,
                label: (
                    <Text {...{
                        El: 'label',
                        children: option.label,
                        className: className({
                            'checkbox-group-item': true,
                            checked, 
                        }),
                        htmlFor:  option.id
                    }} />
                ),
                name: name + (allowMultiple ? i : ''),
                onChange: (e, data) => {
                    isObj(e) && isFn(e.persist) && e.persist()
                    const { onChange } = props
                    const { checked } = data
                    const { value: val } = option
                    if (!allowMultiple) {
                        value = checked ? val : undefined
                    } else {
                        value = isArr(value)
                            ? value
                            : hasValue(value)
                                ? [value]
                                : []
                        
                        // add/remove from values
                        checked
                            ? value.push(val)
                            : value.splice(value.indexOf(val), 1)
                        value = arrUnique(value.flat())
                    }
                    setValue(value)
                    isFn(onChange) && onChange(e, { ...data, value })
                },
                required: false, // handled by CheckboxGroup
                style: {
                    ...option.style,
                    margin: '5px',
                    width: inline ? 'auto' : '100%'
                },
                type: 'checkbox',
                value: checked ? `${option.value}` : '',
            }} />
        )
    }).filter(Boolean)
}