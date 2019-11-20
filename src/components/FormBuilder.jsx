import React from 'react'
import PropTypes from 'prop-types'
import { Button, Checkbox, Dropdown, Form, Header, Icon, Input, Modal, TextArea } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { isDefined, isArr, isBool, isBond, isFn, isObj, isStr, objCopy, objWithoutKeys, newMessage, hasValue, objReadOnly, isValidNumber, arrReadOnly } from '../utils/utils';
import { InputBond } from '../InputBond'
import { AccountIdBond } from '../AccountIdBond'
import FormInput from './FormInput'

class FormBuilder extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            inputs: props.inputs,
            open: props.open,
            values: this.getValues(props.inputs)
        }
        this.state.inputs.forEach(x => ({ ...x, controlled: isDefined(x.value) }))

        this.handleChange = this.handleChange.bind(this)
        this.handleClose = this.handleClose.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
    }

    getValues(inputs = [], values = {}) {
        return inputs.reduce((values, input, i) => {
            const { bond, inputs, name, controlled, type } = input
            const typeLC = (type || '').toLowerCase()
            const isGroup = typeLC === 'group'
            if (!isDefined(name)) return values
            if (isGroup) return this.getValues(inputs, values)
            let value = values[name]
            value = !(controlled ? hasValue : isDefined)(value) ? input.value : value
            if (['accountidbond', 'inputbond'].indexOf(typeLC) >= 0 && isBond(bond)) {
                value = bond._value
            }
            values[name] = value
            return values
        }, values)
    }

    handleChange(e, data, index, input, childIndex) {
        const { name, onChange: onInputChange } = input
        let { inputs } = this.state
        const { onChange: formOnChange } = this.props
        let { values } = this.state
        const { value } = data
        // const updateBond = isBond(input.bond) && input.type.toLowerCase() !== 'checkbox-group'
        inputs[index]._invalid = data.invalid
        values[name] = value
        if (isDefined(childIndex)) {
            inputs[index].inputs[childIndex].value = value
        } else {
            inputs[index].value = value
        }
        // update values of other inputs
        values = this.getValues(inputs, values)
        // updateBond && input.bond.changed(value)

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
            message: msg,
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
        const message = isObj(msg) && msg || {}

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
                    <Header as={Modal.Header} style={styles.header}>
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
                        {closeBtn}
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

export const fillValues = (inputs, values, forceFill) => {
    if (!isObj(values)) return
    inputs.forEach(input => {
        let { bond, name, type } = input
        const newValue = values[input.name]
        type = (isStr(type) ? type : 'text').toLowerCase()
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
            input.value = newValue
        }
        // make sure Bond is also updated
        if (!isBond(bond)) return
        setTimeout(() => bond.changed(newValue))
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
    const inType = (input.type || 'text').toLowerCase()
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
    },
    header: {
        textTransform: 'capitalize',
    }
}