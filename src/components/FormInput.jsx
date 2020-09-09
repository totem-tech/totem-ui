import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Accordion, Button, Dropdown, Form, Input, TextArea } from 'semantic-ui-react'
import PromisE from '../utils/PromisE'
import {
	deferred,
	hasValue,
	isArr,
	isBond,
	isDefined,
	isFn,
	isObj,
	isStr,
	isValidNumber,
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
	email: 'Please enter a valida email address',
	fileType: 'Invalid file type selected',
	integer: 'Number must be an integer (no decimals)',
	max: 'Number must be smaller than or equal to',
	maxLengthNum: 'Maximum number of digits allowed',
	maxLengthText: 'Maximum number of characters allowed',
	min: 'Number must be greater or equal',
	minLengthNum: 'Minimum number of digits required',
	minLengthText: 'Minimum number of characters required',
	number: 'Please enter a valid number',
	required: 'Required field',
})
const VALIDATION_MESSAGES = Object.freeze({
	integer: texts.integer,
	max: max => `${texts.max} ${max}`,
	maxLength: (value, max) => `${isStr(value) ? texts.maxLengthText : texts.maxLengthNum}: ${max}`,
	min: min => `${texts.min} ${min}`,
	minLength: (value, min) => `${isStr(value) ? texts.minLengthText : texts.minLengthNum}: ${min}`,
	number: texts.number,
	required: texts.required,
})
const validationTypes = Object.values(TYPES)
// properties exclude from being used in the DOM
const NON_ATTRIBUTES = Object.freeze([
	'bond',
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
])
export const nonValueTypes = Object.freeze(['button', 'html'])

export class FormInput extends Component {
	constructor(props) {
		super(props)

		const { bond, defer } = props
		this.bond = isBond(bond) ? bond : undefined
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
		const triggerChange = value => setTimeout(() => this.handleChange({}, { ...this.props, value }))
		if (this.bond) {
			this.tieId = this.bond.tie(triggerChange)
		}
		if (isObj(rxValue) && isFn(rxValue.subscribe)) {
			this.subscriptions.rxValue = rxValue.subscribe(triggerChange)
		}
	}

	componentWillUnmount = () => {
		this._mounted = false
		this.bond && this.bond.untie(this.tieId)
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
		const { checked, value } = data

		// for custom input types (eg: UserIdInput)
		if (data.invalid) return isFn(onChange) && onChange(event, data, this.props)

		// Forces the synthetic event and it's value to persist
		// Required for use with deferred function
		event && isFn(event.persist) && event.persist()
		const typeLower = (type || '').toLowerCase()
		const isCheck = ['checkbox', 'radio'].indexOf(typeLower) >= 0
		const hasVal = hasValue(isCheck ? checked : value)
		const customMsgs = { ...texts }
		let errMsg, validatorConfig

		if (hasVal && !errMsg) {
			switch (typeLower) {
				case 'checkbox':
				case 'radio':
					// Sematic UI's Checkbox component only supports string and number as value
					// This allows support for any value types
					data.value = checked ? trueValue : falseValue
					if (required && !checked) errMsg = VALIDATION_MESSAGES.required
					break
				case 'number':
					validatorConfig = { type: integer ? TYPES.integer : TYPES.number }
					customMsgs.lengthMax = texts.maxLengthNum
					customMsgs.lengthMin = texts.minLengthNum
				case 'hex':
					validatorConfig = { type: TYPES.hex }
				case 'text':
				case 'textarea':
					validatorConfig = validatorConfig || { type: TYPES.string }
					customMsgs.lengthMax = texts.maxLengthText
					customMsgs.lengthMin = texts.minLengthText
			}
		}

		if (!errMsg && validationTypes.includes(typeLower) || validatorConfig) {
			errMsg = validator.validate(value, { ...this.props, ...validatorConfig }, customMsgs)
		}

		let message = !errMsg ? null : { content: errMsg, status: 'error' }
		const triggerChange = () => {
			data.invalid = !!errMsg
			isFn(onChange) && onChange(event, data, this.props)
			this.setMessage(message)

			if (isBond(this.bond) && !data.invalid) this.bond._value = value
		}
		if (message || !isFn(validate)) return triggerChange()

		!isFn(validate) && isFn(onChange) && onChange(event, data, this.props)

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
			bond,
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
				inputEl = <Form.Checkbox {...attrs} label={label} />
				break
			case 'checkbox-group':
			case 'radio-group':
				attrs.bond = bond
				attrs.inline = inline
				attrs.radio = typeLC === 'radio-group' ? true : attrs.radio
				inputEl = <CheckboxGroup {...attrs} />
				break
			case 'dropdown':
				if (isArr(attrs.search)) {
					attrs.search = searchRanked(attrs.search)
				}
				inputEl = <Dropdown {...attrs} />
				break
			case 'group':
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
			<div>
				<Form.Group {...{
					className: 'form-group',
					...objWithoutKeys(attrs, ['inputs']),
					style: { ...styleContainer, ...attrs.style },
				}}>
					{inputEl}
				</Form.Group>
				{message && <Message {...message} />}
			</div>
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
						isFn(accordion.onClick) && accordion.onClick()
					}}
				/>
				<Accordion.Content {...{ active: !collapsed, content: groupEl }} />
			</Accordion>
		)
	}
}
FormInput.propTypes = {
	bond: PropTypes.any,
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
	label: PropTypes.string,
	onChange: PropTypes.func,
	placeholder: PropTypes.string,
	readOnly: PropTypes.bool,
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