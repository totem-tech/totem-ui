import React from 'react'
import PropTypes from 'prop-types'
import { Button, Checkbox, Dropdown, Form, Header, Icon, Input, Modal, TextArea } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { isDefined, isArr, isBool, isBond, isFn, isObj, isStr, objCopy, objWithoutKeys, newMessage, hasValue, objReadOnly, isValidNumber, arrReadOnly } from '../utils/utils';
import { InputBond } from '../InputBond'
import { AccountIdBond } from '../AccountIdBond'

class FormBuilder extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            inputs: props.inputs,
            open: props.open,
            values: this.getValues(props.inputs)
        }

        this.handleChange = this.handleChange.bind(this)
        this.handleClose = this.handleClose.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
    }

    getValues(inputs = [], values = {}) {
        return inputs.reduce((values, input, i) => {
            if (!isDefined(input.name)) return values
            if (input.type.toLowerCase() === 'group') return this.getValues(input.inputs, values)
            let value = values[input.name]
            value = !isDefined(value) ? input.value : value
            if (['accountidbond', 'inputbond'].indexOf(input.type.toLowerCase()) >= 0 && isBond(input.bond)) {
                value = input.bond._value
            }
            values[input.name] = value
            return values
        }, values)
    }

    handleChange(e, data, index, input) {
        const { name, onChange: onInputChange } = input
        let { inputs } = this.state
        const { onChange: formOnChange } = this.props
        let { values } = this.state
        const { value } = data
        const updateBond = isBond(input.bond) && input.type.toLowerCase() !== 'checkbox-group'
        inputs[index]._invalid = data.invalid
        values[name] = value
        inputs[index].value = value
        // update values of other inputs
        values = this.getValues(inputs, -1, values)
        updateBond && input.bond.changed(value)

        if (!data.invalid) {
            // trigger input items's onchange callback
            isFn(onInputChange) && onInputChange(e, values, index, childIndex)
            // trigger form's onchange callback
            isFn(formOnChange) && formOnChange(e, values, index, childIndex)
        }
        this.setState({ inputs, values })
    }

    handleClose(e) {
        e.preventDefault()
        const { onClose } = this.props
        if (isFn(onClose)) return onClose();
        this.setState({open: !this.state.open})
    }

    handleSubmit(e) {
        const { onSubmit } = this.props
        const { values } = this.state
        e.preventDefault()
        if (!isFn(onSubmit)) return;
        onSubmit(e, values)
    }

    render() {
        const {
            closeOnEscape,
            closeOnDimmerClick,
            closeOnSubmit,
            closeText,
            defaultOpen,
            header,
            headerIcon,
            hideFooter,
            loading,
            message,
            modal,
            onClose,
            onOpen,
            onSubmit,
            open,
            size,
            style,
            subheader,
            submitDisabled,
            submitText,
            success,
            trigger,
            widths
        } = this.props
        const { inputs, open: sOpen, values } = this.state
        // whether the 'open' status is controlled or uncontrolled
        let modalOpen = isFn(onClose) ? open : sOpen
        if (success && closeOnSubmit) {
            modalOpen = false
            isFn(onClose) && onClose({}, {})
        }

        let submitBtn, closeBtn
        if (submitText !== null) {
            let submitProps = React.isValidElement(submitText) ? objCopy(submitText.props) : {}
            const { content, disabled, onClick, positive } = submitProps
            const shouldDisable = isFormInvalid(inputs, values) || submitDisabled || message.error || success
            submitProps.content = content || (!isStr(submitText) ? content : submitText)
            submitProps.disabled = isBool(disabled) ? disabled : shouldDisable
            submitProps.onClick = isFn(onClick) ? onClick : this.handleSubmit
            submitProps.positive = isDefined(positive) ? positive : true
            submitBtn = <Button {...submitProps} />
        }
        if (!modal || closeText !== null) {
            const closeProps = React.isValidElement(closeText) ? objCopy(closeText.props) : {}
            closeProps.content = closeProps.content || (isStr(closeText) ? closeText : (success ? 'Close' : 'Cancel'))
            closeProps.negative = isDefined(closeProps.negative) ? closeProps.negative : true
            closeProps.onClick = closeProps.onClick || this.handleClose
            closeBtn = <Button {...closeProps} />
        }

        const form = (
            <Form 
                error={message.status === 'error'}
                loading={loading}
                onSubmit={onSubmit}
                style={style}
                success={success || message.status === 'success'}
                warning={message.status === 'warning'}
                widths={widths}
            >
                {Array.isArray(inputs) && inputs.map((input, i) => (
                    <FormInput
                        key={i}
                        {...input}
                        onChange={(e, data) => this.handleChange(e, data, i, input)}
                    />
                ))}
                {/* Include submit button if not a modal */}
                {!modal && !hideFooter && submitBtn}
            </Form>
        )
        
        return !modal ? form : (
            <Modal
                closeOnEscape={!!closeOnEscape}
                closeOnDimmerClick={!!closeOnDimmerClick}
                defaultOpen={defaultOpen}
                dimmer={true}
                onClose={this.handleClose}
                onOpen={onOpen}
                open={modalOpen}
                size={size}
                trigger={trigger}
            >        
                <div style={styles.closeButton}>
                    <Icon
                        className="no-margin"
                        color="grey" 
                        link
                        name='times circle outline'
                        onClick={this.handleClose}
                        size="large"
                    />
                </div>
                {header && (
                    <Header as={Modal.Header}>
                        <Header.Content>
                            {headerIcon && <Icon name={headerIcon} size="large" />}
                            {header}
                        </Header.Content>
                        {subheader && <Header.Subheader>{subheader}</Header.Subheader>}
                    </Header>
                )}
                <Modal.Content>
                    {form}
                </Modal.Content>
                {!hideFooter && (
                    <Modal.Actions>
                        {closeBtn}
                        {submitBtn}
                    </Modal.Actions> 
                )}
                {/* {message && !!message.status && (
                    <Message
                        {...message}
                        content={message.content}
                        header={message.header}
                        error={message.status==='error'}
                        style={objCopy(
                            styles.formMessage,
                            message.style || {
                                textAlign: !message.icon && (!message.header || !message.content) ? 'center' : 'left'
                            }
                        )}
                        success={message.status==='success'}
                        visible={!!message.status}
                        warning={message.status==='warning'}
                    />
                )} */}
                {newMessage(message)}
            </Modal>
        )
    }
}

FormBuilder.propTypes = {
    closeOnEscape: PropTypes.bool,
    closeOnDimmerClick: PropTypes.bool,
    closeOnSubmit: PropTypes.bool,
    closeText: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.element
    ]),
    defaultOpen: PropTypes.bool,
    header: PropTypes.string,
    headerIcon: PropTypes.string,
    hideFooter: PropTypes.bool,
    message: PropTypes.object,
    // show loading spinner
    loading: PropTypes.bool, 
    modal: PropTypes.bool,
    // If modal=true and onClose is defined, 'open' is expected to be controlled externally
    onClose: PropTypes.func,
    onOpen: PropTypes.func,
    onSubmit: PropTypes.func,
    open: PropTypes.bool,
    size: PropTypes.string,
    style: PropTypes.object,
    subheader: PropTypes.string,
    submitDisabled: PropTypes.bool,
    submitText: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.element
    ]),
    success: PropTypes.bool,
    trigger: PropTypes.element,
    widths: PropTypes.string
}
FormBuilder.defaultProps = {
    closeOnEscape: false,
    closeOnDimmerClick: false,
    message: {
        // Status controls visibility and style of the message
        // Supported values: error, warning, success
        status: '', 
        // see https://react.semantic-ui.com/collections/message/ for more options
    },
    submitText: 'Submit'
}
export default FormBuilder

const VALIDATION_MESSAGES = objReadOnly({
    max: (max) => `Number must be smaller or equal ${max}`,
    maxLength: (value, max) => `Maximum ${max} ${typeof value === 'number' ? 'digit' : 'character'}${max > 1 ? 's' : ''} required`,
    min: (min) => `Number must be greater or equal ${min}`,
    minLength: (value, min) => `Minimum ${min} ${typeof value === 'number' ? 'digit' : 'character'}${min > 1 ? 's' : ''} required`,
    requiredField: () => 'Required field',
    validNumber: ()=> 'Please enter a valid number'
}, true)
const NON_ATTRIBUTES = arrReadOnly(
    ['deferred', 'hidden', 'inline', 'invalid', '_invalid', 'label', 'trueValue', 'falseValue', 'useInput']
)

export class FormInput extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleChange = this.handleChange.bind(this)

        this.state = {
            message : undefined
        }
    }

    handleChange(event, data) {
        const { falseValue: no, max, maxLength, min, minLength, onChange, required, trueValue: yes, type} = this.props
        const { checked, value } = data
        // Forces the synthetic event and it's value to persist
        // Required for use with deferred function
        event && isFn(event.persist) && event.persist();
        const typeLower = (type || '').toLowerCase()
        const isCheck = ['checkbox', 'radio'].indexOf(typeLower) >= 0
        const hasVal = hasValue(isCheck ? checked : value)
        let errMsg = !isCheck && required && !hasVal ? VALIDATION_MESSAGES.requiredField() : undefined
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
                    break
            }
        }

        data.invalid = !!errMsg
        isFn(onChange) && onChange(event, data || {}, this.props)
        this.setState({message: !errMsg ? null : { content: errMsg, status: 'error'}})
    }

    render() {
        const { error, hidden, inline, label, message: externalMessage, required, type, useInput, width } = this.props
        const { message: internalMessage } = this.state
        const message = internalMessage || externalMessage
        let hideLabel = false
        let inputEl = ''
        // Remove attributes that are used by the form or Form.Field but
        // shouldn't be used or may cause error when using with inputEl
        let attrs = objWithoutKeys(this.props, NON_ATTRIBUTES)
        attrs.onChange = this.handleChange
        const messageEl = newMessage(message)

        switch(type.toLowerCase()) {
            case 'accountidbond': 
                inputEl = <AccountIdBond {...attrs} />
                break;
            case 'button':
                inputEl = <Button {...attrs} />
                break;
            case 'checkbox':
            case 'radio':
                attrs.toggle = type.toLowerCase() !== 'radio' && attrs.toggle
                attrs.type = "checkbox"
                delete attrs.value;
                hideLabel = true
                inputEl = <Form.Checkbox {...attrs} label={label}/>
                break;
            case 'checkbox-group':
            case 'radio-group':
                attrs.inline = inline
                inputEl = (
                    <CheckboxGroup 
                        {...attrs} 
                        radio={type.toLowerCase() === 'radio-group' ? true : attrs.radio} 
                    />
                )
                break;
            case 'dropdown':
                inputEl = <Dropdown {...attrs} />
                break;
            case 'group':
                inputEl = attrs.inputs.map((subInput, i) => <FormInput key={i} {...subInput} />)
                break;
            case 'hidden':
                hideLabel = true
                break;
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
                inputEl = !useInput ? <Form.Input {...attrs} /> : <Input {...attrs} />
        }

        return !isGroup ? (
            <Form.Field
                error={message && message.status === 'error' || error}
                required={required}
                width={width}
            >
                {!hideLabel && label && <label>{label}</label>}
                {inputEl}
                {messageEl}
            </Form.Field>
        ) : (
            <Form.Group inline={inline} widths={attrs.widths}>
                {inputEl}
                {messageEl}
            </Form.Group>
        )
    }
}
FormInput.propTypes = {
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
    // Delay, in miliseconds, to precess input value change
    deferred: PropTypes.number,
    icon: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string
    ]),
    iconPosition: PropTypes.string,
    disabled: PropTypes.bool,
    error: PropTypes.bool,
    fluid: PropTypes.bool,
    focus: PropTypes.bool,
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
    type: PropTypes.string.isRequired,
    value: PropTypes.any,
    onValidate: PropTypes.func,
    width: PropTypes.number
}
FormInput.defaultProps = {
    type: 'text',
    width: 16
}

class CheckboxGroup extends ReactiveComponent {
    constructor(props) {
        super(props, {bond: props.bond})
        const allowMultiple = !props.radio && props.multiple
        const hasBond = isBond(props.bond)
        const value = props.value || (hasBond && props.bond._value) || (allowMultiple ? [] : undefined)
        this.state = {
            allowMultiple,
            value: !allowMultiple ? value : (isArr(value) ? value : (isDefined(value) ? [value] : []))
        }
        this.handleChange = this.handleChange.bind(this)
        hasBond && props.bond.notify(() => this.setState({value: props.bond._value}))
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

        this.setState({value})
        isFn(onChange) && onChange(e, data)
    }

    render() {
        const { inline, name, options, style } = this.props
        const { allowMultiple, value } = this.state
        const excludeKeys = ['bond', 'inline', 'multiple', 'name', 'options', 'required', 'type', 'value', 'width']
        const commonProps = objWithoutKeys(this.props, excludeKeys)
        return (
            <div style={style}>
                {!isArr(options) ? '' : options.map((option, i) => {
                    if (option.hidden) return ''
                    const checked = allowMultiple ? value.indexOf(option.value) >= 0 : value === option.value
                    const optionProps = objCopy(option, commonProps, true)
                    return (
                        <Checkbox
                            key={i}
                            {...optionProps}
                            checked={checked}
                            name={name + (allowMultiple ? i : '')}
                            onChange={(e, d)=> this.handleChange(e, d, option)}
                            required={false}
                            style={objCopy(option.style, { margin: '0 5px', width: (inline ? 'auto' : '100%') })}
                            type="checkbox"
                            value={checked ? `${option.value}` : ''}
                        />
                    )
                })}
            </div>
        )
    }
}

export const fillValues = (inputs, obj, forceFill) => {
    if (!isObj(obj)) return;
    inputs.forEach(input => {
        let { bond, name, type } = input
        const newValue = values[input.name]
        type = (isStr(type) ? type : '').toLowerCase()
        const isGroup = type === 'group'
        if (!isGroup && (
                !isDefined(name) || !values.hasOwnProperty(input.name)
                || (!forceFill && hasValue(input.value)) || !type
            )
        ) return
        
        if (['accountidbond', 'inputbond'].indexOf(type) >= 0) {
            input.defaultValue = newValue
        } else if (['checkbox', 'radio'].indexOf(type) >= 0) {
            input.defaultChecked = newValue
        } else if (isGroup) {
            fillValues(input.inputs, values, forceFill)
        } else {
            input.value = obj[input.name]
        }
    })
}

export const resetValues = inputs => inputs.map(input => {
    if ((input.type || '').toLowerCase() === 'group') {
        resetValues(input.inputs)
    } else {
        input.value = undefined;
    }
    return input
})

export const isFormInvalid = (inputs = [], values) => inputs.reduce((invalid, input) => {
    const inType = (input.type || '').toLowerCase()
    const isCheckbox = ['checkbox', 'radio'].indexOf(inType) >= 0
    const isGroup = inType === 'group'
    const isRequired = !!input.required
    // ignore current input if conditions met
    if (// one of the previous inputs was invalid 
        invalid
        // input's type is invalid
        || !inType
        // current input is hidden
        || (inType === 'hidden' || input.hidden === true)
        // current input is not required and does not have a value
        || (!isGroup && !isRequired && !hasValue(values[input.name]))
        // not a valid input type
        || ['button'].indexOf(inType) >= 0) return invalid;

    // if input is set invalid externally or internally by FormInput
    if (input.invalid || input._invalid) return true;

export const isFormInvalid = (inputs, values) => (inputs || []).reduce((invalid, input) => {
    if (invalid || !input.required || ['button'].indexOf(input.type) >= 0) return invalid;
    // Use recursion to validate input groups
    if (input.type === 'group') return isFormInvalid(input.inputs);
    if (input.invalid) return true;
    values = values || {}
    const value = isDefined(values[input.name]) ? values[input.name] : input.value
    if (['number'].indexOf(input.type.toLowerCase()) >= 0) return !isDefined(value);
    return !value;
}, false)

export const findInput = (inputs, name) => inputs.find(x => x.name === name) || (
    inputs.filter(x => x.type === 'group').reduce((input, group = {}) => { 
        return input || findInput(group.inputs || [], name)
    }, undefined)
)

const styles = {
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15
    },
    formMessage: {
        margin: 1
    }
}