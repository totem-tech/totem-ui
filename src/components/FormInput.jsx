import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Accordion, Button, Dropdown, Form, Icon, Input, TextArea } from 'semantic-ui-react'
import PromisE from '../utils/PromisE'
import { deferred, hasValue, isArr, isFn, isObj, isStr, objWithoutKeys, searchRanked, isBool } from '../utils/utils'
import validator, { TYPES } from '../utils/validator'
import Message from './Message'
import Invertible from './Invertible'
// Custom Inputs
import CheckboxGroup from './CheckboxGroup'
import UserIdInput from './UserIdInput'
import { translated } from '../services/language'
import { unsubscribe } from '../services/react'

const textsCap = translated({
	decimals: 'maximum number of decimals allowed',
	email: 'please enter a valid email address',
	fileType: 'invalid file type selected',
	integer: 'please enter a number without decimals',
	max: 'number must be smaller than or equal to',
	maxLengthNum: 'maximum number of digits allowed',
	maxLengthText: 'maximum number of characters allowed',
	min: 'number must be greater or equal',
	minLengthNum: 'minimum number of digits required',
	minLengthText: 'minimum number of characters required',
	number: 'please enter a valid number',
	required: 'required field',

	readOnlyField: 'read only field',
}, true)[1]
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
	constructor(props = {}) {
		super(props)

		const { defer } = props
		this.state = {
			message: undefined,
		}
		this.setMessage = defer !== null ? deferred(this.setMessage, defer) : this.setMessage

		this.originalSetState = this.setState
		this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
	}

	componentWillMount() {
		this._mounted = true
		this.subscriptions = {}
		const { rxValue } = this.props
		if (!isObj(rxValue) || !isFn(rxValue.subscribe)) return
		this.subscriptions.rxValue = rxValue.subscribe(value => {
			this._mounted && this.handleChange({}, { ...this.props, value })
		})
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
		const customMsgs = { ...textsCap }
		let errMsg, validatorConfig

		if (hasVal && !errMsg) {
			switch (typeLower) {
				case 'checkbox':
				case 'radio':
					// Sematic UI's Checkbox component only supports string and number as value
					// This allows support for any value types
					data.value = data.checked ? trueValue : falseValue
					if (required && !data.checked) errMsg = textsCap.required
					break
				case 'number':
					validatorConfig = { type: integer ? TYPES.integer : TYPES.number }
					data.value = !data.value ? data.value : parseFloat(data.value)
					customMsgs.lengthMax = textsCap.maxLengthNum
					customMsgs.lengthMin = textsCap.minLengthNum
					break
				case 'hex':
					validatorConfig = { type: TYPES.hex }
				case 'text':
				case 'textarea':
					validatorConfig = validatorConfig || { type: TYPES.string }
					customMsgs.lengthMax = textsCap.maxLengthText
					customMsgs.lengthMin = textsCap.minLengthText
			}
		}

		if ((!errMsg && hasVal && validationTypes.includes(typeLower)) || validatorConfig) {
			errMsg = validator.validate(
				data.value,
				{ ...this.props, ...validatorConfig },
				customMsgs,
			)
		}

		let message = !errMsg ? null : { content: errMsg, status: 'error' }
		const triggerChange = () => {
			data.invalid = !!errMsg
			isFn(onChange) && onChange(event, data, this.props)
			this.setMessage(message)
		}
		if (message || !isFn(validate)) return triggerChange()

		const handleValidate = vMsg => {
			if (vMsg === true) {
				// means field is invalid but no message to display
				errMsg = true
				return triggerChange()
			}
			const isMsg = !vMsg && !isStr(vMsg) && !React.isValidElement(vMsg)
			message = isMsg ? vMsg : { content: vMsg, status: 'error' }
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
		let useInput = useInputOrginal
		const { message: internalMsg } = this.state
		const message = internalMsg || externalMsg
		let hideLabel = false
		let inputEl = ''
		if (hidden) return ''
		// Remove attributes that are used by the form or Form.Field but
		// shouldn't be used or may cause error when using with inputEl
		let attrs = objWithoutKeys({ ...this.props, key: name }, NON_ATTRIBUTES)
		attrs.ref = elementRef
		attrs.onChange = this.handleChange
		let isGroup = false
		const typeLC = type.toLowerCase()
		const editable = !attrs.readOnly && !attrs.disabled

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
				attrs.inline = inline
				// if number of options is higher than 50 and if lazyLoad is disabled, can slowdown FormBuilder
				attrs.lazyLoad = isBool(attrs.lazyLoad) ? attrs.lazyLoad : true
				attrs.search = isArr(attrs.search) ? searchRanked(attrs.search) : attrs.search
				attrs.style = { maxWidth: '100%', minWidth: '100%', ...attrs.style }
				inputEl = <Dropdown {...attrs} />
				break
			case 'group':
				// NB: if `widths` property is used `unstackable` property is ignored by Semantic UI!!!
				isGroup = true
				inputEl = attrs.inputs.map((props, i) => <FormInput key={attrs.name + i} {...props} />)
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
				title={editable ? undefined : textsCap.readOnlyField}
				width={width}
			>
				{!hideLabel && label && <label htmlFor={name}>{label}</label>}
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
						// margin: '0px -5px 15px -5px',
						...styleContainer,
						...attrs.style,
					},
				}}>
					{inputEl}
				</Form.Group>
				<Message {...message} />
			</React.Fragment>
		)
		if (!isObj(accordion)) return groupEl

		// use accordion if label is supplied
		let { collapsed } = this.state
		if (!isBool(collapsed)) collapsed = accordion.collapsed

		return (
			<Invertible {...{
				El: Accordion,
				...objWithoutKeys(accordion, NON_ATTRIBUTES),
				style:{ marginBottom: 15, ...accordion.style },
			}}>
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
			</Invertible>
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
	label: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
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
	onValidate: PropTypes.func, //????
	width: PropTypes.number,
}
FormInput.defaultProps = {
	defer: 300,
	integer: false,
	type: 'text',
	width: 16,
}

export default React.memo(FormInput)
