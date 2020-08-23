import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Checkbox } from 'semantic-ui-react'
import Text from './Text'
import { hasValue, isDefined, isArr, isBond, isFn, isObj, objWithoutKeys } from '../utils/utils'

const excludeKeys = ['bond', 'inline', 'multiple', 'modal', 'name', 'options', 'required', 'type', 'value', 'width']

export default class CheckboxGroup extends Component {
    componentWillMount() {
        let { bond, multiple, radio, value } = this.props
        const allowMultiple = !radio && multiple
        const hasBond = isBond(bond)
        if (!hasValue(value)) {
            value = (hasBond && bond._value) || (allowMultiple ? [] : undefined)
        }
        if (allowMultiple) {
            value = isArr(value) ? value : (hasValue(value) ? [value] : [])
        }
        this.setState({ allowMultiple, value })
        if (!hasBond) return
        this.tieId = bond.tie(() => this.setState({ value: bond._value }))
    }

    componentWillUnmount() {
        const { bond } = this.props
        isBond(bond) && bond.untie(this.tieId)
    }

    handleChange = (e, data, option) => {
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
        const { inline, modal, name, options, style } = this.props
        const { allowMultiple, value } = this.state
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
                                label: modal ? option.label : <Text EL='label' for={name}>{option.label}</Text>,
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