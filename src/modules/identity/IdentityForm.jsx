import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { validateMnemonic } from 'bip39'
import { BehaviorSubject } from 'rxjs'
import { Button } from 'semantic-ui-react'
import {
	isFn,
	arrUnique,
	deferred,
	objHasKeys,
	isBool,
} from '../../utils/utils'
import FormBuilder, {
	findInput,
	fillValues,
} from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { getAllTags } from '../partner/partner'
import {
	addFromUri,
	DERIVATION_PATH_PREFIX,
	find,
	generateUri,
	get,
	set,
	USAGE_TYPES,
} from './identity'
import { getAll as getLocations, rxLocations } from '../location/location'
import { showForm } from '../../services/modal'
import LocationForm from '../location/LocationForm'
import ContactForm from '../contact/ContactForm'
import { getAll as getContacts, rxContacts } from '../contact/contact'
import BackupForm from '../gettingStarted/BackupForm'
import { statuses } from '../../components/Message'
import PromisE from '../../utils/PromisE'
import IdentityIcon from './IdentityIcon'

const textsCap = translated(
	{
		address: 'address',
		autoSaved: 'changes will be auto-saved',
		bip39Warning: 'The mnemonic you have entered is not BIP39 compatible. You may or may not be able to restore your identity on any other wallet applications. It is recommended that you use a BIP39 compatible mnemonic. If you choose to use BIP39 incompatible mnemonic, please use at your own risk!',
		businessInfoLabel: 'business information',
		contactIdCreateTitle: 'create a new contact',
		contactIdLabel: 'contact details',
		contactIdPlaceholder: 'select contact details',
		create: 'create',
		business: 'business',
		generate: 'generate',
		identity: 'identity',
		name: 'name',
		personal: 'personal',
		restore: 'restore',
		seed: 'seed',
		tags: 'tags',
		update: 'update',
		headerCreate: 'create identity',
		headerRestore: 'restore identity',
		headerUpdate: 'update identity',
		identityNamePlaceholder: 'enter a name for your Blockchain identity',
		locationIdCreateTitle: 'create a new location',
		locationIdLabel: 'location',
		locationIdPlaceholder: 'select a location',
		regNumberLabel: 'registered number',
		regNumberPlaceholder: 'company registration number',
		restoreInputLabel: 'restore my existing identity',
		seedExists: 'seed already exists in the identity list with name:',
		seedPlaceholder: 'enter existing seed or generate one',
		tagsInputEmptyMessage: 'type a tag and press enter to add, to tags list',
		tagsPlaceholder: 'enter tags',
		uniqueNameRequired: 'please enter an unique name',
		usageType: 'usage type',
		validSeedRequired: 'please enter a valid seed',
		vatNumberLabel: 'VAT number',
		vatNumberPlaceholder: 'VAT registration number',
	},
	true,
)[1]

export const requiredFields = Object.freeze({
	address: 'address',
	name: 'name',
	uri: 'uri',
	usageType: 'usageType',
})
export const inputNames = Object.freeze({
	...requiredFields,
	businessInfo: 'businessInfo',
	contactId: 'contactId',
	locationId: 'locationId',
	registeredNumber: 'registeredNumber',
	restore: 'restore',
	tags: 'tags',
	vatNumber: 'vatNumber',
})

export default class IdentityForm extends Component {
	constructor(props) {
		super(props)

		let {
			autoSave,
			header,
			message,
			submitText,
			values,
		} = props
		const {
			address,
			restore,
			usageType,
		} = values || {}
		const existingValues = get(address)
		this.values = { ...existingValues, ...values }
		this.rxAddress = new BehaviorSubject(address)
		this.doUpdate = !!existingValues
		autoSave = isBool(autoSave)
			? autoSave
			: this.doUpdate
		this.header = header || (
			this.doUpdate
				? textsCap.headerUpdate
				: textsCap.headerCreate
		)
		const inputs = [
			{
				hidden: this.doUpdate,
				name: inputNames.restore,
				onChange: this.handleRestoreChange,
				options: [
					{
						label: textsCap.restoreInputLabel,
						value: true,
					},
				],
				rxValue: new BehaviorSubject(),
				type: 'Checkbox-group',
			},
			{
				label: textsCap.name,
				maxLength: 64,
				minLength: 3,
				name: inputNames.name,
				placeholder: textsCap.identityNamePlaceholder,
				required: true,
				rxValue: new BehaviorSubject(),
				type: 'text',
				validate: this.validateName,
				// value: '',
			},
			{
				hidden: true,
				label: textsCap.seed,
				name: inputNames.uri,
				onChange: this.handleUriChange,
				placeholder: textsCap.seedPlaceholder,
				readOnly: true,
				required: true,
				rxValue: new BehaviorSubject(),
				type: 'text',
				validate: values => values.restore && this.validateUri,
				// value: '',
			},
			{
				inline: true,
				label: textsCap.usageType,
				name: inputNames.usageType,
				onChange: this.handleUsageTypeChange,
				options: [
					{
						label: textsCap.personal,
						value: USAGE_TYPES.PERSONAL,
					},
					{
						label: textsCap.business,
						value: USAGE_TYPES.BUSINESS,
					},
				],
				radio: true,
				required: true,
				rxValue: new BehaviorSubject(),
				type: 'Checkbox-group',
			},
			{
				label: textsCap.address,
				name: inputNames.address,
				rxValue: this.rxAddress,
				type: 'hidden',
				// value: '',
			},
			{
				allowAdditions: true,
				label: textsCap.tags,
				name: inputNames.tags,
				noResultsMessage: textsCap.tagsInputEmptyMessage,
				multiple: true,
				onAddItem: this.handleAddTag,
				options: arrUnique([
					...getAllTags(),
					...(this.values.tags || []),
				]).map(tag => ({
					key: tag,
					text: tag,
					value: tag,
				})),
				placeholder: textsCap.tagsPlaceholder,
				type: 'dropdown',
				search: true,
				selection: true,
			},
			{
				accordion: {
					collapsed: true,
					styled: true,
				},
				label: textsCap.businessInfoLabel,
				name: inputNames.businessInfo,
				grouped: true,
				type: 'group',
				inputs: [
					{
						clearable: true,
						label: (
							<div>
								{textsCap.locationIdLabel + ' '}
								<Button {...{
									as: 'a', // prevents form being submitted unexpectedly
									icon: 'plus',
									onClick: () => showForm(LocationForm, {
										onSubmit: this.handleLocationCreate,
									}),
									size: 'mini',
									style: { padding: 3 },
									title: textsCap.locationIdCreateTitle,
								}} />
							</div>
						),
						name: inputNames.locationId,
						// get initial options
						options: this.getLocationOptions(
							getLocations()
						),
						placeholder: textsCap.locationIdPlaceholder,
						rxOptions: rxLocations,
						rxOptionsModifier: this.getLocationOptions,
						rxValue: new BehaviorSubject(),
						search: ['text'],
						selection: true,
						type: 'dropdown',
					},
					{
						clearable: true,
						label: (
							<div>
								{textsCap.contactIdLabel + ' '}
								<Button {...{
									as: 'a', // prevents form being submitted unexpectedly
									icon: 'plus',
									onClick: () => showForm(ContactForm, {
										onSubmit: this.handleContactCreate,
									}),
									size: 'mini',
									style: { padding: 3 },
									title: textsCap.contactIdCreateTitle,
								}} />
							</div>
						),
						name: inputNames.contactId,
						// get initial options
						options: this.getContactOptions(getContacts()),
						placeholder: textsCap.contactIdPlaceholder,
						rxOptions: rxContacts,
						rxOptionsModifier: this.getContactOptions,
						rxValue: new BehaviorSubject(),
						search: ['text'],
						selection: true,
						type: 'dropdown',
					},
					{
						label: textsCap.regNumberLabel,
						minLength: 3,
						maxLength: 64,
						name: inputNames.registeredNumber,
						placeholder: textsCap.regNumberPlaceholder,
					},
					{
						label: textsCap.vatNumberLabel,
						minLength: 3,
						maxLength: 64,
						name: inputNames.vatNumber,
						placeholder: textsCap.vatNumberPlaceholder,
					},
				],
			},
		]
		this.state = {
			closeText: autoSave
				? null // hide close button
				: undefined,
			header: this.header,
			headerIcon: (
				<IdentityIcon {...{
					address,
					size: 'large',
					usageType,
				}} />
			),
			subheader: this.doUpdate && autoSave
				? textsCap.autoSaved
				: undefined,
			message,
			onChange: this.handleFormChange,
			onSubmit: this.handleSubmit,
			submitText: submitText || submitText === null
				? submitText
				: this.doUpdate
					? autoSave
						? null
						: textsCap.update
					: restore
						? textsCap.restore
						: textsCap.create,
			success: false,
			inputs: fillValues(inputs, this.values),
		}
	}

	deferredSave = deferred((address, values) => {
		try {
			set(address, values)
		} catch (err) {
			this.setState({
				message: {
					content: `${err}`,
					icon: true,
					status: statuses.ERROR,
				}
			})
		}
	}, 500)

	deferredUriValidate = PromisE.deferred()

	getContactOptions = contactsMap => {
		const excludePartnerContacts = ([_, c]) => !c.partnerIdentity
		const formatOption = ([id, c]) => ({
			description: (
				<span style={{ marginTop: 4 }}>
					{c.email}
				</span>
			),
			key: id,
			text: (
				<span style={{ paddingLeft: 25 }}>
					<Button {...{
						compact: true,
						icon: 'pencil',
						onClick: e => {
							e.preventDefault()
							e.stopPropagation()
							showForm(ContactForm, {
								autoSave: true,
								values: c,
							})
						},
						size: 'mini',
						// style adjustment to make sure height of the dropdown doesn't change because of the button
						style: {
							position: 'absolute',
							margin: '-5px -30px',
						},
					}} />
					{c.name}
				</span>
			),
			title: [
				c.email,
				(c.phoneCode || '') + (c.phoneNumber || '')
			]
				.filter(Boolean)
				.join(' '),
			value: id,
		})
		return Array.from(contactsMap)
			.filter(excludePartnerContacts)
			.map(formatOption)
	}

	getLocationOptions = locationsMap => {
		const excludePartnerLocations = ([_, l]) => !l.partnerIdentity
		const formatOption = ([id, l]) => ({
			description: (
				<span style={{ marginTop: 4 }}>
					{[l.state, l.countryCode].filter(Boolean).join(', ')}
				</span>
			),
			key: id,
			text: (
				<span style={{ paddingLeft: 25 }}>
					<Button {...{
						compact: true,
						icon: 'pencil',
						onClick: e => {
							e.preventDefault()
							e.stopPropagation()
							showForm(LocationForm, {
								autoUpdate: true,
								id,
								values: l,
							})
						},
						size: 'mini',
						// style adjustment to make sure height of the dropdown doesn't change because of the button
						style: {
							position: 'absolute',
							margin: '-5px -30px',
						},
					}} />
					{l.name}
				</span>
			),
			title: [
				l.addressLine1,
				l.addressLine2,
				l.city,
				l.postcode,
			]
				.filter(Boolean)
				.join(' '),
			value: id,
		})
		return Array.from(locationsMap)
			.filter(excludePartnerLocations)
			.map(formatOption)
	}

	handleAddTag = (_, data) => {
		const { inputs } = this.state
		findInput(inputs, inputNames.tags).options.push({
			key: data.value,
			text: data.value,
			value: data.value,
		})
		this.setState({ inputs })
	}

	handleContactCreate = (success, _, id) => {
		if (!success) return
		const { inputs } = this.state
		const contactIdIn = findInput(inputs, inputNames.contactId)
		contactIdIn.rxValue.next(id)
	}

	handleFormChange = deferred((...args) => {
		const { autoSave, onChange } = this.props
		const [_, values, invalid] = args
		this.values = values
		!invalid && isFn(onChange) && onChange(...args)
		if (invalid || !autoSave || !this.doUpdate) return

		// prevent saving if one or more fields are empty
		if (!objHasKeys(values, Object.keys(requiredFields), true)) return

		const address = values[inputNames.address]
		this.deferredSave(address, values)
	}, 500)

	handleLocationCreate = (success, _, id) => {
		if (!success) return
		const { inputs } = this.state
		const locationIdIn = findInput(inputs, inputNames.locationId)
		locationIdIn.rxValue.next(id)
	}

	handleRestoreChange = (_, values) => {
		const { inputs } = this.state
		const restore = values[inputNames.restore]
		const uriInput = findInput(inputs, inputNames.uri)
		uriInput.action = restore ? undefined : this.generateBtn
		uriInput.readOnly = !restore
		uriInput.hidden = !restore
		uriInput.validate = restore
			? this.validateUri
			: undefined
		this.setState({
			inputs,
			header: restore
				? textsCap.headerRestore
				: this.header,
		})
		if (restore) {
			uriInput.rxValue.next('')
			this.rxAddress.next('')
		} else {
			// regenerate address
			this.handleUsageTypeChange(_, values)
		}
	}

	handleSubmit = deferred(() => {
		const { onSubmit, warnBackup } = this.props
		const { values } = this
		const address = values[inputNames.address]
		set(address, { ...values })
		isFn(onSubmit) && onSubmit(true, values)
		this.setState({ success: true })

		// ask user to backup their account
		warnBackup && BackupForm.checkAndWarn()
	}, 100)

	handleUriChange = deferred(e => {
		const { inputs } = this.state
		const isRestore = !!this.values[inputNames.restore]
		const seed = this.values[inputNames.uri] || ''
		const uriInput = findInput(inputs, inputNames.uri)
		uriInput.invalid = false
		if (this.isRestore && !!seed) {
			const err = this.validateUri(e, { value: seed })
			uriInput.invalid = !!err
			uriInput.message = !!err && {
				content: `${err}`,
				status: statuses.ERROR,
			}
			return this.setState({ inputs })
		}

		const mnemonic = seed.split('/')[0]
		const valid = !seed
			|| !mnemonic
			|| !isRestore
			|| validateMnemonic(mnemonic)

		// validate BIP39 compatibility and warn user if not compatible
		uriInput.message = valid
			? null
			: {
					content: textsCap.bip39Warning,
					status: 'warning',
			  }
		this.setState({ inputs })
	}, 500)

	// generate new seed
	handleUsageTypeChange = (_, values) => {
		const isRestore = !!values[inputNames.restore]
		if (isRestore) return // nothing to do

		const usageType = values[inputNames.usageType] || USAGE_TYPES.PERSONAL
		const { inputs } = this.state
		let seed = values[inputNames.uri]
		if (!this.doUpdate) {
			seed = seed || generateUri()
			const usageTypeCode = usageType === USAGE_TYPES.PERSONAL
				? 0
				: 1
			const seedWithoutPath = seed.split(DERIVATION_PATH_PREFIX)[0]
			seed =  `${seedWithoutPath}${DERIVATION_PATH_PREFIX}${usageTypeCode}/0`
		}
		const { address = '' } = (seed && addFromUri(seed)) || {}
		const uriInput = findInput(inputs, inputNames.uri)
		this.rxAddress.next(address)
		uriInput.rxValue.next(seed)
		this.setState({ inputs })
	}

	validateName = (_, { value: name }) => {
		const { address } = find(name) || {}
		
		return !!address
			&& address !== this.values.address
			&& textsCap.uniqueNameRequired
	}

	validateUri = (_, { value: seed }) => {
		if (!seed) return

		const { inputs } = this.state
		const { address } = (seed && addFromUri(seed)) || {}
		if (!address) {
			// reset address
			this.rxAddress.next('')
			return textsCap.validSeedRequired
		}

		const existing = find(address)
		if (existing) return `${textsCap.seedExists} ${existing.name}`

		this.values[inputNames.address] = address
		this.rxAddress.next(address)
		if (seed.includes(DERIVATION_PATH_PREFIX)) {
			// extract usageType
			const usagetypeInt = parseInt(seed.split(DERIVATION_PATH_PREFIX)[1])
			const usageType = usagetypeInt === 1
				? USAGE_TYPES.BUSINESS
				: USAGE_TYPES.PERSONAL
			const usageTypeIn = findInput(inputs, inputNames.usageType)
			usageTypeIn.hidden = true
			this.values.usageType = usageType
			usageTypeIn.rxValue.next(usageType)
			this.setState({ inputs })
		}

		return null
	}

	render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
IdentityForm.propTypes = {
	// whether to auto save when upadating identity
	autoSave: PropTypes.bool,
	onChange: PropTypes.func,
	onSubmit: PropTypes.func,
	values: PropTypes.shape({
		address: PropTypes.string, // required when updating
		name: PropTypes.string,
		uri: PropTypes.string,
		usageType: PropTypes.string,
		businessInfo: PropTypes.string,
		contactId: PropTypes.string,
		locationId: PropTypes.string,
		registeredNumber: PropTypes.string,
		restore: PropTypes.bool,
		tags: PropTypes.arrayOf(PropTypes.string),
		vatNumber: PropTypes.string,
	}),
	// whether to warn user to download a backup after creating/restoring an identity
	warnBackup: PropTypes.bool,
}
IdentityForm.defaultProps = {
	autoSave: true,
	closeOnSubmit: true,
	size: 'tiny',
	warnBackup: true,
}
