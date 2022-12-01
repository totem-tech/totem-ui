import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { ss58Decode, addressToStr } from '../../utils/convert'
import PromisE from '../../utils/PromisE'
import {
	arrSort,
	deferred,
	isFn,
	arrUnique,
	objHasKeys,
	isObj,
	objClean,
} from '../../utils/utils'
import FormBuilder, {
	fillValues,
	findInput,
} from '../../components/FormBuilder'
import { showForm } from '../../services/modal'
import { translated } from '../../services/language'
import client from '../chat/ChatClient'
import {
	contacts as contactStorage,
	newId as newContactId,
	set as saveContact,
	validate as validateContact,
} from '../contact/contact'
import ContactForm, {
	inputNames as contactInputNames,
} from '../contact/ContactForm'
import BackupForm from '../gettingStarted/BackupForm'
import identityService, { rxIdentities } from '../identity/identity'
import locations, {
	newId as newLocationId,
	requiredKeys as locationRequiredKeys,
	set as saveLocation,
} from '../location/location'
import LocationForm, {
	inputNames as locationInputNames,
} from '../location/LocationForm'
import CompanyForm from './CompanyForm'
import {
	get,
	getAllTags,
	getByName,
	set,
	setPublic,
	types,
	visibilityTypes,
} from './partner'
import PartnerIcon from './PartnerIcon'
import { getIdentityOptions } from '../identity/getIdentityOptions'

let textsCap = {
	addressAdditionLabel: 'use',
	addressLabel: 'search for Company or Identity',
	addressEmptySearchMessage: 'enter a compnay name to search',
	addressPlaceholder: 'search by company details or identity',
	addressValidationMsg1:
		'partner already exists with the following name:',
	addressValidationMsg2: 'please enter a valid Totem Identity',
	associatedIdentityLabel: 'associated with your identity',
	associatedIdentityPlaceholder: 'select one of your identities',
	autoSaved: 'changes will be auto saved',
	business: 'business',
	contactGroupLabel: 'contact details',
	close: 'close',
	companyFormOnOpenMsg: `
	You have chosen to make this partner public.
	Please ensure you fill in the correct details.
	Click cancel to abort making public.`,
	header1: 'add partner',
	header2: 'update partner',
	locationGroupLabel: 'location',
	nameLabel: 'partner name',
	namePlaceholder: 'enter a name for this partner',
	nameValidationMsg: 'please choose an unique partner name.',
	personal: 'personal',
	private: 'private',
	public: 'public',
	regNumberLabel: 'registered number',
	regNumberPlaceholder: 'company registration number',
	submitFailedMsg: 'failed to save partner',
	submitSuccessMsg1: 'partner created successfully',
	submitSuccessMsg2: 'partner updated successfully',
	tags: 'tags',
	tagsNoResultsMsg: 'enter tag and press enter to add, to tags list.',
	tagsPlaceholder: 'enter tags',
	typeLabel: 'partner usage type',
	userIdInvalidMsg: 'please enter a valid user ID',
	userIdLabel: 'user ID for this partner',
	userIdPlaceholder: 'enter user ID for this partner',
	visibilityLabel: 'decide partner visibility (on the network)',
	vatNumberLabel: 'VAT number',
	vatNumberPlaceholder: 'VAT registration number',
}
textsCap = translated(textsCap, true)[1]

export const requiredFields = {
	address: 'address',
	name: 'name',
	type: 'type',
	visibility: 'visibility',
}
export const inputNames = {
	...requiredFields,
	associatedIdentity: 'associatedIdentity',
	contactFormHtml: 'contactFormHtml',
	contactGroup: 'contactGroup',
	locationFormHtml: 'locationFormHtml',
	locationGroup: 'locationGroup',
	registeredNumber: 'registeredNumber',
	tags: 'tags',
	userId: 'userId',
	vatNumber: 'vatNumber',
}

export default class PartnerForm extends Component {
	constructor(props = {}) {
		super(props)

		let {
			autoSave,
			closeText,
			header,
			subheader,
			submitText,
			values,
		} = props
		this.partner = values && get(values.address)
		this.doUpdate = !!this.partner
		values = { ...this.partner, ...values }
		const { address, name, tags = [], type, visibility } = values
		const query = { partnerIdentity: address }
		const [locationId, location] = Array.from(
			!address
				? new Map()
				: locations.search(
					query,
					true,
					true,
					false,
					1,
				)
		)[0] || []
		this.locationId = locationId
		const contact = (address && contactStorage.find(query)) || undefined
		this.contactId = contact && contact.id || undefined
		this.companySearchDP = PromisE.deferred()
		this.contactDraft = location
		this.locationDraft = contact

		// placeholder to store user added address to the dropdown list
		this.customAddresses = []
		this.state = {
			closeText: this.doUpdate && autoSave ? null : closeText,
			header: header || (
				this.doUpdate
					? textsCap.header2
					: textsCap.header1
			),
			headerIcon: (
				<PartnerIcon {...{
					size: 'large',
					type,
					visibility,
				}} />
			),
			message: {},
			onChange: this.handleFormChange,
			onSubmit: this.handleSubmit,
			subheader: subheader || (
				this.doUpdate && autoSave
					? <i style={{ color: 'grey' }}>{textsCap.autoSaved}</i>
					: undefined
			),
			submitText: submitText || submitText === null
				? submitText
				: !this.doUpdate
					? textsCap.header1
					: autoSave
						? null
						: textsCap.header2,
			success: false,
			values,
		}
		this.state.inputs = [
				{
					inline: true,
					label: textsCap.typeLabel,
					name: inputNames.type,
					options: [
						{ label: textsCap.personal, value: types.PERSONAL },
						{ label: textsCap.business, value: types.BUSINESS },
					],
					radio: true,
					required: true,
					rxValue: new BehaviorSubject(types.PERSONAL),
					type: 'checkbox-group',
				},
				{
					allowAdditions: false,
					additionLabel: textsCap.addressAdditionLabel + ' ',
					clearable: true,
					// disable when adding new and address is prefilled (possibly from notification)
					disabled: !this.doUpdate && !!ss58Decode(address),
					hidden: this.doUpdate,
					label: textsCap.addressLabel,
					lazyLoad: true,
					minCharacters: 1,
					name: inputNames.address,
					noResultsMessage: textsCap.addressEmptySearchMessage,
					onAddItem: this.handleAddressAddItem,
					onChange: this.handleAddressChange,
					onSearchChange: deferred(this.handleAddressSearchChange, 300),
					options: !address
						? []
						: [
							{
								key: address + name,
								text: name || address,
								value: address,
							},
						],
					placeholder: textsCap.addressPlaceholder,
					required: true,
					search: ['search'],
					selectOnNavigation: false,
					selection: true,
					type: 'dropdown',
					validate: this.validateAddress,
				},
				{
					label: textsCap.nameLabel,
					maxLength: 64,
					minLength: 3,
					name: inputNames.name,
					placeholder: textsCap.namePlaceholder,
					required: true,
					rxValue: new BehaviorSubject(''),
					type: 'text',
					validate: this.validateName,
				},
				{
					clearable: true,
					label: textsCap.associatedIdentityLabel,
					name: inputNames.associatedIdentity,
					options: [],
					placeholder: textsCap.associatedIdentityPlaceholder,
					rxOptions: rxIdentities,
					rxOptionsModifier: getIdentityOptions,
                    search: ['keywords'],
					selection: true,
					type: 'dropdown',
				},
				{
					allowAdditions: true,
					label: textsCap.tags,
					name: inputNames.tags,
					noResultsMessage: textsCap.tagsNoResultsMsg,
					multiple: true,
					onAddItem: this.handleAddTag,
					options: arrUnique([...getAllTags(), ...tags]).map(tag => ({
						key: tag,
						text: tag,
						value: tag,
					})),
					placeholder: textsCap.tagsPlaceholder,
					type: 'dropdown',
					search: true,
					selection: true,
					value: tags || [],
				},
				{
					disabled:
						this.doUpdate && visibility === visibilityTypes.PUBLIC,
					inline: true,
					label: textsCap.visibilityLabel,
					name: inputNames.visibility,
					options: [
						{
							label: textsCap.private,
							value: visibilityTypes.PRIVATE,
						},
						{
							disabled: true,
							label: textsCap.public,
							value: visibilityTypes.PUBLIC,
						},
					],
					radio: true,
					required: true,
					rxValue: new BehaviorSubject(
						values.visibility || visibilityTypes.PRIVATE
					),
					type: 'checkbox-group',
				},
			{
					hidden: values => values[inputNames.visibility] === visibilityTypes.PUBLIC,
					label: textsCap.userIdLabel,
					name: inputNames.userId,
					multiple: false,
					placeholder: textsCap.userIdPlaceholder,
					type: 'UserIdInput',
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
				{
					accordion: {
						collapsed: true,
						styled: true,
					},
					hidden: values => !values[inputNames.address],
					label: textsCap.locationGroupLabel,
					name: inputNames.locationGroup,
					type: 'group',
					inputs: [
						{
							name: inputNames.locationFormHtml,
							type: 'html',
							content: this.getLocationForm(
								location,
								locationId,
								{ submitText: null }
							),
						},
					],
				},
				{
					accordion: {
						collapsed: true,
						styled: true,
					},
					hidden: values => !values[inputNames.address],
					label: textsCap.contactGroupLabel,
					name: inputNames.contactGroup,
					type: 'group',
					inputs: [
						{
							name: inputNames.contactFormHtml,
							type: 'html',
							content: this.getContactForm({
								...contact,
								name: (contact || {}).name
									|| values.name,
								[contactInputNames.partnerIdentity]: address,
							}),
						},
					],
				},
			].filter(Boolean)

		this.originalSetState = this.setState
		this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
	}

	componentWillMount = () => {
		this._mounted = true
		const { inputs, values } = this.state
		// const addressIn = findInput(inputs, 'address')
		// const assocIn = findInput(inputs, inputNames.associatedIdentity)
		// assocIn.options = arrSort(
		// 	identityService.getAll().map(({ name, address }) => ({
		// 		key: address,
		// 		text: name,
		// 		value: address,
		// 	})),
		// 	'text'
		// )

		values.address && setTimeout(async () => {
			await this.checkVisibility(values.address)
			await this.handleAddressSearchChange(
				{},
				{ searchQuery: values.address }
			)
			this.handleAddressChange({}, values)
		})

		fillValues(inputs, values, true)
		this.setState({ inputs })
	}

	componentWillUnmount = () => (this._mounted = false)

	checkVisibility = async address => {
		if (!address) return
		const { inputs, values } = this.state
		const addressIn = findInput(inputs, inputNames.address)
		const visibilityIn = findInput(inputs, inputNames.visibility)
		const nameIn = findInput(inputs, inputNames.name)
		addressIn.loading = !!address
		this.setState({ inputs })

		// check if address is aleady public
		const result = await client.companySearch.promise(address, true)
		const exists = result.size > 0
		const visibility = exists
			? visibilityTypes.PUBLIC
			: visibilityTypes.PRIVATE
		addressIn.loading = false
		addressIn.disabled = exists
		visibilityIn.disabled = exists
		visibilityIn.rxValue.next(visibility)
		nameIn.readOnly = exists

		// make sure partner list is also updated
		this.doUpdate && setPublic(address, visibility)
		this.setState({ inputs, values })
	}

	getCompanyLocation = company => {
		if (!isObj(company)) return {}

		const {
			countryCode,
			identity,
			name,
			regAddress = {},
		} = company
		const {
			addressLine1,
			addressLine2,
			postTown: city,
			postCode,
			county: state,
		} = regAddress
		const placeholderValue = '___'
		// For required fields with empty value placeholder value is used with multiple underscores.
		// This is so that the location can be saved without the need for user intervention.
		const draft = {
			addressLine1: addressLine1 || placeholderValue,
			addressLine2,
			city: city || placeholderValue,
			countryCode: countryCode || placeholderValue,
			name,
			partnerIdentity: identity,
			postcode: postCode || placeholderValue,
			state: state || placeholderValue,
		}
		return draft
	}

	getContactForm = (contact = {}, formProps) => {
		const { values } = this.state
		contact.id = contact.id || newContactId(this.state.values[inputNames.address])
		return (
			<ContactForm {...{
				autoSave: true,
				El: 'div',
				inputsHidden: [
					contactInputNames.name,
					contactInputNames.partnerIdentity,
					// contactInputNames.removeBtn,
				],
				key: contact.id,
				onChange: !!this.contactId
					? undefined
					: (_, values) => {
						this.locationDraft = values
						this.saveContact(contact.id)
					},
				// hide contact related inputs when partner contact is removed
				onRemove: (id, values) => {
					const { inputs } = this.state
					const contactFormIn = findInput(
						inputs,
						inputNames.contactFormHtml
					) || {}
					contactFormIn.content = this.getContactForm(
						objClean(values, [contactInputNames.partnerIdentity]),// keep
					)
					this.setState({ inputs })
				},
				style: {
					width: '100%',
				},
				submitText: null,
				values: {
					...contact,
					// enter dummy data for hidden fields, if necessary
					[contactInputNames.id]: contact.id,
					[contactInputNames.name]: contact.name || '___',
				},
				...formProps,
			}} />
		)
	}

	getLocationForm = (location = {}, locationId, formProps = {}) => {
		locationId = locationId || newLocationId(this.state.values[inputNames.address])
		return (
			<LocationForm {...{
				autoSave: true,
				El: 'div',
				id: locationId,
				inputsHidden: [
					locationInputNames.name,
					locationInputNames.partnerName,
					// locationInputNames.removeBtn,
				],
				key: locationId,
				onChange: (_, values) => {
					this.locationDraft = values
					this.saveLocation(locationId)
				},
				// hide location related inputs when partner location is removed
				onRemove: (id, values) => {
					const { inputs } = this.state
					const locationFormIn = findInput(
						inputs,
						inputNames.locationFormHtml
					) || {}
					// repopulate the form with empty values
					locationFormIn.content = this.getLocationForm(
						objClean(values, [locationInputNames.partnerIdentity]), // keep
					)
					this.setState({ inputs })
				},
				style: {
					// marginBottom: -30,
					width: '100%',
				},
				submitText: null,
				values: {
					...location,
					name: location.name || '___',
				},
				...formProps,
			}} />
		)
	}
	
	handleAddressAddItem = (_, { value }) => {
		if (this.customAddresses.includes(value)) return

		const { inputs } = this.state
		findInput(inputs, inputNames.address)
			.options
			.push({
				key: value,
				text: value,
				value,
			})
		this.setState({ inputs })
	}

	handleAddressChange = (e, values) => {
		const { inputs } = this.state
		const address = values[inputNames.address]
		const isPublic = values[inputNames.visibility] === visibilityTypes.PUBLIC
		const name = values[inputNames.name]
		const nameIn = findInput(inputs, inputNames.name)
		const regNumIn = findInput(inputs, inputNames.registeredNumber)
		const typeIn = findInput(inputs, inputNames.type)
		const visibilityIn = findInput(inputs, inputNames.visibility)
		const { options = [] } = findInput(inputs, inputNames.address)
		const { company: com } = options.find(x => x.value === address) || {}
		
		visibilityIn.disabled = isPublic || !!com
		// stuff to do only when creating an entry
		if (!this.doUpdate) {
			const { name: cName = '', registrationNumber: cReg } = com || {}
			nameIn.type = !!com ? 'hidden' : 'text'
			// hide visitibity if company selected as it is already "public"
			// only hide registration number if selected company contains a number
			regNumIn.value = cReg || ''
			regNumIn.readOnly = !!cReg
			const locationFormHtml = findInput(inputs, inputNames.locationFormHtml)
			const draftAddr = (this.locationDraft || {})[locationInputNames.partnerIdentity]
			const location = com && draftAddr !== com.identity
				? this.getCompanyLocation(com)
				: this.locationDraft
			locationFormHtml.content = this.getLocationForm(
				location,
				this.locationId,
				{
					submitText: null,
				},
			)
			
			nameIn.rxValue.next(cName || name)
			typeIn.rxValue.next(
				com ? types.BUSINESS : types.PERSONAL
			)
			visibilityIn.rxValue.next(
				com ? visibilityTypes.PUBLIC : visibilityTypes.PRIVATE
			)
		}
		this.setState({ inputs })
	}

	handleAddressSearchChange = async (_, { searchQuery }) => {
		if (`${searchQuery || ''}`.length < 3) return
		const { inputs } = this.state
		const { values = {} } = this.props
		const addressIn = findInput(inputs, inputNames.address)
		const isValidAddress = !!addressToStr(searchQuery)
		const promise = client.companySearch.promise(searchQuery, false)
		addressIn.allowAdditions = false
		addressIn.loading = true
		this.setState({ inputs })

		const OptionText = React.memo(({ name, subText }) => (
			<div>
				<PartnerIcon visibility={visibilityTypes.PUBLIC} />
				{' ' + name}
				<div style={{ color: 'grey' }}>
					<small>{subText}</small>
				</div>
			</div>
		))

		const handleResult = success => result => {
			const err = !success
				? result
				: null
			const companies = success
				? result
				: new Map()
			addressIn.loading = false
			addressIn.allowAdditions = !err
				&& companies.size === 0
				&& isValidAddress
			addressIn.options = err || !companies
				? []
				: Array
					.from(companies)
					.map(([hash, company]) => {
						const {
							countryCode,
							identity,
							name,
							regAddress = {},
						} = company
						const {
							addressLine1,
							county,
							postCode,
							postTown,
						} = regAddress 
						const key = identity
						const ar = [
							addressLine1,
							postTown,
							postCode,
							county,
						]
						const subText = ar
							.map(x => `${x || ''}`.trim())
							.filter(Boolean)
							.map((x, i) => `${x}${i >= ar.length - 1 ? '' : x.endsWith(',') ? '' : ','} `)
						return {
							company, // keep
							hash,
							description: countryCode,
							key, // also used for DropDown's search
							name,
							search: [
								name,
								identity,
								subText,
							].join(' '),
							style: { margin: '-6px 0' },
							text: (
								<OptionText {...{
									key,
									name,
									subText,
								}} />
							),
							value: identity,
						}
					})
			const hideAddr = values.address
				&& isValidAddress
				&& addressIn.options.length === 0
			if (hideAddr) {
				// valid address
				addressIn.hidden = true
				addressIn.options = [
					{
						key: searchQuery,
						text: searchQuery,
						value: searchQuery,
					},
				]
			}
			addressIn.message = !err
				? null
				: { content: err, status: 'error' }
			this.setState({ inputs })
		}
		return this.companySearchDP(promise).then(
			handleResult(true),
			handleResult(false)
		)
	}

	handleAddTag = (_, data) => {
		const { inputs } = this.state
		inputs
			.find(x => x.name === inputNames.tags)
			.options.push({
				key: data.value,
				text: data.value,
				value: data.value,
			})
		this.setState({ inputs })
	}

	handleFormChange = (_, values, invalid) => {
		this.setState({ values })
		if (!this.props.autoSave || invalid) return
		// prevent saving if missing one or more requiredFields
		if (!objHasKeys(values, Object.keys(requiredFields), true)) return
		this.doUpdate && this.handleSubmit()
	}

	handleSubmit = deferred(() => {
		const { autoSave, closeOnSubmit, onSubmit, warnBackup } = this.props
		const { inputs, values } = this.state
		const doBackup = warnBackup && !this.doUpdate
		let address = values[inputNames.address]
		let name = values[inputNames.name]
		let visibility = values[inputNames.visibility]
		const addressIn = findInput(inputs, inputNames.address)
		const { company } = !!address
			&& (addressIn.options || []).find(x => x.value === address)
			|| {}
		const visibilityIn = findInput(inputs, inputNames.visibility)
		const visibilityDisabled = visibilityIn.disabled || visibilityIn.hidden
		const companyExists = !!company || visibilityDisabled
		if (!!companyExists) {
			name = (company && company.name) || name
			visibility = visibilityTypes.PUBLIC
		}
		const addCompany = !visibilityDisabled
			&& visibility === visibilityTypes.PUBLIC
			&& !company
		// save partner
		const valuesTemp = { ...values }
		if (addCompany) {
			// temporary set visibility to private and only update when company is successfully published
			valuesTemp[inputNames.visibility] = visibilityTypes.PRIVATE
			visibilityIn.rxValue.next(visibilityTypes.PRIVATE)
		}

		
		const success = set(values) && (!this.doUpdate || !autoSave)
		const message = closeOnSubmit || this.doUpdate
			? null
			: {
				content: !success
				? textsCap.submitFailedMsg
				: this.doUpdate
				? textsCap.submitSuccessMsg2
				: textsCap.submitSuccessMsg1,
				icon: true,
				status: success
				? 'success'
				: 'error',
			}
		this.setState({ message, success })
		
		// check & save contact & location if necessary
		this.saveContact()
		this.saveLocation()
		
		// Open add partner form
		isFn(onSubmit) && onSubmit(true, values)
		addCompany && showForm(CompanyForm, {
			message: {
				header: this.doUpdate
					? textsCap.submitSuccessMsg2
					: textsCap.submitSuccessMsg1,
				content: textsCap.companyFormOnOpenMsg,
				icon: true,
				status: 'success',
			},
			onSubmit: (e, v, ok) => {
				doBackup && BackupForm.checkAndWarn(false)
				if (!ok) return
				
				visibilityIn.rxValue.next(
					visibilityTypes.PUBLIC
				)
			},
			size: 'tiny',
			values: { name, identity: address },
		})
		return !addCompany
			&& doBackup
			&& BackupForm.checkAndWarn(false)
	}, 100)

	saveContact = (id) => {
		if (!!this.contactId || !isObj(this.contactDraft)) return

		const { values } = this.state
		const address = values[inputNames.address]
		const name = values[inputNames.name]
		if (!address || !name) return

		this.contactDraft = {
			...this.contactDraft,
			id: id || newContactId(address),
			name,
			partnerIdentity: address,
		}
		const err = validateContact(this.contactDraft)
		!err && saveContact(this.contactDraft, false, true)
	}

	saveLocation = deferred((id) => {
		if (!!this.locationId || !isObj(this.locationDraft)) return

		const { values } = this.state
		const address = values[inputNames.address]
		const name = values[inputNames.name]
		if (!address || !name) return

		this.locationDraft = {
			...this.locationDraft,
			name,
			partnerIdentity: address,
		}
		id = id || newLocationId(address)
		const locationValid = objHasKeys(this.locationDraft, locationRequiredKeys)
		locationValid && saveLocation(this.locationDraft, id, false)
	}, 300)

	validateAddress = (e, { value: address }) => {
		if (!address || this.doUpdate) return
		const partner = get(address)
		// attempting to add a new partner with duplicate address
		if (partner && !this.doUpdate)
			return (
				<p>
					{textsCap.addressValidationMsg1} <br />
					{partner.name}
				</p>
			)
		return !ss58Decode(address) && textsCap.addressValidationMsg2
	}

	validateName = (e, { value: name }, values) => {
		const address = values[inputNames.address]
		name = `${name || ''}`.trim()
		const partner = name && getByName(name)
		return !partner || partner.address === address
			? null
			: textsCap.nameValidationMsg
	}

	render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
PartnerForm.propTypes = {
	// whether to auto-save on update
	autoSave: PropTypes.bool,
	// values to be prefilled into inputs
	values: PropTypes.object,
	// warn user to download a backup.
	// only applicable when adding a partner.
	warnBackup: PropTypes.bool,
}
PartnerForm.defaultProps = {
	autoSave: false,
	closeOnSubmit: true,
	size: 'tiny',
	warnBackup: true,
}
