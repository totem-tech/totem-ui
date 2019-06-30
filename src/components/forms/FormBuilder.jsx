import React from 'react'
import PropTypes from 'prop-types'
import { Button, Dropdown, Form, Header, Icon, Input, Message, Modal, TextArea } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { isDefined, isFn, objCopy } from '../utils';

// ToDo: automate validation process by checking for data on input change
//       and prevent submission of form if data is invalid and/or required field in empty
class FormBuilder extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            values: {}
        }

        this.handleChange = this.handleChange.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
    }

    handleChange(e, input, checkbox, index){
        const { name, onChange: onInputChange, type } = input
        // Ignore any input that does not have a name
        // if (name === undefined) return;
        const { onChange: formOnChange } = this.props
        const { values } = this.state
        const isCheckbox = [ 'checkbox', 'radio' ].indexOf(type) >= 0
        values[name] = !isCheckbox ? e.target.value : (checkbox.checked ? checkbox.value : undefined)
        this.setState({values})
        // trigger input items's onchange callback
        isFn(onInputChange) && onInputChange(e, values, index)
        // trigger form's onchange callback
        isFn(formOnChange) && setTimeout(()=>formOnChange(e, values, index), 50)
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
            inputs,
            modal,
            onCancel,
            onChange,
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
                        onChange={(e, _, checkbox) => this.handleChange(e, input, checkbox, i)}
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
                onClose={onClose}
                onOpen={onOpen}
                open={open}
                size={size}
                trigger={trigger}
            >        
                <div style={styles.closeButton}>
                    <Icon
                        className="no-margin"
                        color="grey" 
                        link
                        name='times circle outline'
                        onClick={onClose}
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
                        onClick={(e) => { e.preventDefault(); onCancel && onCancel(); }}
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

export const FormInput = (propsOriginal) => {
    let inputEl = ''
    const props = objCopy(propsOriginal)
    const message = props.message && (
        <Message
            content={props.message.content}
            error={props.message.status==='error'}
            header={props.message.header}
            icon={props.message.icon}
            info={props.message.info}
            list={props.message.list}
            size={props.message.size}
            success={props.message.status==='success'}
            visible={!!props.message.status}
            warning={props.message.status==='warning'}
        />
    )

    const handleChange = (e, checkbox) => {
        // Forces the synthetic event and it's value to persist
        // Required for use with deferred function
        e.persist();
        if (!isFn(props.onChange)) return;
        if ([ 'checkbox', 'radio'].indexOf(props.type) >= 0) {
            // Sematic UI's Checkbox component only supports string and number as value
            // This allows support for any value types
            checkbox.value = checkbox.checked ? (
                isDefined(props.trueValue) ? props.trueValue : true
            ) : (
                isDefined(props.falseValue) ? props.falseValue : false   
            )
        }
        // If input type is checkbox or radio event (e) won't have a value 
        // as it's fired by label associated with it (blame Semantic UI)
        // and the second parameter (checkbox) will be included.
        // To prevent errors or mistakes, return empty object for other types
        props.onChange(e, props, checkbox || {})
    }

    switch(props.type) {
        case 'checkbox':
        case 'radio':
            const isRadio = props.type === 'radio'
            inputEl = (
                <Form.Checkbox
                    checked={props.checked}
                    defaultChecked={props.defaultChecked}
                    disabled={props.disabled}
                    label={props.label}
                    name={props.name || i}
                    onChange={handleChange}
                    radio={isRadio}
                    readOnly={props.readOnly}
                    required={props.required}
                    slider={props.slider}
                    toggle={!isRadio && props.toggle}
                    type="checkbox"
                    // value={props.value}
                />
            )
            break;
        case 'dropdown':
            const dd = <Dropdown {...props} onChange={handleChange} />
            inputEl = props.label ? <label>{props.label} {dd}</label> : dd
            break;
        case 'group':
            // ToDO: test input group with multiple inputs
            inputEl = props.inputs.map((subInput, i) => <FormInput key={i} {...subInput} />)
            break;
        case 'textarea':
            // ToDO: test input group with multiple inputs
            const hasLabel = !!props.label
            const ta = <TextArea {...props} />
            inputEl = (
                <React.Fragment>
                   {hasLabel && <label>{props.label}</label>}
                   {ta}
                </React.Fragment>
            )
            break;
        default:
            const msgError = message && message.status==='error'
            const inputProps = {
                action: props.action,
                actionPosition: props.actionPosition,
                disabled: props.disabled,
                defaultValue: props.defaultValue,
                fluid: !props.useInput ? undefined : props.fluid,
                focus: props.focus,
                error: props.error || msgError,
                icon: props.icon,
                iconPosition: props.iconPosition,
                label: props.label,
                minLength: props.minlength,
                maxLength: props.maxLength,
                min: props.min,
                max: props.max,
                name: props.name || i,
                onChange: handleChange,
                placeholder: props.placeholder,
                readOnly: props.readOnly,
                required: props.required,
                type: props.type,
                width: props.width,
                value: props.value
            }
    
            inputEl = !props.useInput ? <Form.Input {...inputProps} /> : <Input {...inputProps} />
    }

    return props.type !== 'group' ? (
        <Form.Field inline={props.inline}>                             
            {inputEl}
            {message}
        </Form.Field>
    ) : (
        <Form.Group>
            {inputEl}
            {message}
        </Form.Group>
    )
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
    // Whether to use Semantic UI's Form.Input or Input component. Truthy => Input, Falsy (default) => Form.Input
    // Cannot use bool as it throws error on other inputs due to mass props passthrough
    useInput: PropTypes.string,
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