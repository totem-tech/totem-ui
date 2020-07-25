import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button, Form, Header, Icon, Modal } from 'semantic-ui-react'
import { isDefined, isArr, isBool, isBond, isFn, isObj, isStr, hasValue } from '../utils/utils'
import Message from '../components/Message'
import FormInput, { nonValueTypes } from './FormInput'
import { translated } from '../services/language'

const textsCap = translated({
    unexpectedError: 'an unexpected error occured',
}, true)[0]

export default class FormBuilder extends Component {
    constructor(props) {
        super(props)

        const { inputsDisabled = [], inputs = [], open } = props
        inputs.forEach(x => ({ ...x, controlled: isDefined(x.value) }))
        // disable inputs
        inputsDisabled.forEach(name => (findInput(inputs, name) || {}).disabled = true)

        this.state = {
            inputs,
            open,
            values: this.getValues(inputs)
        }

    }

    getValues = (inputs = [], values = {}, inputName, newValue) => inputs.reduce((values, input, i) => {
        const { controlled, inputs: childInputs, groupValues, name, type } = input
        const typeLC = (type || '').toLowerCase()
        const isGroup = typeLC === 'group'
        let value
        if (!isStr(name) || nonValueTypes.includes(type)) return values
        if (isGroup) {
            const newValues = this.getValues(childInputs, groupValues ? {} : values, inputName, newValue)
            if (!groupValues) return newValues
            values[name] = newValues
            return values
        }
        if (inputName && name === inputName) {
            // for value grouping
            values[name] = newValue
        } //else {
        value = values[name]
        value = !(controlled ? hasValue : isDefined)(value) ? input.value : value
        values[name] = value
        //}
        return values
    }, values)

    handleChange = async (event, data, input, index, childIndex) => {
        const { name, onChange: onInputChange } = input
        let { inputs } = this.state
        const { onChange: formOnChange } = this.props
        let { values } = this.state
        const { value } = data
        input._invalid = data.invalid
        input.value = value
        values = this.getValues(inputs, values, name, value)

        try {
            // trigger input items's onchange callback
            isFn(onInputChange) && !data.invalid && await onInputChange(event, values, index, childIndex)
            // trigger form's onchange callback
            isFn(formOnChange) && await formOnChange(event, values, index, childIndex)
            this.setState({ inputs, values })
        } catch (err) {
            this.setState({
                message: {
                    content: `${err}`,
                    header: textsCap.unexpectedError,
                    showIcon: true,
                    status: 'error',
                }
            })
        }
    }

    handleClose = e => {
        e.preventDefault()
        const { onClose } = this.props
        if (isFn(onClose)) return onClose();
        this.setState({ open: !this.state.open })
    }

    handleSubmit = async (event) => {
        event.preventDefault()
        const { onSubmit } = this.props
        const { values } = this.state
        try {
            isFn(onSubmit) && await onSubmit(event, values)
        } catch (err) {
            this.setState({
                message: {
                    content: `${err}`,
                    header: textsCap.unexpectedError,
                    showIcon: true,
                    status: 'error',
                }
            })
        }
    }

    render() {
        let {
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
        let { inputs, message: sMsg, open: sOpen, values } = this.state
        // whether the 'open' status is controlled or uncontrolled
        let modalOpen = isFn(onClose) ? open : sOpen
        if (success && closeOnSubmit) {
            modalOpen = false
            isFn(onClose) && onClose({}, {})
        }
        msg = sMsg || msg
        const message = isObj(msg) && msg || {}
        // recursive interceptor for infinite level of child inputs
        const addInterceptor = index => (input, i) => {
            const { hidden, inputs: childInputs, key, name, type } = input || {}
            const isGroup = (type || '').toLowerCase() === 'group' && isArr(childInputs)
            index = isDefined(index) ? index : null
            return {
                ...input,
                hidden: !isFn(hidden) ? hidden : !!hidden(values, i),
                inputs: !isGroup ? undefined : childInputs.map(addInterceptor(index ? index : i)),
                key: key || i + name,
                onChange: isGroup ? undefined : (e, data) => this.handleChange(
                    e,
                    data,
                    input,
                    index ? index : i,
                    index ? i : undefined
                ),
            }
        }
        inputs = inputs.map(addInterceptor())

        let submitBtn, closeBtn
        const shouldDisable = submitDisabled || success || isFormInvalid(inputs, values)
        submitText = !isFn(submitText) ? submitText : submitText(values, shouldDisable)
        if (submitText !== null) {
            const submitProps = !isObj(submitText) ? {} : (
                React.isValidElement(submitText) ? { ...submitText.props } : submitText
            )

            const { content, disabled, onClick, positive } = submitProps
            submitProps.content = content || (!isStr(submitText) ? content : submitText)
            submitProps.disabled = isBool(disabled) ? disabled : shouldDisable
            submitProps.onClick = isFn(onClick) ? onClick : this.handleSubmit
            submitProps.positive = isDefined(positive) ? positive : true
            submitBtn = <Button {...submitProps} />
        }
        if (modal && closeText !== null) {
            const closeProps = React.isValidElement(closeText) ? { ...closeText.props } : {}
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
                {inputs.map(props => <FormInput {...props} />)}
                {/* Include submit button if not a modal */}
                {!modal && !hideFooter && (
                    <div>
                        {submitBtn}
                        {message && <Message {...message} />}
                    </div>
                )}
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
                        <Header.Content style={styles.header}>
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
                {message && <Message {...message} />}
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
    // disable inputs on load
    inputsDisabled: PropTypes.arrayOf(PropTypes.string),
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
        PropTypes.element,
        // @submitText can be a function
        //
        // Params: 
        // @values          object: all input values in a single object
        // @shouldDisable   boolean: whether the button should be disabled according to FormBuild's default logic
        // 
        // Expected return: one fo the following
        //          - string: button text
        //          - button properties as object: any property supported by Semantic UI's Button component and HTML <button>
        //          - React element: a valid JSX element
        PropTypes.func,
        PropTypes.string,
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
        )) return

        if (['checkbox', 'radio'].indexOf(type) >= 0) {
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

export const resetValues = (inputs = []) => inputs.map(input => {
    if ((input.type || '').toLowerCase() === 'group') {
        resetValues(input.inputs)
    } else {
        input.value = undefined;
    }
    return input
})

export const isInputInvalid = (formValues = {}, input) => {
    const inType = (input.type || 'text').toLowerCase()
    const isCheckbox = ['checkbox', 'radio'].indexOf(inType) >= 0
    const isGroup = inType === 'group'
    const isRequired = !!input.required
    // ignore current input if conditions met
    if (
        // input's type is invalid
        !inType
        // current input is hidden
        || (inType === 'hidden' || input.hidden === true)
        // current input is not required and does not have a value
        || (!isGroup && !isRequired && !hasValue(formValues[input.name]))
        // not a valid input type
        || ['button'].indexOf(inType) >= 0) return false;

    // if input is set invalid externally or internally by FormInput
    if (input.invalid || input._invalid) return true

    // Use recursion to validate input groups
    if (isGroup) return isFormInvalid(input.inputs, !input.groupValues ? formValues : formValues[input.name] || {})
    const value = isDefined(formValues[input.name]) ? formValues[input.name] : input.value
    return isCheckbox && isRequired ? !value : !hasValue(value)
}

export const isFormInvalid = (inputs = [], values = {}) => inputs.reduce((invalid, input) => {
    return invalid || isInputInvalid(values, input)
}, false)

// findInput returns the first item matching supplied name.
// If any input type is group it will recursively search in the child inputs as well
export const findInput = (inputs, name) => inputs.find(x => x.name === name) || (
    inputs.filter(x => x.type === 'group').reduce((input, group = {}) => {
        return input || findInput(group.inputs || [], name)
    }, undefined)
)
// show message on a input or if input name not found/undefined, show form message
// Should be used with a form component and be invoked with .call/.apply
export function showMessage(inputName, content, status, header) {
    const { inputs } = this.state
    const message = { content, header, status }
    const input = findInput(inputs, inputName)
    if (!input) this.setState({ message })

    input.message = message
    input.invalid = status === 'error'
    this.setState({ inputs })
}

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