import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Checkbox } from 'semantic-ui-react'
import Text from './Text'
import { hasValue, isArr, isFn, isObj, objWithoutKeys } from '../utils/utils'

const excludeKeys = ['inline', 'multiple', 'name', 'options', 'required', 'rxValue', 'type', 'value', 'width']

export default function CheckboxGroup(props) {
    const { inline, multiple, name, options, radio, rxValue, style } = props
    const allowMultiple = !radio && multiple
    const commonProps = objWithoutKeys(props, excludeKeys)
    let [value, setValue] = useState(rxValue && rxValue.value || props.value)

    rxValue && useEffect(() => {
        let mounted = true
        const subscribed = rxValue.subscribe(v => mounted && setValue(v))

        return () => {
            mounted = false
            subscribed.unsubscribe()
        }
    }, [setValue])

    return (
        <div style={style}>
            {(options || []).map((option, i) => {
                value = !allowMultiple ? value : (
                    !hasValue(value) ? [] : !isArr(value) ? [value] : value
                )
                const checked = allowMultiple ? value.indexOf(option.value) >= 0 : value === option.value
                return option.hidden ? '' : (
                    <Checkbox
                        {...{
                            ...commonProps,
                            ...option,
                            checked,
                            key: i,
                            label: <Text EL='label' htmlFor={name}>{option.label}</Text>,
                            name: name + (allowMultiple ? i : ''),
                            onChange: (e, data) => {
                                isObj(e) && isFn(e.persist) && e.persist()
                                const { onChange } = props
                                const { checked } = data
                                const { value: val } = option
                                if (!allowMultiple) {
                                    value = checked ? val : undefined
                                } else {
                                    value = isArr(value) ? value : (hasValue(value) ? [value] : [])
                                    // add/remove from values
                                    checked ? value.push(val) : value.splice(value.indexOf(val), 1)
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
                        }}
                    />
                )
            })}
        </div>
    )
}

CheckboxGroup.propTypes = {
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