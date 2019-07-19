import React from 'react'
import PropTypes from 'prop-types'
import { Button, Checkbox, Dropdown, Form, Header, Icon, Input, Message, Modal, TextArea } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { isDefined, isArr, isBond, isFn, isObj, objCopy, objWithoutKeys, deferred } from '../utils';
import { InputBond } from '../../InputBond'
import { AccountIdBond } from '../../AccountIdBond'

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

    getValues(inputs, excludeIndex, values) {
        return inputs.reduce((values, input, i) => {
            if (!isDefined(input.name) || i === excludeIndex) return values;
            let { value } = values
            value = !isDefined(value) ? input.value : value
            if (['accountidbond', 'inputbond'].indexOf(input.type.toLowerCase()) >= 0 && isBond(input.bond)) {
                value = input.bond._value
            }
            values[input.name] = value
            return values
        }, values || {})
    }

    handleChange(e, data, index, input) {
        const { name, onChange: onInputChange } = input
        let { inputs } = this.state
        const { onChange: formOnChange } = this.props
        let { values } = this.state
        const { value } = data
        values[name] = value
        inputs[index].value = value
        // update values of other inputs
        values = this.getValues(inputs, -1, values)
                
        // trigger input items's onchange callback
        isFn(onInputChange) && onInputChange(e, values, index)
        // trigger form's onchange callback
        isFn(formOnChange) && formOnChange(e, values, index)
        this.setState({inputs, values})
    }

    handleClose() {
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

        const submitBtn = React.isValidElement(submitText) || submitText === null ? submitText : (
            <Button
                content={submitText}
                disabled={isFormInvalid(inputs, values) || submitDisabled || message.error || success}
                onClick={this.handleSubmit}
                positive
            />
        )

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
                <Modal.Content>
                    {form}
                </Modal.Content>
                {!hideFooter && (
                    <Modal.Actions>
                        <Button
                            content={closeText}
                            negative
                            onClick={handleClose}
                        />
                        {submitBtn}
                    </Modal.Actions> 
                )}
                {message && !!message.status && (
                    <Message
                        {...message}
                        content={message.content}
                        header={message.header}
                        error={message.status==='error'}
                        style={objCopy(
                            styles.formMessage,
                            message.style || {textAlign: !message.header || !message.content ? 'center' : 'left'}
                        )}
                        success={message.status==='success'}
                        visible={!!message.status}
                        warning={message.status==='warning'}
                    />
                )}
            </Modal>
        )
    }
}

FormBuilder.propTypes = {
    closeOnSubmit: PropTypes.bool,
    closeText: PropTypes.string,
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
    submitText: PropTypes.string,
    success: PropTypes.bool,
    trigger: PropTypes.element,
    widths: PropTypes.string
}
FormBuilder.defaultProps = {
    closeText: 'Cancel',
    message: {
        // Status controls visibility and style of the message
        // Supported values: error, warning, success
        status: '', 
        // see https://react.semantic-ui.com/collections/message/ for more options
    },
    submitText: 'Submit'
}
export default FormBuilder

export class FormInput extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleChange = this.handleChange.bind(this)
    }

    handleChange(event, data) {
        const { onChange, falseValue, trueValue, type } = this.props
        // Forces the synthetic event and it's value to persist
        // Required for use with deferred function
        isFn(event.persist) && event.persist();
        if (!isFn(onChange)) return;
        if ([ 'checkbox', 'radio'].indexOf(type) >= 0) {
            // Sematic UI's Checkbox component only supports string and number as value
            // This allows support for any value types
            data.value = data.checked ? (
                isDefined(trueValue) ? trueValue : true
            ) : (
                isDefined(falseValue) ? falseValue : false   
            )
        }

        onChange(event, data || {}, this.props)
    }

    render() {
        const { handleChange } = this
        const { inline, label, message, required, type, useInput, width } = this.props
        let hideLabel = false
        let inputEl = ''
        const msg = message && (message.content || message.list || message.header) ? message : undefined
        // Remove attributes that are used by the form or Form.Field but
        // shouldn't be used or may cause error when using with inputEl
        const nonAttrs = [ 'deferred', 'inline', 'invalid', 'label', 'useInput' ]
        let attrs = objWithoutKeys(this.props, nonAttrs) //objCopy(this.props)
        attrs.onChange = handleChange
        const messageEl = !msg ? '' : (
            <Message
                {...msg}
                content={msg.content}
                error={msg.status==='error'}
                header={msg.header}
                icon={msg.icon}
                info={msg.info}
                list={msg.list}
                size={msg.size}
                success={msg.status==='success'}
                visible={!!msg.status}
                warning={msg.status==='warning'}
            />
        )

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
                attrs.error = attrs.error || (msg && msg.status==='error')
                attrs.fluid = !useInput ? undefined : attrs.fluid
                inputEl = !useInput ? <Form.Input {...attrs} /> : <Input {...attrs} />
        }

        return ['group'].indexOf(type.toLowerCase() < 0) ? (
            <Form.Field width={width} required={required}> 
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
        super(props)
        const allowMultiple = !props.radio && props.multiple
        this.state = {
            allowMultiple,
            value: props.value || (allowMultiple ? [] : undefined)
        }
        this.handleChange = this.handleChange.bind(this)
    }

    handleChange(e, data) {
        isObj(e) && isFn(e.persist) && e.persist()
        const { onChange } = this.props
        let { allowMultiple, value } = this.state
        const {checked, value: val} = data
        if (!allowMultiple) {
            value = checked ? val : undefined
        } else {
            checked ? value.push(val) : value.splice(value.indexOf(val), 1)
        }
        data.value = value

        this.setState({value})
        isFn(onChange) && onChange(e, data)
    }

    render() {
        const { inline, name, options, style, type } = this.props
        const { allowMultiple, value } = this.state
        const excludeKeys = ['inline', 'multiple', 'name', 'required', 'type', 'value', 'width']
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
                        style={objCopy(style, {margin: '0 5px'})}
                        type="checkbox"
                        value={option.value}
                    />
                ))}
            </div>
        )
    }
}

export const fillValues = (inputs, obj, forceFill) => {
    if (!isObj(obj)) return;
    inputs.forEach(input => {
        if (!input.hasOwnProperty('name') || !obj.hasOwnProperty(input.name) || (!forceFill && isDefined(input.value))) return;
        if(['accountidbond', 'inputbond'].indexOf(input.type.toLowerCase()) >= 0) {
            input.defaultValue = obj[input.name]
            // make sure Bond is also updated
            isBond(input.bond) && input.bond.changed(input.defaultValue)
        } else {
            input.value = obj[input.name]
        }
    })
}

export const resetValues = inputs => inputs.map(input => { input.value = undefined; return input})

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