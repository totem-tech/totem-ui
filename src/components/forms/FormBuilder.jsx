import React from 'react'
import PropTypes from 'prop-types'
import { Button, Checkbox, Form, Header, Icon, Input, Label, Message, Modal, Rail, Segment } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { isFn, IfMobile } from '../utils';

class FormBuilder extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            values: {}
        }

        this.handleChange = this.handleChange.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
    }

    handleChange(e, input, checkbox){
        const isCheckbox = [ 'checkbox', 'radio' ].indexOf(type) >= 0
        const { name, onChange: onInputChange, type } = input
        const { onChange } = this.props
        const { values } = this.state
        let { value } = isCheckbox ? checkbox : e.target
        values[name] = value
        this.setState({values})
        isFn(onInputChange) && onInputChange(e, values)
        isFn(onChange) && setTimeout(()=>onChange(e, values), 50)
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
            modal, /// todo: if false return form without the modal to be used normally
            onCancel,
            onChange,
            onClose,
            onOpen,
            onSubmit,
            open,
            size,
            subheader,
            submitText,
            success,
            trigger,
            widths
        } = this.props

        const msg = message || {}
        const closeIcon = mobile => () => (
            <Rail internal position='right' close style={styles[mobile ? 'closeButtonRailMobile' : 'closeButtonRail']}>
                <Icon link name='times circle outline' color="grey" size="mini" onClick={onClose} />
            </Rail>
        )
        
        const submitBtn = (
            <Button
                content={submitText || 'Submit'}
                disabled={success || msg.error}
                onClick={this.handleSubmit}
                positive
            />
        )
        const form = (
            <Form 
                // onChange={this.handleChange }
                error={msg.status === 'error'}
                success={success || msg.status === 'success'}
                onSubmit={onSubmit}
                warning={msg.status === 'warning'}
                widths={widths}
            >
                {Array.isArray(inputs) && inputs.map((input, i) => <FormInput key={i} {...input} onChange={(e) => this.handleChange(e, input, i)} />)}
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
                <IfMobile then={closeIcon(true)} else={closeIcon(false)} />
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
    onSubmit: PropTypes.func,
    open: PropTypes.bool,
    subheader: PropTypes.string,
    trigger: PropTypes.element
}

export default FormBuilder

export const FormInput = (props) => {
    let inputEl = ''
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
                    onChange={function(e, checkbox){e.persist(); isFn(props.onChange) && props.onChange(e, props, checkbox)}}
                    radio={isRadio}
                    readOnly={props.readOnly}
                    required={props.required}
                    slider={props.slider}
                    toggle={!isRadio && props.toggle}
                    type="checkbox"
                    value={props.value}
                />
            )
            break;
        case 'group':
            // ToDO: test input group with multiple inputs
            inputEl = props.inputs.map((subInput, i) => <FormInput key={i} {...subInput} />)
            break;
        default:
            const msgError = message && message.status==='error'
            inputEl =  ( 
                <Form.Input
                    action={props.action}
                    actionPosition={props.actionPosition}
                    disabled={props.disabled}
                    focus={props.focus}
                    error={props.error || msgError}
                    icon={props.icon}
                    iconPosition={props.iconPosition}
                    label={props.label}
                    minLength={props.minlength}
                    maxLength={props.maxLength}
                    min={props.min}
                    max={props.max}
                    name={props.name || i}
                    onChange={function(e){e.persist(); isFn(props.onChange) && props.onChange(e, props)}}
                    placeholder={props.placeholder}
                    readOnly={props.readOnly}
                    required={props.required}
                    type={props.type}
                    width={props.width}
                />
            )
    }

    return props.type !== 'group' ? (
        <Form.Field>                             
            {inputEl}
            {message}
        </Form.Field>
    ) : (
        <Form.Group>
            {inputEl}
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
    icon: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string
    ]),
    actionPosition: PropTypes.string,
    disabled: PropTypes.bool,
    error: PropTypes.bool,
    focus: PropTypes.bool,
    inputs: PropTypes.array,
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
    value: PropTypes.oneOfType([    // For checkbox/radio
        PropTypes.number,
        PropTypes.string
    ]),
    width: PropTypes.number
}

FormInput.defaultProps = {
    type: 'text',
    width: 16
}

const styles = {
    closeButtonRail: {
        marginTop: 5,
        marginRight: 10,
        padding: 0,
        fontSize: 70
    },
    closeButtonRailMobile: {
        marginTop: -40,
        marginRight: 0,
        padding: 0,
        fontSize: 70
    },
    formMessage: { marginTop: 0 }
}