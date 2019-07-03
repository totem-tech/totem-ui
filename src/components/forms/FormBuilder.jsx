import React from 'react'
import PropTypes from 'prop-types'
import { Button, Dropdown, Form, Header, Icon, Input, Message, Modal, TextArea } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { isDefined, isFn, isObj, objCopy } from '../utils';

// ToDo: automate validation process by checking for data on input change
//       and prevent submission of form if data is invalid and/or required field in empty
class FormBuilder extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            inputs: props.inputs,
            open: props.open,
            values: {}
        }

        this.handleChange = this.handleChange.bind(this)
        this.handleClose = this.handleClose.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
    }

    handleChange(e, data, index, input){
        const { name, onChange: onInputChange } = input
        const { inputs } = this.state
        const { onChange: formOnChange } = this.props
        const { values } = this.state
        const { value} = data
        values[name] = value
        if (input.hasOwnProperty('value')) {
            // controlled input
            inputs[index].value = value
        }
        this.setState({inputs, values})
        
        // trigger input items's onchange callback
        isFn(onInputChange) && onInputChange(e, values, index)
        // trigger form's onchange callback
        isFn(formOnChange) && formOnChange(e, values, index)
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
            closeText,
            defaultOpen,
            header,
            headerIcon,
            message,
            modal,
            onClose,
            onOpen,
            onSubmit,
            open,
            size,
            subheader,
            submitDisabled,
            submitText,
            success,
            trigger,
            widths
        } = this.props
        const { handleClose } = this
        const { inputs, open: sOpen } = this.state
        // whether the 'open' status is controlled or uncontrolled
        const modalOpen = isFn(onClose) ? open : sOpen
        
        const submitBtn = (
            <Button
                content={submitText || 'Submit'}
                disabled={submitDisabled || success || message.error}
                onClick={this.handleSubmit}
                positive
            />
        )
        const form = (
            <Form 
                error={message.status === 'error'}
                success={success || message.status === 'success'}
                onSubmit={onSubmit}
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
                {!modal && submitBtn}
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
                        size="big"
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
                <Modal.Actions>
                    <Button
                        content={closeText || 'Cancel'}
                        negative
                        onClick={handleClose}
                    />
                    {submitBtn}
                </Modal.Actions>
                {message && !!message.status && (
                    <Message
                        content={message.content}
                        error={message.status==='error'}
                        header={message.header}
                        icon={message.icon}
                        info={message.info}
                        list={message.list}
                        size={message.size}
                        style={styles.formMessage}
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
    header: PropTypes.string,
    headerIcon: PropTypes.string,
    message: PropTypes.object,
    onSubmit: PropTypes.func,
    open: PropTypes.bool,
    subheader: PropTypes.string,
    trigger: PropTypes.element
}
FormBuilder.defaultProps = {
    message: {}
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
        event.persist();
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
        let attrs = objCopy(this.props)
        const msg = message && (message.content || message.list || message.header) ? message : undefined
        // Remove attributes that shouldn't be used or may cause error when using with inputEl
        const nonAttrs = [ 'inline', 'label', 'useInput' ]
        nonAttrs.forEach(key => isDefined(attrs[key])  && delete attrs[key])
        attrs.onChange = handleChange
        const messageEl = !msg ? '' : (
            <Message
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
            case 'button':
                inputEl = <Button {...attrs} />
                break;
            case 'checkbox':
            case 'radio':
                const isRadio = type === 'radio'
                attrs.toggle = !isRadio && attrs.toggle
                attrs.type = "checkbox"
                hideLabel = true
                inputEl = <Form.Checkbox {...attrs} label={label}/>
                break;
            case 'dropdown':
                inputEl = <Dropdown {...attrs} />
                break;
            case 'group':
                // ToDO: test input group with multiple inputs
                inputEl = attrs.inputs.map((subInput, i) => <FormInput key={i} {...subInput} />)
                break;
            case 'textarea':
                // ToDO: test input group with multiple inputs
                inputEl = <TextArea {...attrs} />
                break;
            default:
                attrs.error = attrs.error || (msg && msg.status==='error')
                attrs.fluid = !useInput ? undefined : attrs.fluid
                inputEl = !useInput ? <Form.Input {...attrs} /> : <Input {...attrs} />
        }

        return type !== 'group' ? (
            <Form.Field inline={inline} width={width} required={required}> 
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
    icon: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string
    ]),
    actionPosition: PropTypes.string,
    disabled: PropTypes.bool,
    error: PropTypes.bool,
    fluid: PropTypes.bool,
    focus: PropTypes.bool,
    inputs: PropTypes.array,
    // Whether to use Semantic UI's Input or Form.Input component. Truthy => Input, Falsy (default) => Form.Input
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
    type: PropTypes.string,
    value: PropTypes.any,
    width: PropTypes.number
}

FormInput.defaultProps = {
    type: 'text',
    width: 16
}

export const fillValues = (inputs, obj, forceFill) => {
    if (!isObj(obj)) return;
    inputs.forEach(input => {
        if (!input.hasOwnProperty('name') || !obj.hasOwnProperty(input.name) || (!forceFill && isDefined(input.value))) return;
        input.value = obj[input.name]
    })
}

const styles = {
    closeButton: {
        position: 'absolute',
        top: 5,
        right: 5
    },
    formMessage: {
        marginTop: 0
    }
}