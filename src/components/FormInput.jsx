import React from 'react'
import PropTypes from 'prop-types'
import { Button, Dropdown, Form, Input, TextArea } from 'semantic-ui-react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import {
    deferred, hasValue, isArr, isBond, isDefined, isFn, isPromise,
    isStr, isValidNumber, newMessage, objWithoutKeys, searchRanked,
} from '../utils/utils';
// Custom Inputs
import { InputBond } from '../InputBond'
import { AccountIdBond } from '../AccountIdBond'
import CheckboxGroup from './CheckboxGroup'
import UserIdInput from './UserIdInput'

const VALIDATION_MESSAGES = Object.freeze({
    integer: () => 'Number must be an integer (no decimals)',
    max: (max) => `Number must be smaller or equal ${max}`,
    maxLength: (value, max) => `Maximum ${max} ${typeof value === 'number' ? 'digit' : 'character'}${max > 1 ? 's' : ''} required`,
    min: (min) => `Number must be greater or equal ${min}`,
    minLength: (value, min) => `Minimum ${min} ${typeof value === 'number' ? 'digit' : 'character'}${min > 1 ? 's' : ''} required`,
    requiredField: () => 'Required field',
    validNumber: () => 'Please enter a valid number'
})
const NON_ATTRIBUTES = Object.freeze([
    'bond', 'controlled', 'defer', 'hidden', 'inline', 'integer', 'invalid', '_invalid', 'inlineLabel', 'label',
    'trueValue', 'falseValue', 'styleContainer', 'useInput', 'validate'
])
export const nonValueTypes = Object.freeze([
    'button',
    'html',
])

export default class FormInput extends ReactiveComponent {
    constructor(props) {
        super(props)

        const { bond, defer } = props
        this.handleChange = this.handleChange.bind(this)
        this.bond = isBond(bond) ? bond : undefined
        this.state = { message: undefined }
        if (defer !== null) {
            this.setMessage = deferred(this.setMessage, defer)
        }

        this.bond && this.bond.tie(value => setTimeout(() => this.handleChange({}, { ...this.props, value })))
    }

    componentWillMount = () => this._mounted = true

    componentWillUnmount = () => this._mounted = false

    handleChange = (event, data) => {
        const {
            falseValue: no,
            integer,
            max,
            maxLength, min, minLength,
            onChange,
            required,
            trueValue: yes,
            type,
            validate,
        } = this.props
        const { checked, value } = data

        // for custom input types (eg: UserIdInput)
        if (data.invalid) return isFn(onChange) && onChange(event, data, this.props)

        // Forces the synthetic event and it's value to persist
        // Required for use with deferred function
        event && isFn(event.persist) && event.persist();
        const typeLower = (type || '').toLowerCase()
        const isCheck = ['checkbox', 'radio'].indexOf(typeLower) >= 0
        const hasVal = hasValue(isCheck ? checked : value)
        let errMsg

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
                    const num = integer ? parseInt(value) : parseFloat(value)
                    if (!isValidNumber(num)) {
                        errMsg = integer ? VALIDATION_MESSAGES.integer() : VALIDATION_MESSAGES.validNumber()
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
        const triggerChange = () => {
            data.invalid = !!errMsg
            isFn(onChange) && onChange(event, data, this.props)
            this.setMessage(message)

            if (isBond(this.bond) && !data.invalid) {
                this.bond._value = value
            }
        }
        if (message || !isFn(validate)) return triggerChange()
        isFn(onChange) && onChange(event, data, this.props)

        // custom validation
        new Promise(r => r(validate(event, data))).then(vMsg => {
            if (vMsg === true) {
                // means field is invalid but no message to display
                errMsg = true
                return triggerChange()
            }
            message = !vMsg && !isStr(vMsg) && !React.isValidElement(vMsg) ? vMsg : {
                content: vMsg,
                status: 'error'
            }
            errMsg = message && message.status === 'error' ? message.content : errMsg
            triggerChange()
        })
    }

    setMessage = (message = {}) => this._mounted && this.setState({ message })

    render() {
        const {
            bond, content, error, hidden, inline, inlineLabel, label, message: externalMsg,
            required, styleContainer, type, useInput, width
        } = this.props
        if (hidden) return ''
        const { message: internalMsg } = this.state
        const message = internalMsg || externalMsg
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
                attrs.bond = bond
                attrs.radio = typeLC === 'radio-group' ? true : attrs.radio
                inputEl = <CheckboxGroup {...attrs} />
                break;
            case 'dropdown':
                if (attrs.search && isArr(attrs.search)) {
                    attrs.search = searchRanked(attrs.search)
                }
                inputEl = <Dropdown {...attrs} />
                break;
            case 'group':
                isGroup = true
                inputEl = attrs.inputs.map((subInput, i) => <FormInput key={i} {...subInput} />)
                break;
            case 'hidden':
                hideLabel = true
                break
            case 'html': return content || ''
            case 'inputbond':
                if (isDefined(attrs.value)) {
                    attrs.defaultValue = attrs.value
                }
                inputEl = <InputBond {...attrs} />
                break;
            case 'textarea':
                inputEl = <TextArea {...attrs} />
                break;
            case 'useridinput':
                inputEl = <UserIdInput {...attrs} />
                break
            default:
                attrs.fluid = !useInput ? undefined : attrs.fluid
                attrs.label = inlineLabel || attrs.label
                const El = useInput ? Input : Form.Input
                inputEl = <El {...attrs} />
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
    // Delay, in miliseconds, to display built-in and `validate` error messages
    // Set `defer` to `null` to prevent using deferred mechanism
    defer: PropTypes.number,
    // For text field types
    inlineLabel: PropTypes.any,
    // If field types is 'number', will validate as an integer. Otherwise, float is assumed.
    integer: PropTypes.bool,
    search: PropTypes.oneOfType([
        // Array of option keys to be searchable (FormInput specific)
        PropTypes.array,
        PropTypes.bool,
        PropTypes.func,
    ]),
    type: PropTypes.string.isRequired,
    // Validate field. Only invoked when onChange is triggered and built-in validation passed.
    //
    // Params:
    //          @event object
    //          @data object
    // Expected Return: one of the following: 
    //              falsy (if no error),
    //              true (exact value, indicates invalid but no message to display)
    //              string (assumes error)
    //              ReactElement (assumes error)
    //              object (can be any status type. Required prop: content or header)
    //              Promise (must resolve to one of the above) - defers onChange trigger until resolved
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
    defer: 300,
    integer: false,
    type: 'text',
    width: 16
}