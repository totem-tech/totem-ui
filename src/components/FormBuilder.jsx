import PropTypes from 'prop-types'
import React, { Component, isValidElement } from 'react'
import { BehaviorSubject } from 'rxjs'
import {
	Form,
	Header,
	Icon,
	Modal,
} from 'semantic-ui-react'
import { closeModal, newId } from '../services/modal'
import { translated } from '../utils/languageHelper'
import { Message, statuses } from '../utils/reactjs'
import {
	hasValue,
	isArr,
	isBool,
	isDefined,
	isFn,
	isObj,
	isStr,
	isSubjectLike,
	toArray,
} from '../utils/utils'
import { MOBILE, rxLayout } from '../utils/window'
import { Button } from './buttons'
import FormInput from './FormInput'
import { Invertible } from './Invertible'
import IModal from './Modal'

const textsCap = {
	cancel: 'cancel',
	close: 'close',
	submit: 'submit',
	unexpectedError: 'an unexpected error occured',
}
translated(textsCap, true)

class FormBuilder extends Component {
	constructor(props) {
		super(props)

		const prefix = 'form_'
		let {
			id = newId(prefix), // Form ID
			inputs,
			open,
			rxValues = new BehaviorSubject(),
		} = props
		if (!`${id || ''}`.startsWith(prefix)) id = prefix + id
		const values = getValues(inputs)
		rxValues.next(values)
		this.state = {
			id,
			open,
			rxValues,
			values,
		}
		this.originalSetState = this.setState
		this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
	}

	componentWillMount = () => this._mounted = true
	componentWillUnmount = () => this._mounted = false

	// recursive interceptor for infinite level of child inputs
	addInterceptor = (values, parentIndex) => (input, index) => {
		parentIndex = isDefined(parentIndex)
			? parentIndex
			: null
		const { id: formId } = this.state
		let {
			inputNamePrefix = formId,
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
				...this.state.rxValues.value,
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
			disabled: toArray(inputsDisabled).includes(name) || !!(
				isFn(disabled)
					? disabled(values, name)
					: disabled
			),
			hidden: toArray(inputsHidden).includes(name) || !!(
				isFn(hidden)
					? hidden(values, name)
					: hidden
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
			name: `${inputNamePrefix}_${name}`,
			onChange: isGroup
				? undefined
				: (e, data) => this.handleChange(
					e,
					data,
					input,
					parentIndex || index,
					parentIndex ? index : undefined
				),
			readOnly: toArray(inputsReadOnly).includes(name) || !!(
				isFn(readOnly)
					? readOnly(values, name)
					: readOnly
			),
			validate: isFn(validate)
				? handleValidate
				: undefined,
		}
		return props
	}

	handleChange = async (event, data, input, index, childIndex) => {
		try {
			const {
				onChange: formOnChange,
				inputsHidden = [],
			} = this.props
			const {
				name,
				onChange: onInputChange,
				onInvalid,
			} = input
			const { inputs } = this.props
			const { rxValues } = this.state
			const { invalid = false, value } = data
			// for FormBuilder internal use
			input._invalid = invalid
			input.value = value
			const values = getValues(
				inputs,
				rxValues.value,
				name,
				value,
			)
			rxValues.next(values)
			this.setState({ message: null })

			// trigger input `onchange` callback if valid, otherwise `onInvalid` callback
			const fn = invalid
				? onInvalid
				: onInputChange
			isFn(fn) && await fn(
				event,
				values,
				index,
				childIndex,
			)
			// trigger form's onchange callback
			if (isFn(formOnChange)) {
				const formInvalid = checkFormInvalid(
					inputs,
					values,
					toArray(inputsHidden),
				)
				await formOnChange(
					event,
					values,
					formInvalid,
				)
			}
		} catch (err) {
			window.isDebug
				? console.trace(err)
				: console.error(err)
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
			const { rxValues } = this.state
			isFn(onSubmit) && await onSubmit(event, rxValues.value)
			this.setState({ message: null })
		} catch (err) {
			window.isDebug
				? console.trace(err)
				: console.error(err)
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
		let {
			id,
			message: sMsg,
			open: sOpen,
			values,
		} = this.state
		// whether the 'open' status is controlled or uncontrolled
		let modalOpen = isFn(onClose) ? open : sOpen
		inputs = inputs.map(this.addInterceptor(values))
		if (success && closeOnSubmit) {
			modalOpen = false
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
				checkFormInvalid(inputs, values, [], 'render'),
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
					onClick: (e, ...args) => {
						e.preventDefault()
						isFn(onClick) && onClick(e, ...args)
						handleSubmit(e, ...args)
					},
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
				isStr(closeText) && !!closeText
					? closeText
					: submitInProgress || success || submitText === null
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

		const form = (
			<Invertible {...{
				as: El || (
					modal
						? 'div'
						: 'form'
				),
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
					<div>
						<div style={{ textAlign: 'right' }}>
							{submitBtn}
						</div>
						{msg && <Message {...message} />}
					</div>
				)}
			</Invertible>
		)
		if (!modal) return form

		return (
			<IModal {...{
				as: 'form',
				className: 'form', // fixes form input label and other styles
				closeOnEscape: !!closeOnEscape,
				closeOnDimmerClick: !!closeOnDimmerClick,
				defaultOpen: defaultOpen,
				dimmer: true,
				id,
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
								isValidElement(headerIcon)
									? headerIcon
									: <Icon name={headerIcon} size='large' />
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
				{!!msg && <Message {...message} />}
			</IModal>
		)
	}
}
const arrayOrString = PropTypes.oneOfType([
	PropTypes.arrayOf(PropTypes.string),
	PropTypes.string,
])
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
	inputsDisabled: arrayOrString,
	// inputs to hide
	inputsHidden: arrayOrString,
	// read only inputs
	inputsReadOnly: arrayOrString,
	header: PropTypes.string,
	headerIcon: PropTypes.oneOfType([
		PropTypes.element,
		PropTypes.string,
	]),
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
 * @param	{Boolean}	createRxValue
 *
 * @returns {Array} inputs
 */
export const fillValues = (inputs, values, forceFill, createRxValue = true) => {
	if (!isObj(values)) return inputs
	const createSubject = (inputs = []) => inputs.forEach(input => {
		input.type = `${input.type || 'text'}`.toLowerCase()
		if (input.type === 'group') return createSubject(input.inputs || [])

		input.rxValue = input.rxValue || new BehaviorSubject()
	})

	createRxValue && createSubject(inputs)
	Object.keys(values).forEach(name => {
		const input = findInput(inputs, name)
		if (!input) return

		let {
			rxValue,
			trueValue = true,
			type,
		} = input
		const newValue = values[name]

		if (
			type !== 'group'
			&& !forceFill
			&& (!hasValue(newValue) || hasValue(input.value))
		) return

		switch (type) {
			case 'checkbox':
			case 'radio':
				input.checked = newValue === trueValue
				break
			case 'group':
				fillValues(
					input.inputs,
					values,
					forceFill,
				)
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

export const getValues = (inputs = [], values = {}, inputName, newValue) =>
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
			const newValues = getValues(
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

/**
 * @name	inputsForEach
 * @summary execute a callback for each input including group inputs
 *
 * @param	{Array}		inputs
 * @param	{Function}	callback
 */
export const inputsForEach = (inputs = [], callback) => {
	if (!isArr(inputs)) return
	for (let i = 0;i < inputs.length;i++) {
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
export const checkInputInvalid = (formValues = {}, input, inputsHidden = [], debugTag) => {
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
		validate,
		value,
	} = input || {}
	type = (type || 'text').toLowerCase()
	// ignore if hidden
	const isHidden = inputsHidden.includes(name) || type === 'hidden'
		? true
		: isFn(hidden)
			? !!hidden(formValues, name)
			: !!hidden
	if (isHidden) return false

	// ignore if input is a button or html type and doesn't have rxValue
	const gotSubject = isSubjectLike(rxValue)
	const isElementType = ['button', 'html'].includes(type)
	if (isElementType && !(gotSubject || validate)) return false

	let gotValue = hasValue(formValues[name])
	const isGroup = type === 'group'
	if (!isGroup && !required && !gotValue) return false

	// Use recursion to validate input groups
	if (isGroup) return checkFormInvalid(
		inputs,
		!groupValues
			? formValues
			: formValues[name] || {},
		inputsHidden,
	)

	// if input is set invalid externally or internally by FormInput
	if (invalid || _invalid) return true

	const isCheckbox = ['checkbox', 'radio'].indexOf(type) >= 0
	value = gotValue
		? formValues[name]
		: !hasValue(value) && gotSubject
			? rxValue.value
			: value
	return isCheckbox && required
		? !value
		: !hasValue(value)
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
export const checkFormInvalid = (inputs = [], values = {}, inputsHidden = [], debugTag) => {
	const input = inputs.find(input =>
		checkInputInvalid(
			values,
			input,
			inputsHidden,
			debugTag,
		)
	)
	return !!input
}

// findInput returns the first item matching supplied name.
// If any input type is group it will recursively search in the child inputs as well
export const findInput = (inputs, name) => {
	let input
	for (let i = 0;i < inputs.length;i++) {
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
		display: 'flex',
		padding: 15,
	},
	messageModal: {
		display: 'flex',
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
