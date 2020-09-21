import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button, Form, Header, Icon, Modal } from 'semantic-ui-react'
import { isDefined, isArr, isBool, isBond, isFn, isObj, isStr, hasValue } from '../utils/utils'
import Message from '../components/Message'
import FormInput, { nonValueTypes } from './FormInput'
import IModal from './Modal'
import Text from './Text'
import { translated } from '../services/language'
import Invertible from './Invertible'

const textsCap = translated({
    unexpectedError: 'an unexpected error occured',
}, true)[0]

export default class FormBuilder extends Component {
    constructor(props) {
        super(props)

        const { inputs, open } = props
        this.state = {
            open,
            values: this.getValues(inputs),
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount = () => this._mounted = true
    componentWillUnmount = () => this._mounted = false

    // recursive interceptor for infinite level of child inputs
    addInterceptor = (index, values) => (input, i) => {
        const { inputsDisabled = [] } = this.props
        const { disabled, hidden, inputs: childInputs, key, name, type, validate: validate } = input || {}
        const isGroup = `${type}`.toLowerCase() === 'group' && isArr(childInputs)
        index = isDefined(index) ? index : null
        return {
            ...input,
            disabled: inputsDisabled.includes(name) || (isFn(disabled) ? disabled(value, i) : disabled),
            hidden: !isFn(hidden) ? hidden : !!hidden(values, i),
            inputs: !isGroup ? undefined : childInputs.map(this.addInterceptor(index ? index : i, values)),
            key: key || i + name,
            onChange: isGroup ? undefined : (e, data) => this.handleChange(
                e,
                data,
                input,
                index ? index : i,
                index ? i : undefined
            ),
            validate: isFn(validate) ? ((e, v) => validate(e, v, this.state.values)) : undefined,
        }
    }

    getValues = (inputs = [], values = {}, inputName, newValue) => inputs.reduce((values, input) => {
        const { inputs: childInputs, groupValues, multiple, name, type } = input
        const typeLC = (type || '').toLowerCase()
        const isGroup = typeLC === 'group'
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
        }
        if (!hasValue(values[name]) && isDefined(input.value)) {
            values[name] = input.value
        }
        if (multiple && type === 'dropdown' && !isArr(values[name])) {
            // dropdown field with `multiple` -> value must always be an array 
            values[name] = []
        }
        return values
    }, values)

    handleChange = async (event, data, input, index, childIndex) => {
        try {
            const { name, onChange: onInputChange } = input
            let { inputs } = this.props
            const { onChange: formOnChange } = this.props
            let { values } = this.state
            const { value } = data
            input._invalid = data.invalid
            input.value = value
            values = this.getValues(inputs, values, name, value)
            this.setState({ message: null, inputs, values })
            // trigger input items's onchange callback
            isFn(onInputChange) && !data.invalid && await onInputChange(
                event,
                values,
                index,
                childIndex,
            )

            // trigger form's onchange callback
            isFn(formOnChange) && !data.invalid && await formOnChange(
                event,
                values,
                index,
                childIndex,
            )
        } catch (err) {
            console.error(err)
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

    handleClose = event => {
        event.preventDefault()
        const { onClose } = this.props
        if (isFn(onClose)) return onClose();
        this.setState({ open: !this.state.open })
    }

    handleSubmit = async (event) => {
        try {
            event.preventDefault()
            const { onSubmit } = this.props
            const { values } = this.state
            isFn(onSubmit) && await onSubmit(event, values)
            this.setState({ message: null })
        } catch (err) {
            console.error(err)
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
            inputs,
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
        let { message: sMsg, open: sOpen, values } = this.state
        // whether the 'open' status is controlled or uncontrolled
        let modalOpen = isFn(onClose) ? open : sOpen
        if (success && closeOnSubmit) {
            modalOpen = false
            isFn(onClose) && onClose({}, {})
        }
        msg = sMsg || msg
        const msgStyle = { ...(modal ? styles.messageModal : styles.messageInline), ...(msg || {}).style }
        const message = { ...msg, style: msgStyle }
        let submitBtn, closeBtn
        submitDisabled = !isObj(submitDisabled) ? !!submitDisabled : (
            Object.values(submitDisabled).filter(Boolean).length > 0
        )
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
            <Invertible {...{
                El: Form,
                error: message.status === 'error',
                loading: loading,
                onSubmit: onSubmit,
                style: style,
                success: success || message.status === 'success',
                warning: message.status === 'warning',
                widths: widths,
            }} >
                {inputs.map(this.addInterceptor(null, values)).map(props => <FormInput {...props} />)}
                {/* Include submit button if not a modal */}
                {!modal && !hideFooter && (
                    <div>
                        {submitBtn}
                        {msg && <Message {...message} />}
                    </div>
                )}
            </Invertible>
        )

        return !modal ? form : (
            <IModal
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
                <div className='modal-close' style={styles.closeButton}>
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
                        {subheader && (
                            <Header.Subheader>
                                <Text>{subheader}</Text>
                            </Header.Subheader>
                        )}
                    </Header>
                )}
                <Modal.Content>{form}</Modal.Content>
                {!hideFooter && (
                    <Modal.Actions>
                        {closeBtn}
                        {submitBtn}
                    </Modal.Actions>
                )}
                {msg && <Message {...message} />}
            </IModal>
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
    submitDisabled: PropTypes.oneOfType([
        PropTypes.bool,
        // submit button will be disabled if one or more values is truthy
        PropTypes.object,
    ]),
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

/**
 * @name    fillValues
 * @summary fill values into array of inputs
 * @param   {Array}     inputs 
 * @param   {Object}    values values to fill into the input. Property name/key is the name of the input.
 * @param   {Boolean}   forceFill whether to override existing, if any.
 * 
 * @returns {Array} inputs
 */
export const fillValues = (inputs, values, forceFill) => {
    if (!isObj(values)) return
    Object.keys(values).forEach(name => {
        const input = findInput(inputs, name)
        if (!input) return
        let { bond, type } = input
        const newValue = values[name]
        type = (isStr(type) ? type : 'text').toLowerCase()
        if (type !== 'group' && (
            !forceFill && (
                !hasValue(newValue) || hasValue(input.value)
            )
        )) return

        switch (type) {
            case 'checkbox':
            case 'radio':
                input.defaultChecked = newValue
                break
            case 'group':
                fillValues(input.inputs, values, forceFill)
                break
            default:
                input.value = newValue
        }

        // make sure Bond is also updated
        if (!isBond(bond)) return
        setTimeout(() => bond.changed(newValue))
    })

    return inputs
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
    messageInline: {
        padding: 15,
    },
    messageModal: {
        margin: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    header: {
        textTransform: 'capitalize',
    }
}