import React from 'react'
import PropTypes from 'prop-types'
import { Button, Dropdown, Form, Input, TextArea } from 'semantic-ui-react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { isBond, isDefined, isFn, objWithoutKeys, newMessage, hasValue, objReadOnly, isValidNumber, isStr } from '../utils/utils';
import { InputBond } from '../InputBond'
import { AccountIdBond } from '../AccountIdBond'
import CheckboxGroup from './CheckboxGroup'

const VALIDATION_MESSAGES = objReadOnly({
    max: (max) => `Number must be smaller or equal ${max}`,
    maxLength: (value, max) => `Maximum ${max} ${typeof value === 'number' ? 'digit' : 'character'}${max > 1 ? 's' : ''} required`,
    min: (min) => `Number must be greater or equal ${min}`,
    minLength: (value, min) => `Minimum ${min} ${typeof value === 'number' ? 'digit' : 'character'}${min > 1 ? 's' : ''} required`,
    requiredField: () => 'Required field',
    validNumber: () => 'Please enter a valid number'
}, true)
const NON_ATTRIBUTES = Object.freeze([
    'bond', 'controlled', 'deferred', 'hidden', 'inline', 'invalid', '_invalid', 'inlineLabel', 'label',
    'trueValue', 'falseValue', 'styleContainer', 'useInput', 'validate'
])

export default class FormInput extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleChange = this.handleChange.bind(this)
        this.bond = props.bond
        this.state = {
            message: undefined
        }

        setTimeout(() => isBond(this.bond) && this.bond.tie(value => this.handleChange({}, { value }), false))
    }

    handleChange(event, data, triggerBond = true) {
        const {
            falseValue: no,
            max,
            maxLength, min, minLength,
            onChange,
            required,
            trueValue: yes,
            type,
            validate,
        } = this.props
        const { checked, value } = data
        // Forces the synthetic event and it's value to persist
        // Required for use with deferred function
        event && isFn(event.persist) && event.persist();
        const typeLower = (type || '').toLowerCase()
        const isCheck = ['checkbox', 'radio'].indexOf(typeLower) >= 0
        const hasVal = hasValue(isCheck ? checked : value)
        let errMsg //= !isCheck && required && !hasVal ? VALIDATION_MESSAGES.requiredField() : undefined

        if (hasVal && !errMsg) {
            switch (typeLower) {
                case 'checkbox':
                case 'radio':
                    // Sematic UI's Checkbox component only supports string and number as value
                    // This allows support for any value types
                    data.value = checked ? (isDefined(yes) ? yes : true) : (isDefined(no) ? no : false)
                    if (required && !checked) {
                        errMsg = VALIDATION_MESSAGES.requiredField()
                    }
                    break
                case 'number':
                    if (!required && value === '') break
                    const num = eval(value)
                    if (!isValidNumber(num)) {
                        errMsg = VALIDATION_MESSAGES.validNumber()
                    }
                    if (isValidNumber(max) && max < num) {
                        errMsg = VALIDATION_MESSAGES.max(max)
                        break
                    }
                    if (isValidNumber(min) && min > num) {
                        errMsg = VALIDATION_MESSAGES.min(min)
                        break
                    }
                    data.value = num
                case 'text':
                case 'textarea':
                    if (isDefined(maxLength) && maxLength < value.length) {
                        errMsg = VALIDATION_MESSAGES.maxLength(value, maxLength)
                        break
                    }
                    if (isDefined(minLength) && minLength > value.length) {
                        errMsg = VALIDATION_MESSAGES.minLength(value, minLength)
                        break
                    }
            }
        }

        let message = !errMsg ? null : { content: errMsg, status: 'error' }
        // custom validation
        if (!message && isFn(validate)) {
            const vMsg = validate(event, data)
            message = !vMsg || !isStr(vMsg) ? vMsg : { content: vMsg, status: 'error' }
            if (message && message.status === 'error') {
                errMsg = message.content
            }
        }

        data.invalid = !!errMsg
        isFn(onChange) && onChange(event, data, this.props)
        this.setState({ message })

        if (isBond(this.bond) && !data.invalid && triggerBond === true) {
            this.bond.changed(value)
        }
    }

    render() {
        const {
            error, hidden, inline, inlineLabel, label, message: externalMessage,
            required, styleContainer, type, useInput, width
        } = this.props
        if (hidden) return ''
        const { message: internalMessage } = this.state
        const message = internalMessage || externalMessage
        let hideLabel = false
        let inputEl = ''
        // Remove attributes that are used by the form or Form.Field but
        // shouldn't be used or may cause error when using with inputEl
        let attrs = objWithoutKeys(this.props, NON_ATTRIBUTES)
        attrs.onChange = this.handleChange
        let messageEl = newMessage(message)
        let isGroup = false
        const typeLC = type.toLowerCase()

        switch (typeLC) {
            case 'accountidbond':
                inputEl = <AccountIdBond {...attrs} />
                break;
            case 'button':
                inputEl = <Button {...attrs} />
                break;
            case 'checkbox':
            case 'radio':
                attrs.toggle = typeLC !== 'radio' && attrs.toggle
                attrs.type = "checkbox"
                delete attrs.value;
                hideLabel = true
                inputEl = <Form.Checkbox {...attrs} label={label} />
                break;
            case 'checkbox-group':
            case 'radio-group':
                attrs.inline = inline
                inputEl = <CheckboxGroup {...attrs} radio={typeLC === 'radio-group' ? true : attrs.radio} />
                break;
            case 'dropdown':
                inputEl = <Dropdown {...attrs} />
                break;
            case 'group':
                isGroup = true
                inputEl = attrs.inputs.map((subInput, i) => <FormInput key={i} {...subInput} />)
                break;
            case 'hidden':
                hideLabel = true
                break
            case 'inputbond':
                if (isDefined(attrs.value)) {
                    attrs.defaultValue = attrs.value
                }
                inputEl = <InputBond {...attrs} />
                break;
            case 'textarea':
                inputEl = <TextArea {...attrs} />
                break;
            default:
                attrs.fluid = !useInput ? undefined : attrs.fluid
                if (!!inlineLabel) {
                    attrs.label = inlineLabel
                    console.log({ labelPosition: attrs.labelPosition })
                }
                inputEl = !useInput ? <Form.Input {...attrs} /> : <Input {...attrs} />
        }

        return !isGroup ? (
            <Form.Field
                error={message && message.status === 'error' || error}
                required={required}
                style={styleContainer}
                width={width}
            >
                {!hideLabel && label && <label>{label}</label>}
                {inputEl}
                {messageEl}
            </Form.Field>
        ) : (
                <Form.Group inline={inline} style={styleContainer} widths={attrs.widths}>
                    {inputEl}
                    {messageEl}
                </Form.Group>
            )
    }
}
FormInput.propTypes = {
    bond: PropTypes.any,
    // Delay, in miliseconds, to precess input value change
    deferred: PropTypes.number,
    // For text field types
    inlineLabel: PropTypes.any,
    type: PropTypes.string.isRequired,
    // Validate field. Only invoked when onChange is triggered and built-in validation passed.
    //
    // Params:
    //          @event object
    //          @data object
    // Expected Return: false or string (error), or message object
    validate: PropTypes.func,


    // Semantic UI supported props. Remove????
    action: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string
    ]),
    actionPosition: PropTypes.string,
    checked: PropTypes.bool,        // For checkbox/radio
    defaultChecked: PropTypes.bool, // For checkbox/radio
    defaultValue: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
    ]),
    icon: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string
    ]),
    iconPosition: PropTypes.string,
    disabled: PropTypes.bool,
    error: PropTypes.bool,
    fluid: PropTypes.bool,
    focus: PropTypes.bool,
    hidden: PropTypes.bool,
    inputs: PropTypes.array,
    // Whether to use Semantic UI's Input or Form.Input component.
    // Truthy => Input, Falsy (default) => Form.Input
    useInput: PropTypes.bool,
    message: PropTypes.object,
    max: PropTypes.number,
    maxLength: PropTypes.number,
    min: PropTypes.number,
    minLength: PropTypes.number,
    name: PropTypes.string.isRequired,
    label: PropTypes.string,
    onChange: PropTypes.func,
    placeholder: PropTypes.string,
    readOnly: PropTypes.bool,
    required: PropTypes.bool,
    slider: PropTypes.bool,         // For checkbox/radio
    toggle: PropTypes.bool,         // For checkbox/radio
    value: PropTypes.any,
    onValidate: PropTypes.func,
    width: PropTypes.number
}
FormInput.defaultProps = {
    type: 'text',
    width: 16
}