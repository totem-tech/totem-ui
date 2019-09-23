import React from 'react'
import PropTypes from 'prop-types'
import { Button, Checkbox, Dropdown, Form, Header, Icon, Input, Message, Modal, TextArea } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { isDefined, isArr, isBool, isBond, isFn, isObj, isStr, objCopy, objWithoutKeys, newMessage, hasValue, objReadOnly, isValidNumber } from '../utils/utils';
import { InputBond } from '../InputBond'
import { AccountIdBond } from '../AccountIdBond'

// ToDo: automate validation process by checking for data on input change
//       and prevent submission of form if data is invalid and/or required field in empty
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

    getValues(inputs, values) {
        return inputs.reduce((values, input, i) => {
            if (!isDefined(input.name)) return values;
            let value = values[input.name]
            value = !isDefined(value) ? input.value : value
            if (['accountidbond', 'inputbond'].indexOf(input.type.toLowerCase()) >= 0 && isBond(input.bond)) {
                value = input.bond._value
            }
            values[input.name] = value
            return values
        }, values || {})
    }

    handleChange(e, data, index, input, childIndex) {
        const { name, onChange: onInputChange } = input
        let { inputs } = this.state
        const { onChange: formOnChange } = this.props
        let { values } = this.state
        const { value } = data
        const updateBond = isBond(input.bond) && input.type.toLowerCase() !== 'checkbox-group'
        inputs[index]._invalid = data.invalid
        values[name] = value
        if (isDefined(childIndex)) {
            inputs[index].inputs[childIndex].value = value
        } else {
            inputs[index].value = value
        }
        // update values of other inputs
        values = this.getValues(inputs, values)
        updateBond && input.bond.changed(value)

        // trigger input items's onchange callback
        isFn(onInputChange) && onInputChange(e, values, index, childIndex)
        // trigger form's onchange callback
        isFn(formOnChange) && formOnChange(e, values, index, childIndex)
        this.setState({ inputs, values })
    }

    handleClose(e) {
        e.preventDefault()
        const { onClose } = this.props
        if (isFn(onClose)) return onClose();
        this.setState({ open: !this.state.open })
    }

    handleSubmit(e) {
        const { onSubmit } = this.props
        const { values } = this.state
        e.preventDefault()
        if (!isFn(onSubmit)) return;
        onSubmit(e, values)
    }

    handleReset(e) {
        e.preventDefault()
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
        const { handleClose } = this
        const { inputs, open: sOpen, values } = this.state
        // whether the 'open' status is controlled or uncontrolled
        let modalOpen = isFn(onClose) ? open : sOpen
        if (success && closeOnSubmit) {
            modalOpen = false
        }

        let submitProps = React.isValidElement(submitText) ? objCopy(submitText.props) : {}
        const { content, disabled, onClick, positive } = submitProps
        const shouldDisable = isFormInvalid(inputs, values) || submitDisabled || message.error || success
        submitProps.content = isDefined(content) || !isStr(submitText) ? content : submitText
        submitProps.disabled = isBool(disabled) ? disabled : shouldDisable
        submitProps.onClick = isFn(onClick) ? onClick : this.handleSubmit
        submitProps.positive = isDefined(positive) ? positive : true
        const submitBtn = submitText === null ? undefined : <Button {...submitProps} />

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
                {Array.isArray(inputs) && inputs.map((input, i) => {
                    const isGroup = (input.type || '').toLowerCase() === 'group'
                    return (
                        <FormInput
                            key={i}
                            {...input}
                            inputs={!isGroup || !isArr(input.inputs) ? undefined : input.inputs.map((childInput, childIndex) => {
                                const cin = objWithoutKeys(childInput, ['onChange'])
                                cin.onChange = (e, data) => this.handleChange(e, data, i, childInput, childIndex)
                                cin.useInput = true
                                return cin
                            })}
                            onChange={isGroup ? undefined : (e, data) => this.handleChange(e, data, i, input)}
                        />
                    )
                })}
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
                onClose={handleClose}
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
                        onClick={handleClose}
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
                <Modal.Content>{form}</Modal.Content>
                {!hideFooter && (
                    <Modal.Actions>
                        {React.isValidElement(closeText) || closeText === null ? closeText : (
                            <Button
                                content={closeText || (success ? 'Close' : 'Cancel')}
                                negative
                                onClick={handleClose}
                            />
                        )}
                        {submitBtn}
                    </Modal.Actions>
                )}
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

export class FormInput extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleChange = this.handleChange.bind(this)

        this.state = {
            message : undefined
        }
    }

    handleChange(event, data) {
        const { falseValue: no, max, maxLength, min, minLength, onChange, required, trueValue: yes, type } = this.props
        const { value } = data
        // Forces the synthetic event and it's value to persist
        // Required for use with deferred function
        isFn(event.persist) && event.persist();
        const hasVal = hasValue(value)
        let errMsg = required && !hasVal ? VALIDATION_MESSAGES.requiredField() : undefined
        if (hasVal && !errMsg) {
            switch ((type || '').toLowerCase()) {
                case 'checkbox':
                case 'radio':
                    // Sematic UI's Checkbox component only supports string and number as value
                    // This allows support for any value types
                    data.value = data.checked ? (isDefined(yes) ? yes : true) : (isDefined(no) ? no : false)
                    break
                case 'number':
                    if (!required && value === '') break
                    const num = (value.indexOf('.') >= 0 ? parseFloat : parseInt)(value)
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
        const { handleChange } = this
        const { error, hidden, inline, label, message: externalMessage, required, type, useInput, width } = this.props
        const { message: internalMessage } = this.state
        const message = internalMessage || externalMessage
        let hideLabel = false
        let inputEl = ''
        // Remove attributes that are used by the form or Form.Field but
        // shouldn't be used or may cause error when using with inputEl
        const nonAttrs = ['deferred', 'hidden', 'inline', 'invalid', '_invalid', 'label', 'useInput']
        let attrs = objWithoutKeys(this.props, nonAttrs)
        attrs.onChange = handleChange
        const messageEl = newMessage(message)
        let isGroup = false

        switch (hidden ? 'hidden' : type.toLowerCase()) {
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
                inputEl = <Form.Checkbox {...attrs} label={label} />
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
                isGroup = true
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
        super(props, { bond: props.bond })
        const allowMultiple = !props.radio && props.multiple
        const hasBond = isBond(props.bond)
        const value = props.value || (hasBond && props.bond._value) || (allowMultiple ? [] : undefined)
        this.state = {
            allowMultiple,
            value
        }
        this.handleChange = this.handleChange.bind(this)
        hasBond && props.bond.notify(() => this.setState({ value: props.bond._value }))
    }

    handleChange(e, data) {
        isObj(e) && isFn(e.persist) && e.persist()
        const { onChange } = this.props
        let { allowMultiple, value } = this.state
        const { checked, value: val } = data
        if (!allowMultiple) {
            value = checked ? val : undefined
        } else {
            checked ? value.push(val) : value.splice(value.indexOf(val), 1)
        }
        data.value = value

        this.setState({ value })
        isFn(onChange) && onChange(e, data)
    }

    render() {
        const { inline, name, options, style } = this.props
        const { allowMultiple, value } = this.state
        const excludeKeys = ['bond', 'inline', 'multiple', 'name', 'required', 'type', 'value', 'width']
        const commonProps = objWithoutKeys(this.props, excludeKeys)
        return (
            <div>
                {!isArr(options) ? '' : options.map((option, i) => (
                    <Checkbox
                        key={i}
                        {...commonProps}
                        checked={allowMultiple ? value.indexOf(option.value) >= 0 : value === option.value}
                        className={(inline ? '' : 'sixteen wide ') + option.className || ''}
                        label={option.label}
                        name={name + (allowMultiple ? i : '')}
                        onChange={this.handleChange}
                        required={false}
                        style={objCopy(style, { margin: '0 5px' })}
                        type="checkbox"
                        value={option.value}
                    />
                ))}
            </div>
        )
    }
}

export const fillValues = (inputs, values, forceFill) => {
    if (!isObj(values)) return
    inputs.forEach(input => {
        let { bond, defaultValue, name, type } = input
        const newValue = values[input.name]
        type = (isStr(type) ? type : '').toLowerCase()
        const isGroup = type === 'group'
        if (!isGroup && (
            !isDefined(name) || !values.hasOwnProperty(input.name)
            || (!forceFill && isDefined(input.value)) || !type)
        ) return
        if (['accountidbond', 'inputbond'].indexOf(type) >= 0) {
            input.defaultValue = newValue
        } else if (['checkbox', 'radio'].indexOf(type) >= 0) {
            input.defaultChecked = newValue
        } else if (isGroup) {
            fillValues(input.inputs, values, forceFill)
        } else {
            input.value = newValue
        }
        // make sure Bond is also updated
        isBond(bond) && bond.changed(input.defaultValue)
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

    // Use recursion to validate input groups
    if (isGroup) return isFormInvalid(input.inputs, values);
    values = values || {}
    const value = isDefined(values[input.name]) ? values[input.name] : input.value
    return isCheckbox && isRequired ? !value : !hasValue(value)
}, false)

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