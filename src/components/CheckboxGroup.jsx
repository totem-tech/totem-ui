import React from 'react'
import PropTypes from 'prop-types'
import { Checkbox } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { isDefined, isArr, isBond, isFn, isObj, objWithoutKeys } from '../utils/utils'

export default class CheckboxGroup extends ReactiveComponent {
    constructor(props) {
        super(props, { bond: props.bond })
        const allowMultiple = !props.radio && props.multiple
        const hasBond = isBond(props.bond)
        const value = props.value || (hasBond && props.bond._value) || (allowMultiple ? [] : undefined)
        this.state = {
            allowMultiple,
            value: !allowMultiple ? value : (isArr(value) ? value : (isDefined(value) ? [value] : []))
        }
        this.handleChange = this.handleChange.bind(this)
        hasBond && props.bond.notify(() => this.setState({ value: props.bond._value }))
    }

    handleChange(e, data, option) {
        isObj(e) && isFn(e.persist) && e.persist()
        const { onChange } = this.props
        let { allowMultiple, value } = this.state
        const { checked } = data
        const { value: val } = option
        if (!allowMultiple) {
            value = checked ? val : undefined
        } else {
            value = isArr(value) ? value : (isDefined(value) ? [value] : [])
            checked ? value.push(val) : value.splice(value.indexOf(val), 1)
        }
        data.value = value

        this.setState({ value })
        isFn(onChange) && onChange(e, data)
    }

    render() {
        const { inline, name, options, style } = this.props
        const { allowMultiple, value } = this.state
        const excludeKeys = ['bond', 'inline', 'multiple', 'name', 'options', 'required', 'type', 'value', 'width']
        const commonProps = objWithoutKeys(this.props, excludeKeys)
        return (
            <div style={style}>
                {(options || []).map((option, i) => {
                    const checked = allowMultiple ? value.indexOf(option.value) >= 0 : value === option.value
                    return option.hidden ? '' : (
                        <Checkbox
                            {...{
                                ...commonProps,
                                ...option,
                                checked,
                                key: i,
                                name: name + (allowMultiple ? i : ''),
                                onChange: (e, d) => this.handleChange(e, d, option, i),
                                required: false, // handled by CheckboxGroup
                                style: {
                                    ...option.style,
                                    margin: '5px',
                                    width: inline ? 'auto' : '100%'
                                },
                                type: "checkbox",
                                value: checked ? `${option.value}` : '',
                            }}
                        />
                    )
                })}
            </div>
        )
    }
}
CheckboxGroup.propTypes = {
    // bond: Bond
    inline: PropTypes.bool,
    multiple: PropTypes.bool, // if true, allows multiple selection
    name: PropTypes.string,
    options: PropTypes.array,
    required: PropTypes.bool,
    style: PropTypes.object,
    type: PropTypes.string,
    value: PropTypes.any,
    width: PropTypes.number,
}