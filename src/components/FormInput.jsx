import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject, Subject } from 'rxjs'
import { Accordion, Button, Checkbox, Dropdown as DD, Form, Icon, Input, TextArea } from 'semantic-ui-react'
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
	isPromise,
	isSubjectLike,
	objSetPropUndefined,
	isDefined,
} from '../utils/utils'
import validator, { TYPES } from '../utils/validator'
import Message, { statuses } from './Message'
import { InvertibleMemo } from './Invertible'
// Custom Inputs
import CheckboxGroup from './CheckboxGroup'
import UserIdInput from './UserIdInput'
import DateInput from './DateInput'
//
import { translated } from '../services/language'
import { unsubscribe } from '../services/react'

const Dropdown = React.memo(DD)
const errMsgs = translated({
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
	url: 'invalid URL',
}, true)[1]
const validationTypes = Object.values(TYPES)
// properties exclude from being used in the DOM
const NON_ATTRIBUTES = Object.freeze([
	'collapsed',
	'containerProps',
	'criteria',
	'criteriaHeader',
	'defer',
	'elementRef',
	'groupValues',
	'hidden',
	'inline',
	'integer',
	'invalid',
	'_invalid',
	'inlineLabel',
	'isMobile',
	'label',
	'labelDetails',
	'trueValue',
	'falseValue',
	'styleContainer',
	'useInput',
	'validate',
	'rxValue',
	'width',
	'onInalid',
	'customMessages',
	'ignoreAttributes',
	'onInvalid',
	// dynamic options for input types with options
	'rxOptions',
	'rxOptionsModifier',
])
export const nonValueTypes = Object.freeze(['button', 'html'])

export class FormInput extends Component {
	constructor(props = {}) {
		super(props)

		const { defer } = props
		this.state = { message: undefined }
		this.value = undefined
		if (defer !== null) {
			this.setMessage = deferred(this.setMessage, defer)
		}

		this.originalSetState = this.setState
		this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
	}

	componentWillMount() {
		this._mounted = true
		this.subscriptions = {}
		const { rxOptions, rxOptionsModifier, rxValue, rxValueModifier } = this.props
		if (isSubjectLike(rxValue)) {
			this.subscriptions.rxValue = rxValue.subscribe(value => {
				value = isFn(rxValueModifier)
					? rxValueModifier(value)
					: value
				if (this.value === value) return
				this.handleChange({}, { ...this.props, value })
			})
		}
		if (isSubjectLike(rxOptions)) {
			this.subscriptions.rxOptions = rxOptions.subscribe(options => {
				options = !isFn(rxOptionsModifier)
					? options
					: rxOptionsModifier(options)
				if (!isArr(options)) return
				this.setState({ options })
				
				if (!isSubjectLike(rxValue) || !hasValue(this.value)) return
				
				const isOption = !!options.find(o => o.value === this.value)				
				// value no longer exists in the options list
				// force clear selection
				!isOption && rxValue.next(undefined)
			})
		}
	}

	componentWillUnmount = () => {
		this._mounted = false
		unsubscribe(this.subscriptions)
	}

	handleChange = (event = {}, data = {}) => {
		const {
			criteria = [],
			criteriaHeader,
			customMessages,
			falseValue: falseValue = false,
			integer,
			onChange,
			required,
			rxValue,
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
		const customMsgs = { ...errMsgs, ...customMessages }
		let err, validatorConfig, isANum
		let {value} = data

		if (hasVal && !err) {
			switch (typeLower) {
				case 'checkbox':
				case 'radio':
					// Sematic UI's Checkbox component only supports string and number as value
					// This allows support for any value types
					data.value = data.checked
						? trueValue
						: falseValue
					if (!required || data.checked) break

					err = errMsgs.required
					break
				case 'date':
					validatorConfig = { type: TYPES.date }
					break
				case 'email': 
					validatorConfig = { type: TYPES.email }
					break
				case 'identity': 
					validatorConfig = { type: TYPES.identity }
					break
				case 'number':
					isANum = true
					validatorConfig = {
						type: integer
							? TYPES.integer
							: TYPES.number,
					}
					data.value = !data.value
						? data.value
						: parseFloat(data.value)
					value = data.value
					break
				case 'hex':
					validatorConfig = { type: TYPES.hex }
				case 'text':
				case 'textarea':
				default:
					value = `${!isDefined(value) ? '' : value}`
					validatorConfig = validatorConfig || { type: TYPES.string }
					break
			}
		}
		// set min & max length error messages if not already defined
		objSetPropUndefined(
			customMsgs,
			'lengthMax',
			errMsgs.maxLengthText,
			!!isANum,
			errMsgs.maxLengthNum,
		)
		objSetPropUndefined(
			customMsgs,
			'lengthMin',
			errMsgs.minLengthText,
			isANum,
			errMsgs.minLengthNum,
		)

		const requireValidator = hasVal
			&& validationTypes.includes(typeLower)
			|| validatorConfig
		if (!err && !!requireValidator) {
			err = validator.validate(
				value,
				{ ...this.props, ...validatorConfig },
				customMsgs
			)
		}

		let message = !!err
			&& !isBool(err)
			&& { content: err, status: statuses.ERROR }
		const triggerChange = () => {
			data.invalid = !!err
			isFn(onChange) && onChange(event, data, this.props)
			this.value = data.value
			rxValue && rxValue.next(data.value)
			this.setMessage(data.invalid, message)
		}

		const cList = !!err || !hasVal
			? []
			: criteria.map(c => {
				const {
					style,
					iconInvalid = 'times circle',
					iconValid = 'check circle',
					persist = true,
					regex,
					text,
				} = c
				const invalid = regex instanceof RegExp
					? !regex.test(`${value}`)
					: false
				const icon = invalid
					? iconInvalid
					: iconValid
				return (persist || invalid) && { icon, invalid, style, text }
			})
			.filter(Boolean)
		if (cList.length > 0) {
			err = !!cList.find(x => x.invalid)
			message = {
				content: (
					<div key='content' style={{ textAlign: 'left' }}>
						{cList.map(({ icon, invalid, style, text }, i) => (
							<div {...{
								key: text + i,
								style: {
									color: invalid
										? 'red'
										: 'green',
									...style,
								},
							}}>
								{icon && <Icon name={icon} />}{text}
							</div>
						))}
					</div>
				),
				header: criteriaHeader,
				status: !!err
					? statuses.ERROR
					: statuses.SUCCESS,
				style: { textAlign: 'left' },
			}
		}

		if (!!err || !isFn(validate)) return triggerChange()

		const handleValidate = msg => {
			err = !!msg
			const isEl = React.isValidElement(msg)
			message = isBool(msg) || !msg
				? !!message
					? message 
					: null // no need to display a message
				: {
					content: isEl ? msg : `${msg}`,
					status: statuses.ERROR,
					...(!isEl && isObj(msg) ? msg : {}),
				}
			triggerChange()
		}

		// forces any unexpected error to be handled gracefully
		// and add loading spinner if `validate()` returns a promise
		const validatePromise = PromisE(async () => {
			let result = validate(event, data)
			if (!isPromise(result)) return result

			this.setState({ loading: true })
			result = await result
			this.setState({ loading: false })
			return result
		})

		// this makes sure there is no race condition
		this.validateDeferred = this.validateDeferred || PromisE.deferred()
		return this.validateDeferred(validatePromise).then(
			handleValidate,
			handleValidate,
		)
	}

	setMessage = (invalid, message = {}) => this.setState({ invalid, message })

	render() {
		const {
			accordion,
			containerProps,
			content,
			elementRef,
			error,
			hidden,
			ignoreAttributes,
			inline,
			inlineLabel,
			invalid: invalidP,
			label,
			labelDetails,
			loading,
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
		const {
			invalid: invalidS,
			loading: loadingS,
			message: internalMsg,
			options,
		} = this.state
		const invalid = invalidP || invalidS
		const message = internalMsg || externalMsg
		let hideLabel = false
		let inputEl = ''
		if (hidden) return ''

		// Remove attributes that are used by the form or Form.Field but
		// shouldn't be used or may cause error when using with inputEl
		let attrs = objWithoutKeys(
			{
				...this.props,
				key: name,
				loading: loadingS || loading,
			},
			[...NON_ATTRIBUTES, ...(ignoreAttributes || [])]
		)
		attrs.id = attrs.id || name
		attrs.ref = elementRef
		attrs.onChange = this.handleChange
		let isGroup = false
		const typeLC = type.toLowerCase()
		const editable = !attrs.readOnly && !attrs.disabled

		switch (typeLC) {
			case 'button':
				attrs.content = !isFn(content)
					? content
					: content(this.props)
				inputEl = <Button {...{ as: 'a', ...attrs }} />
				break
			case 'checkbox':
			case 'radio':
				attrs.toggle = typeLC !== 'radio' && attrs.toggle
				attrs.type = 'checkbox'
				attrs.label = label
				delete attrs.value
				hideLabel = true
				inputEl = <Checkbox {...attrs} />
				break
			case 'checkbox-group':
			case 'radio-group':
				attrs.inline = inline
				attrs.options = options || attrs.options
				attrs.radio = typeLC === 'radio-group' || attrs.radio
				attrs.rxValue = rxValue
				attrs.value = (rxValue ? rxValue.value : attrs.value)
					|| (attrs.multiple ? [] : '')
				inputEl = <CheckboxGroup {...attrs} />
				break
			case 'date':
			case 'dateinput':
				attrs.rxValue = rxValue
				inputEl = <DateInput {...{ ...attrs, invalid }} />
				break
			case 'dropdown':
				attrs.openOnFocus = isBool(attrs.openOnFocus)
					? attrs.openOnFocus
					: false // change default to false
				attrs.disabled = attrs.disabled || attrs.readOnly
				attrs.inline = inline
				// if number of options is higher than 50 and if lazyLoad is disabled, can slowdown FormBuilder
				attrs.lazyLoad = isBool(attrs.lazyLoad)
					? attrs.lazyLoad
					: true
				attrs.search = isArr(attrs.search)
					? searchRanked(attrs.search)
					: attrs.search
				attrs.style = { ...attrs.style }
				attrs.options = options || attrs.options
				attrs.value = (rxValue ? rxValue.value : attrs.value)
					|| (attrs.multiple ? [] : '')
				inputEl = <Dropdown {...attrs} />
				break
			case 'group':
				// NB: if `widths` property is used `unstackable` property is ignored by Semantic UI!!!
				isGroup = true
				// const numChild = attrs.inputs.filter(({ hidden }) => !hidden).length
				// const childContainerStyle = {
				// 	// width:
				// 	// 	attrs.widths !== 'equal'
				// 	// 		? undefined
				// 	// 		: `${100 / numChild}%`,
				// }
				// attrs.widths !== 'equal' ? {} : { width: `${100 / numChild}%` }
				inputEl = attrs.inputs.map(childInput => (
					<FormInput {...{
						...childInput,
						key: childInput.name,
						styleContainer: {
							// ...childContainerStyle,
							...childInput.styleContainer,
						},
						width: childInput.width || (
							attrs.widths === 'equal'
								? null
								: attrs.widths
						),
					}} />
				))
				break
			// for accessibility as prescrived by Google
			case 'hidden': return (
				<input {...{
					...attrs,
					autoComplete: 'username',
					style: {
						...attrs.style,
						display: 'none',
					},
					type: 'text',
					value: !hasValue(attrs.value)
						? ''
						: attrs.value,
				}} />
			)
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
			default: //forces inputs to be controlled
				attrs.value = !hasValue(attrs.value)
					? ''
					: attrs.value
				attrs.fluid = !useInput
					? undefined
					: attrs.fluid
				attrs.label = inlineLabel || attrs.label
				const El = useInput || inlineLabel
					? Input
					: Form.Input
				inputEl = <El {...attrs} />
		}

		if (!isGroup) return (
			<Form.Field {...{
				...containerProps,
				error: ['dateinput', 'date'].includes(typeLC)
					? false
					: (message && message.status === statuses.ERROR)
						|| !!error
						|| !!invalid,
				key: name,
				required,
				style: styleContainer,
				title: editable
					? undefined
					: errMsgs.readOnlyField,
				width: width === null
					? undefined
					: width,
			}}>
				{!hideLabel &&
					label && [
						<label htmlFor={attrs.id} key='label'>
							{label}
						</label>,
						labelDetails && (
							<div
								key='labelDetails'
								style={{
									lineHeight: '15px',
									margin: '-5px 0 8px 0',
								}}
							>
								<small style={{ color: 'grey' }}>{labelDetails}</small>
							</div>
						),
					]}
				{inputEl}
				{message && <Message {...message} />}
			</Form.Field>
		)

		let groupEl = (
			<React.Fragment>
				<Form.Group {...{
					...attrs,
					className: 'form-group',
					...objWithoutKeys(attrs, ['inputs']),
					style: {
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
			<InvertibleMemo {...{
				El: Accordion,
				...objWithoutKeys(accordion, NON_ATTRIBUTES),
				style: {
					marginBottom: 15,
					width: '100%',
					...accordion.style,
				},
			}}>
				<Accordion.Title {...{
					active: !collapsed,
					content: accordion.title || label,
					icon: accordion.icon || 'dropdown',
					onClick: () => {
						this.setState({ collapsed: !collapsed })
						isFn(accordion.onClick) && accordion.onClick(!collapsed)
					},
					style: accordion.titleStyle,
				}} />
				<Accordion.Content {...{
					active: !collapsed,
					content: groupEl,
					style: accordion.contentStyle,
				}} />
			</InvertibleMemo>
		)
	}
}
FormInput.propTypes = {
	criteria: PropTypes.arrayOf(
		PropTypes.object
	),
	// Delay, in miliseconds, to display built-in and `validate` error messages
	// Set `defer` to `null` to prevent using deferred mechanism
	defer: PropTypes.number,
	// attributes to ignore when passing on to input element
	ignoreAttributes: PropTypes.arrayOf(PropTypes.string),
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
	// @rxValue	BehaviorSubject: (optional)only applications to input types that uses the `options` property
	// On value change `options` will be updated
	rxOptions: PropTypes.oneOfType([PropTypes.instanceOf(BehaviorSubject), PropTypes.instanceOf(Subject)]),
	// @rxOptionsModifier function: (optional) allows value of rxOptions to be modified before being applied to input
	rxOptionsModifier: PropTypes.func,
	// @rxValue	BehaviorSubject: (optional) if supplied, rxValue and input value will be synced automatically
	rxValue: PropTypes.instanceOf(BehaviorSubject),
	// @rxValueModifier function: (optional) allows the value of rxValue to be modified before being applied to input
	rxValueModifier: PropTypes.func,
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
	ignoreAttributes: [],
	integer: false,
	type: 'text',
	width: 16,
}

export default React.memo(FormInput)
