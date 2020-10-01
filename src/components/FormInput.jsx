import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Accordion, Button, Dropdown, Form, Input, TextArea } from 'semantic-ui-react'
import PromisE from '../utils/PromisE'
import {
	deferred,
	hasValue,
	isArr,
	isFn,
	isObj,
	isStr,
	objWithoutKeys,
	searchRanked,
	isBool,
} from '../utils/utils'
import validator, { TYPES } from '../utils/validator'
import Message from './Message'
// Custom Inputs
import CheckboxGroup from './CheckboxGroup'
import UserIdInput from './UserIdInput'
import { translated } from '../services/language'
import { unsubscribe } from '../services/react'

const [texts] = translated({
	decimals: 'Maximum number of decimals allowed',
	email: 'Please enter a valid email address',
	fileType: 'Invalid file type selected',
	integer: 'Please enter a number without decimals',
	max: 'Number must be smaller than or equal to',
	maxLengthNum: 'Maximum number of digits allowed',
	maxLengthText: 'Maximum number of characters allowed',
	min: 'Number must be greater or equal',
	minLengthNum: 'Minimum number of digits required',
	minLengthText: 'Minimum number of characters required',
	number: 'Please enter a valid number',
	required: 'Required field',
})
const validationTypes = Object.values(TYPES)
// properties exclude from being used in the DOM
const NON_ATTRIBUTES = Object.freeze([
	'collapsed',
	'defer',
	'elementRef',
	'groupValues',
	'hidden',
	'inline',
	'integer',
	'invalid',
	'_invalid',
	'inlineLabel',
	'label',
	'trueValue',
	'falseValue',
	'styleContainer',
	'useInput',
	'validate',
	'rxValue',
	'width',
	'onInalid',
])
export const nonValueTypes = Object.freeze(['button', 'html'])

export class FormInput extends Component {
	constructor(props) {
		super(props)

		const { defer } = props
		this.state = { message: undefined }
		if (defer !== null) {
			this.setMessage = deferred(this.setMessage, defer)
		}

		this.originalSetState = this.setState
		this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
	}

	componentWillMount() {
		this._mounted = true
		this.subscriptions = {}
		const { rxValue } = this.props
		if (!isObj(rxValue) || !isFn(rxValue.subscribe)) return
		this.subscriptions.rxValue = rxValue.subscribe(value =>
			this._mounted && this.handleChange({}, { ...this.props, value })
		)
	}

	componentWillUnmount = () => {
		this._mounted = false
		unsubscribe(this.subscriptions)
	}

	handleChange = (event = {}, data = {}) => {
		const {
			falseValue: falseValue = false,
			integer,
			onChange,
			required,
			trueValue: trueValue = true,
			type,
			validate,
		} = this.props

		// for custom input types (eg: UserIdInput)
		if (data.invalid) return isFn(onChange) && onChange(event, data, this.props)

		// Forces the synthetic event and it's value to persist
		// Required for use with deferred function
		event && isFn(event.persist) && event.persist()
		const typeLower = (type || '').toLowerCase()
		const isCheck = ['checkbox', 'radio'].indexOf(typeLower) >= 0
		const hasVal = hasValue(isCheck ? data.checked : data.value)
		const customMsgs = { ...texts }
		let errMsg, validatorConfig

		if (hasVal && !errMsg) {
			switch (typeLower) {
				case 'checkbox':
				case 'radio':
					// Sematic UI's Checkbox component only supports string and number as value
					// This allows support for any value types
					data.value = data.checked ? trueValue : falseValue
					if (required && !data.checked) errMsg = texts.required
					break
				case 'number':
					validatorConfig = { type: integer ? TYPES.integer : TYPES.number }
					data.value = !data.value ? data.value : parseFloat(data.value)
					customMsgs.lengthMax = texts.maxLengthNum
					customMsgs.lengthMin = texts.minLengthNum
					break
				case 'hex':
					validatorConfig = { type: TYPES.hex }
				case 'text':
				case 'textarea':
					validatorConfig = validatorConfig || { type: TYPES.string }
					customMsgs.lengthMax = texts.maxLengthText
					customMsgs.lengthMin = texts.minLengthText
			}
		}

		if (!errMsg && hasVal && validationTypes.includes(typeLower) || validatorConfig) {
			errMsg = validator.validate(data.value, { ...this.props, ...validatorConfig }, customMsgs)
		}

		let message = !errMsg ? null : { content: errMsg, status: 'error' }
		const triggerChange = () => {
			data.invalid = !!errMsg
			isFn(onChange) && onChange(event, data, this.props)
			this.setMessage(message)
		}
		if (message || !isFn(validate)) return triggerChange()

		// !isFn(validate) && isFn(onChange) && onChange(event, data, this.props)

		const handleValidate = vMsg => {
			if (vMsg === true) {
				// means field is invalid but no message to display
				errMsg = true
				return triggerChange()
			}
			message = !vMsg && !isStr(vMsg) && !React.isValidElement(vMsg) ? vMsg : {
				content: vMsg,
				status: 'error',
			}
			errMsg = message && message.status === 'error' ? message.content : errMsg
			triggerChange()
		}

		// forces any unexpected error to be handled gracefully
		PromisE(async () => await validate(event, data)).then(handleValidate, handleValidate)
	}

	setMessage = (message = {}) => this.setState({ message })

	render() {
		const {
			accordion,
			content,
			elementRef,
			error,
			hidden,
			inline,
			inlineLabel,
			invalid,
			label,
			message: externalMsg,
			name,
			required,
			rxValue,
			styleContainer,
			type,
			useInput: useInputOrginal,
			width,
		} = this.props
		if (hidden) return ''
		let useInput = useInputOrginal
		const { message: internalMsg } = this.state
		const message = internalMsg || externalMsg
		let hideLabel = false
		let inputEl = ''
		// Remove attributes that are used by the form or Form.Field but
		// shouldn't be used or may cause error when using with inputEl
		let attrs = objWithoutKeys(this.props, NON_ATTRIBUTES)
		attrs.ref = elementRef
		attrs.onChange = this.handleChange
		let isGroup = false
		const typeLC = type.toLowerCase()

		switch (typeLC) {
			case 'button':
				inputEl = <Button {...attrs} />
				break
			case 'checkbox':
			case 'radio':
				attrs.toggle = typeLC !== 'radio' && attrs.toggle
				attrs.type = 'checkbox'
				delete attrs.value
				hideLabel = true
				inputEl = <Checkbox {...attrs} label={label} />
				break
			case 'checkbox-group':
			case 'radio-group':
				attrs.rxValue = rxValue
				attrs.inline = inline
				attrs.radio = typeLC === 'radio-group' ? true : attrs.radio
				inputEl = <CheckboxGroup {...attrs} />
				break
			case 'dropdown':
				if (isArr(attrs.search)) {
					attrs.search = searchRanked(attrs.search)
				}
				attrs.style = { maxWidth: '100%', minWidth: '100%', ...attrs.style }
				inputEl = <Dropdown {...attrs} />

				break
			case 'group':
				// NB: if `widths` property is used `unstackable` property is ignored by Semantic UI!!!
				isGroup = true
				inputEl = attrs.inputs.map((subInput, i) => <FormInput key={i} {...subInput} />)
				break
			case 'hidden':
				hideLabel = true
				break
			case 'html':
				return content || ''
			case 'textarea':
				inputEl = <TextArea {...attrs} />
				break
			case 'useridinput':
				inputEl = <UserIdInput {...attrs} />
				break
			case 'file':
				delete attrs.value
				useInput = true
			default:
				attrs.value = !hasValue(attrs.value) ? '' : attrs.value //forces inputs to be controlled
				attrs.fluid = !useInput ? undefined : attrs.fluid
				attrs.label = inlineLabel || attrs.label
				const El = useInput ? Input : Form.Input
				inputEl = <El {...attrs} />
		}

		if (!isGroup) return (
			<Form.Field
				error={(message && message.status === 'error') || !!error || !!invalid}
				required={required}
				style={styleContainer}
				width={width}
			>
				{!hideLabel && label && (
					<label htmlFor={name}>
						{label}
					</label>
				)}
				{inputEl}
				{message && <Message {...message} />}
			</Form.Field>
		)

		let groupEl = (
			<React.Fragment>
				<Form.Group {...{
					className: 'form-group',
					...objWithoutKeys(attrs, ['inputs']),
					style: {
						margin: '0px -5px 15px -5px',
						...styleContainer,
						...attrs.style,
					},
				}}>
					{inputEl}
				</Form.Group>
				{message && <Message {...message} />}
			</React.Fragment>
		)

		if (!isObj(accordion)) return groupEl
		// use accordion if label is supplied
		let { collapsed } = this.state
		if (!isBool(collapsed)) collapsed = accordion.collapsed
		return (
			<Accordion {...objWithoutKeys(accordion, NON_ATTRIBUTES)} style={{ marginBottom: 15, ...accordion.style }}>
				<Accordion.Title
					active={!collapsed}
					content={accordion.title || label}
					icon={accordion.icon || 'dropdown'}
					onClick={() => {
						this.setState({ collapsed: !collapsed })
						isFn(accordion.onClick) && accordion.onClick(!collapsed)
					}}
				/>
				<Accordion.Content {...{ active: !collapsed, content: groupEl }} />
			</Accordion>
		)
	}
}
FormInput.propTypes = {
	// Delay, in miliseconds, to display built-in and `validate` error messages
	// Set `defer` to `null` to prevent using deferred mechanism
	defer: PropTypes.number,
	// For text field types
	inlineLabel: PropTypes.any,
	// If field types is 'number', will validate as an integer. Otherwise, float is assumed.
	integer: PropTypes.bool,
	search: PropTypes.oneOfType([
		// Array of option keys to be searchable (FormInput specific)
		PropTypes.array,
		PropTypes.bool,
		PropTypes.func,
	]),
	type: PropTypes.string.isRequired,
	// Validate field. Only invoked when onChange is triggered and built-in validation passed.
	//
	// Params:
	//          @event object
	//          @data object
	// Expected Return: one of the following:
	//              falsy (if no error),
	//              true (exact value, indicates invalid but no message to display)
	//              string (assumes error)
	//              ReactElement (assumes error)
	//              object (can be any status type. Required prop: content or header)
	//              Promise (must resolve to one of the above) - defers onChange trigger until resolved
	validate: PropTypes.func,
	hidden: PropTypes.bool,
	inputs: PropTypes.array,
	// Whether to use Semantic UI's Input or Form.Input component.
	// Truthy => Input, Falsy (default) => Form.Input
	useInput: PropTypes.bool,
	message: PropTypes.object,
	name: PropTypes.string.isRequired,
	label: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.element,
	]),
	onChange: PropTypes.func,
	placeholder: PropTypes.string,
	readOnly: PropTypes.bool,
	rxValue: PropTypes.shape({
		subscribe: PropTypes.func.isRequired,
	}),
	// element ref
	elementRef: PropTypes.any,
	required: PropTypes.bool,
	slider: PropTypes.bool, // For checkbox/radio
	toggle: PropTypes.bool, // For checkbox/radio
	value: PropTypes.any,
	onValidate: PropTypes.func,//????
	width: PropTypes.number,
}
FormInput.defaultProps = {
	defer: 300,
	integer: false,
	type: 'text',
	width: 16,
}


export default React.memo(FormInput)