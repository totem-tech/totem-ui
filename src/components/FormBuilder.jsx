import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button, Form, Header, Icon, Modal } from 'semantic-ui-react'
import { BehaviorSubject } from 'rxjs'
import {
	isDefined,
	isArr,
	isBool,
	isFn,
	isObj,
	isStr,
	hasValue,
	isSubjectLike,
} from '../utils/utils'
import Message, { statuses } from '../components/Message'
import FormInput from './FormInput'
import IModal from './Modal'
import { translated } from '../services/language'
import { Invertible } from './Invertible'
import { closeModal } from '../services/modal'
import { MOBILE, rxLayout } from '../services/window'

const textsCap = translated({
	cancel: 'cancel',
	close: 'close',
	submit: 'submit',
	unexpectedError: 'an unexpected error occured',
}, true)[1]

class FormBuilder extends Component {
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

	componentWillMount = () => (this._mounted = true)
	componentWillUnmount = () => (this._mounted = false)

	// recursive interceptor for infinite level of child inputs
	addInterceptor = (values, parentIndex) => (input, index) => {
		parentIndex = isDefined(parentIndex) ? parentIndex : null
		const {
			inputsDisabled = [],
			inputsHidden = [],
			inputsReadOnly = [],
		} = this.props
		let {
			action = {},
			content,
			disabled,
			hidden,
			inlineLabel = {},
			inputs: childInputs,
			key,
			name,
			readOnly,
			rxValue,
			type,
			validate,
		} = input || {}
		const typeLC = `${type || 'text'}`.toLowerCase()
		const isGroup = typeLC === 'group' && isArr(childInputs)
		// add type="button" to prevent action/label button trigger when enter is pressed in any inputs
		const arr = [action, inlineLabel]
		arr.forEach(btn => {
			if (!isObj(btn)) return
			if (!isFn(btn.onClick)) return
			btn.type = btn.type || 'button'
		})

		const handleValidate = (event, data = {}) => validate(
			event,
			data,
			{
				...this.state.values,
					// this is required because onChange() is trigger after validate().
				// otherwise, current input will have the old value or last character missing for text/number inputs
				[name]: data.value,
			},
			rxValue,
		)
		const props = {
			...input,
			content: isFn(content)
				? content(values, name)
				: content,
			disabled: inputsDisabled.includes(name) || (
				isFn(disabled)
					? disabled(values, name)
					: disabled
			),
			hidden: inputsHidden.includes(name) || (
				!isFn(hidden)
					? hidden
					: !!hidden(values, name)
			),
			inputs: isGroup
				? childInputs.map(
					this.addInterceptor(
						values,
						parentIndex || index,
					)
				  )
				: undefined,
			key: key || name,
			readOnly: inputsReadOnly.includes(name) || readOnly,
			onChange: isGroup
				? undefined
				: (e, data) => this.handleChange(
					e,
					data,
					input,
					parentIndex || index,
					parentIndex ? index : undefined
				),
			validate: isFn(validate)
				? handleValidate
				: undefined,
		}
		return props
	}

	getValues = (inputs = [], values = {}, inputName, newValue) =>
		inputs.reduce((values, input) => {
			const {
				inputs: childInputs,
				groupValues,
				multiple,
				name,
				type,
			} = input
			const typeLC = (type || '').toLowerCase()
			const isGroup = typeLC === 'group'
			if (!isStr(name)) return values
			if (isGroup) {
				const newValues = this.getValues(
					childInputs,
					groupValues ? {} : values,
					inputName,
					newValue
				)
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
			const { onChange: formOnChange } = this.props
			const { name, onChange: onInputChange, onInvalid } = input
			let { inputs } = this.props
			let { values } = this.state
			const { invalid = false, value } = data
			// for FormBuilder internal use
			input._invalid = invalid
			input.value = value
			values = this.getValues(inputs, values, name, value)
			this.setState({ message: null, values })

			// trigger input `onchange` callback if valid, otherwise `onInvalid` callback
			const fn = invalid ? onInvalid : onInputChange
			isFn(fn) && (await fn(event, values, index, childIndex))
			// trigger form's onchange callback
			if (isFn(formOnChange)) {
				const formInvalid = checkFormInvalid(inputs, values)
				await formOnChange(event, values, formInvalid)
			}
		} catch (err) {
			console.error(err)
			this.setState({
				message: {
					content: `${err}`,
					header: textsCap.unexpectedError,
					icon: true,
					status: statuses.ERROR,
				},
			})
		}
	}

	handleClose = event => {
		event.preventDefault()
		const { onClose } = this.props
		if (isFn(onClose)) return onClose()
		this.setState({ open: !this.state.open })
	}

	handleSubmit = async event => {
		try {
			event.preventDefault()
			event.stopPropagation()
			const { onSubmit } = this.props
			const { values } = this.state
			isFn(onSubmit) && (await onSubmit(event, values))
			this.setState({ message: null })
		} catch (err) {
			console.error(err)
			this.setState({
				message: {
					content: `${err}`,
					header: textsCap.unexpectedError,
					icon: true,
					status: statuses.ERROR,
				},
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
			El,
			formProps,
			header,
			headerIcon,
			hideFooter,
			inputs = [],
			loading,
			message: msg,
			modal,
			modalId,
			onClose,
			onOpen,
			open,
			size,
			style,
			subheader,
			submitDisabled,
			submitInProgress,
			submitText,
			success,
			trigger,
			widths,
		} = this.props
		loading = isObj(loading)
			? Object
				.values(loading)
				.find(Boolean)
			: !!loading
		const isMobile = rxLayout.value === MOBILE
		if (submitText === null && closeText === null) {
			// enable close on escase and dimmer click
			closeOnDimmerClick = true
			closeOnEscape = true
		}
		let { message: sMsg, open: sOpen, values } = this.state
		// whether the 'open' status is controlled or uncontrolled
		let modalOpen = isFn(onClose) ? open : sOpen
		inputs = inputs.map(this.addInterceptor(values))
		if (success && closeOnSubmit) {
			modalOpen = false
			if (modalId) return closeModal(modalId)
			isFn(onClose) && onClose({}, {})
		}
		msg = sMsg || msg
		const msgStyle = {
			...(modal ? styles.messageModal : styles.messageInline),
			...(msg || {}).style,
		}
		const message = { ...msg, style: msgStyle }
		let submitBtn
		submitDisabled = !isObj(submitDisabled)
			? !!submitDisabled
			: Object.values(submitDisabled).filter(Boolean).length > 0
		// const formIsInvalid = checkFormInvalid(inputs, values)
		const shouldDisable = loading
			|| submitDisabled
			|| submitInProgress
			|| success
			|| checkFormInvalid(inputs, values)
		submitText = !isFn(submitText)
			? submitText
			: submitText(
				values,
				this.props,
				shouldDisable,
			)
		const handleSubmit = (...args) => !shouldDisable && this.handleSubmit(...args)
		if (submitText !== null) {
			const submitProps = !isObj(submitText)
				? {}
				: React.isValidElement(submitText)
					? { ...submitText.props }
					: submitText
			let {
				content,
				disabled,
				icon,
				loading: sLoading,
				onClick,
				positive,
				style,
			} = submitProps
			disabled = isBool(disabled)
				? disabled
				: shouldDisable
			icon = icon || icon === null
				? icon
				: success
					? 'check' // form has been successfully submitted
					: disabled
						? 'exclamation circle' // one or more fields are invalid or unfilled
						: 'thumbs up' // all fields are valid and user can now submit
			submitBtn = (
				<Button {...{
					type: 'submit',
					...submitProps,
					content: content || (
						!isStr(submitText)
							? content
							: submitText
					),
					disabled,
					icon,
					loading: !success && (submitInProgress || sLoading),
					onClick: (...args) => isFn(onClick)
						? onClick(...args)
						: handleSubmit(...args),
					positive: isBool(positive) ? positive : true,
					style: {
						// float: !modal ? 'right' : undefined,
						paddingLeft: icon ? 10 : undefined,
						marginLeft: modal ? undefined : 3,
						marginTop: modal || !isMobile ? undefined : 15,
						...style,
					},
				}} />
			)
		}
		if (modal && closeText !== null) {
			closeText = !isFn(closeText)
				? closeText
				: closeText(values, this.props)
			const closeProps = React.isValidElement(closeText)
				? { ...closeText.props }
				: isObj(closeText)
					? closeText
					: {}
			closeProps.content = closeProps.content || (
				isStr(closeText)
					? closeText
					: success || submitText === null
						? textsCap.close
						: textsCap.cancel
			)					
			closeProps.negative = isDefined(closeProps.negative)
				? closeProps.negative
				: true
			closeProps.onClick = closeProps.onClick || this.handleClose
			// prevent submitting the form
			closeProps.type = 'button'
			closeText = <Button {...closeProps} />
		}

		const as = El || (modal ? 'div' : 'form')
		msg = true

		const form = (
			<Invertible {...{
				as,
				className: 'ui form',
				El: Form,
				error: message.status === statuses.ERROR,
				loading,
				onSubmit: handleSubmit,
				success: success || message.status === statuses.SUCCESS,
				warning: message.status === statuses.WARNING,
				widths,
				style,
				...formProps,
			}}>
				{inputs.map(props => <FormInput {...props} />)}
				{/* Include submit button if not a modal */}
				{!modal && !hideFooter && (
					<div style={{ textAlign: 'right' }}>
						{submitBtn}
						{msg && <Message {...message} />}
					</div>
				)}
			</Invertible>
		)

		return !modal && form || (
			<IModal {...{
				as: 'form',
				className: 'form', // fixes form input label and other styles
				closeOnEscape: !!closeOnEscape,
				closeOnDimmerClick: !!closeOnDimmerClick,
				defaultOpen: defaultOpen,
				dimmer: true,
				id: `form-${modalId}`,
				onClose: this.handleClose,
				onOpen: onOpen,
				onSubmit: handleSubmit,
				open: modalOpen,
				size: size,
				trigger: trigger,
			}}>
				<div className='modal-close' style={styles.closeButton}>
					<Icon {...{
						className: 'no-margin',
						color: 'grey',
						link: true,
						name: 'times circle outline',
						onClick: this.handleClose,
						size: 'large',
					}} />
				</div>
				{header && (
					<Header as={Modal.Header}>
						<Header.Content style={styles.header}>
							{headerIcon && (
								<Icon name={headerIcon} size='large' />
							)}
							{header}
						</Header.Content>
						{subheader && (
							<Header.Subheader {...{
								children: subheader,
								style: styles.subheader,
							}} />
						)}
					</Header>
				)}
				<Modal.Content children={form} />
				{!hideFooter && (
					<Modal.Actions>
						{closeText}
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
		PropTypes.element,
		PropTypes.func,
		PropTypes.object,
		PropTypes.string,
	]),
	defaultOpen: PropTypes.bool,
	El: PropTypes.oneOfType([
		PropTypes.elementType,
		PropTypes.string,
	]),
	// props to be passed on to the Form or `El` component
	formProps: PropTypes.object,
	// disable inputs on load
	inputsDisabled: PropTypes.arrayOf(PropTypes.string),
	// inputs to hide
	inputsHidden: PropTypes.arrayOf(PropTypes.string),
	// read only inputs
	inputsReadOnly: PropTypes.arrayOf(PropTypes.string),
	header: PropTypes.string,
	headerIcon: PropTypes.string,
	hideFooter: PropTypes.bool,
	message: PropTypes.object,
	// show loading spinner
	loading: PropTypes.oneOfType([
		PropTypes.bool,
		PropTypes.object,
	]),
	modal: PropTypes.bool,
	// If modal=true and onClose is defined, 'open' is expected to be controlled externally
	onClose: PropTypes.func,
	onOpen: PropTypes.func,
	onSubmit: PropTypes.func,
	open: PropTypes.bool,
	size: PropTypes.string,
	style: PropTypes.object,
	subheader: PropTypes.any,
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
		//          - button properties as object: any property supported by Semantic Button component and HTML <button>
		//          - React element: a valid JSX element
		PropTypes.func,
		PropTypes.object,
		PropTypes.string,
	]),
	success: PropTypes.bool,
	trigger: PropTypes.element,
	widths: PropTypes.string,
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
	submitText: textsCap.submit,
	size: 'tiny',
}
export default FormBuilder // Do not use React.memo()

/**
 * @name    fillValues
 * @summary fill values into array of inputs
 *
 * @param   {Array}     inputs
 * @param   {Object}    values values to fill into the input. Property name/key is the name of the input.
 * @param   {Boolean}   forceFill whether to override existing, if any.
 *
 * @returns {Array} inputs
 */
export const fillValues = (inputs, values, forceFill, createRxValue = true) => {
	if (!isObj(values)) return inputs
	Object.keys(values).forEach(name => {
		const input = findInput(inputs, name)
		if (!input) return

		if (createRxValue && !isSubjectLike(input.rxValue)) {
			input.rxValue = new BehaviorSubject()
		}

		let { rxValue, type } = input
		const newValue = values[name]
		type = (isStr(type) ? type : 'text').toLowerCase()

		if (
			type !== 'group'
			&& !forceFill
			&& (!hasValue(newValue) || hasValue(input.value))
		) return

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
		isSubjectLike(rxValue)
			&& rxValue.value !== newValue
			&& rxValue.next(newValue)
	})

	return inputs
}

/**
 * @name	resetInput
 * @summary	reset an input's value and rxValue to undefined
 *
 * @param	{Object} input
 */
export const resetInput = input => {
	if (!isObj(input)) return
	if (input.hasOwnProperty('value')) input.value = undefined
	if (input.hasOwnProperty('rxValue')) input.rxValue.next(undefined)
}

/**
 * @name	resetForm
 * @summary	reset given inputs' values to undefined
 *
 * @param	{Array} inputs
 */
export const resetForm = inputs => inputsForEach(inputs, resetInput)

/**
 * @name	inputsForEach
 * @summary execute a callback for each input including group inputs
 *
 * @param	{Array}		inputs
 * @param	{Function}	callback
 */
export const inputsForEach = (inputs = [], callback) => {
	if (!isArr(inputs)) return
	for (let i = 0; i < inputs.length; i++) {
		const input = inputs[i] || {}
		const { inputs: childInputs, type } = input
		const isGroup = `${type}`.toLowerCase() === 'group'
		if (isGroup) inputsForEach(childInputs, callback)
		callback(input, inputs)
	}
}

/**
 * @name	checkInputInvalid
 * @summary	checks if an input is invalid
 *
 * @param	{Object}	formValues
 * @param	{Object}	input
 *
 * @returns	{Boolean}
 */
export const checkInputInvalid = (formValues = {}, input) => {
	let {
		_invalid,
		groupValues,
		hidden,
		inputs,
		invalid,
		name,
		required,
		rxValue,
		type,
		value,
	} = input || {}
	type = (type || 'text').toLowerCase()
	// ignore current input if conditions met
	if (['button', 'hidden', 'html'].includes(type)) return false
	const isHidden = isFn(hidden) ? !!hidden(formValues, name) : !!hidden
	if (isHidden) return false

	let gotValue = hasValue(formValues[name])
	const isGroup = type === 'group'
	if (!isGroup && !required && !gotValue) return false

	// Use recursion to validate input groups
	if (isGroup)
		return checkFormInvalid(
			inputs,
			!groupValues ? formValues : formValues[name] || {}
		)

	// if input is set invalid externally or internally by FormInput
	if (invalid || _invalid) return true

	const isCheckbox = ['checkbox', 'radio'].indexOf(type) >= 0
	value = gotValue
		? formValues[name]
		: !hasValue(value) && isSubjectLike(rxValue)
		? rxValue.value
		: value

	return isCheckbox && required ? !value : !hasValue(value)
}
/**
 * @name	checkFormInvalid
 * @summary	checks if oe or more of a given list of inputs is invalid
 *
 * @param	{Array}		inputs
 * @param	{Object}	values
 *
 * @returns	{Boolean}
 */
export const checkFormInvalid = (inputs = [], values = {}) =>
	!!inputs.find(input => checkInputInvalid(values, input))

// findInput returns the first item matching supplied name.
// If any input type is group it will recursively search in the child inputs as well
export const findInput = (inputs, name) => {
	let input
	for (let i = 0; i < inputs.length; i++) {
		const { inputs: childInputs, name: iName, type } = inputs[i]
		if (name === iName) return inputs[i]

		const isGroup = `${type}`.toLowerCase() === 'group'
		if (!isGroup) continue
		
		input = findInput(childInputs, name)
		if (input) return input
	}
}

const styles = {
	closeButton: {
		position: 'absolute',
		top: 15,
		right: 15,
		zIndex: 1, // for modals without header
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
		fontSize: 20,
		lineHeight: 1.5,
		textTransform: 'capitalize',
	},
	subheader: {
		color: 'grey',
		fontSize: 16,
	},
}
