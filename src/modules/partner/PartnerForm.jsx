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
} from '../../utils/utils'
import FormBuilder, {
	fillValues,
	findInput,
} from '../../components/FormBuilder'
import { showForm } from '../../services/modal'
import { translated } from '../../services/language'
import client from '../chat/ChatClient'
import { contacts } from '../contact/contact'
import ContactForm, {
	inputNames as contactInputNames,
} from '../contact/ContactForm'
import identityService from '../identity/identity'
import locations, {
	newId as newLocationId,
	set as saveLocation,
} from '../location/location'
import LocationForm, {
	inputNames as locationInputNames,
} from '../location/LocationForm'
import CompanyForm from './CompanyForm'
import {
	get,
	getAddressName,
	getAllTags,
	getByName,
	set,
	setPublic,
	types,
	visibilityTypes,
} from './partner'
import { Icon } from 'semantic-ui-react'

const textsCap = translated(
	{
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
		nameLabel: 'enter partner name',
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
	},
	true
)[1]

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
		const { address, name, tags = [], visibility } = values
		const query = { [locationInputNames.partnerIdentity]: address }
		const [locationId, location] =
			Array.from(
				!address
					? new Map()
					: locations.search(query, true, true, false, 1)
			)[0] || []
		const contact = (address && contacts.find(query)) || undefined
		this.companySearchDP = PromisE.deferred()

		// placeholder to store user added address to the dropdown list
		this.customAddresses = []
		this.state = {
			closeText: this.doUpdate && autoSave ? null : closeText,
			header:
				header || (this.doUpdate ? textsCap.header2 : textsCap.header1),
			message: {},
			onChange: this.handleFormChange,
			onSubmit: this.handleSubmit,
			subheader:
				subheader ||
				(this.doUpdate && autoSave ? (
					<i style={{ color: 'grey' }}>{textsCap.autoSaved}</i>
				) : undefined),
			submitText:
				submitText ||
				(this.doUpdate
					? autoSave
						? null
						: textsCap.header2
					: textsCap.header1),
			success: false,
			values,
			inputs: [
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
					minCharacters: 3,
					name: inputNames.address,
					noResultsMessage: textsCap.addressEmptySearchMessage,
					onAddItem: this.handleAddressAddItem,
					onChange: this.handleAddressChange,
					onSearchChange: this.handleAddressSearchChange,
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
					selection: true,
					search: true,
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
					label: textsCap.userIdLabel,
					name: inputNames.userId,
					multiple: false,
					placeholder: textsCap.userIdPlaceholder,
					type: 'UserIdInput',
				},
				{
					accordion: {
						collapsed: true,
						styled: true,
					},
					label: textsCap.locationGroupLabel,
					name: inputNames.locationGroup,
					type: 'group',
					inputs: [
						{
							name: inputNames.locationFormHtml,
							type: 'html',
							content: (
								<LocationForm
									{...{
										El: 'div',
										autoSave: true,
										id: locationId,
										inputsHidden: [
											locationInputNames.partnerName,
											locationInputNames.removeBtn,
										],
										style: {
											// marginBottom: -30,
											width: '100%',
										},
										values: {
											...location,
											partnerIdentity: address,
										},
										// hide location related inputs when partner location is removed
										onRemove: () => {
											const { inputs } = this.state
											const locationGroupIn =
												findInput(
													inputs,
													inputNames.locationGroup
												) || {}
											locationGroupIn.hidden = true
											this.setState({ inputs })
										},
									}}
								/>
							),
						},
					],
				},
				{
					accordion: {
						collapsed: true,
						styled: true,
					},
					label: textsCap.contactGroupLabel,
					name: inputNames.contactGroup,
					type: 'group',
					inputs: [
						{
							name: inputNames.contactFormHtml,
							type: 'html',
							content: (
								<ContactForm
									{...{
										El: 'div',
										autoSave: true,
										inputsHidden: [
											contactInputNames.removeBtn,
											contactInputNames.partnerIdentity,
										],
										style: {
											// marginBottom: -30,
											width: '100%',
										},
										values: {
											...contact,
											partnerIdentity: address,
										},
										// hide location related inputs when partner location is removed
										onRemove: () => {
											const { inputs } = this.state
											const contactGroupIn =
												findInput(
													inputs,
													inputNames.contactGroup
												) || {}
											contactGroupIn.hidden = true
											this.setState({ inputs })
										},
									}}
								/>
							),
						},
					],
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
			].filter(Boolean),
		}

		this.originalSetState = this.setState
		this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
	}

	componentWillMount = () => {
		this._mounted = true
		const { inputs, values } = this.state
		// const addressIn = findInput(inputs, 'address')
		const assocIn = findInput(inputs, inputNames.associatedIdentity)
		assocIn.options = arrSort(
			identityService.getAll().map(({ name, address }) => ({
				key: address,
				text: name,
				value: address,
			})),
			'text'
		)

		values.address &&
			setTimeout(() => {
				this.checkVisibility(values.address)
				this.handleAddressSearchChange(
					{},
					{ searchQuery: values.address }
				)
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
		nameIn.disabled = exists

		// make sure partner list is also updated
		this.doUpdate && setPublic(address, visibility)
		this.setState({ inputs, values })
	}

	handleAddressAddItem = (_, { value }) => {
		if (this.customAddresses.includes(value)) return
		const { inputs } = this.state
		findInput(inputs, inputNames.address).options.push({
			key: value,
			text: value,
			value,
		})
		this.setState({ inputs })
	}

	handleAddressChange = (e, { address }, i) => {
		const { inputs } = this.state
		const locationGroupIn = findInput(inputs, inputNames.locationGroup)
		const nameIn = findInput(inputs, inputNames.name)
		const regNumIn = findInput(inputs, inputNames.registeredNumber)
		const typeIn = findInput(inputs, inputNames.type)
		const visibilityIn = findInput(inputs, inputNames.visibility)
		const { options = [] } = inputs[i]
		const { company = {} } = options.find(x => x.value === address) || {}

		// hide location if company selected as company includes a location
		locationGroupIn.hidden = !!company
		nameIn.type = !!company ? 'hidden' : 'text'
		// hide visitibity if company selected as it is already "public"
		visibilityIn.hidden = !!company
		// only hide registration number if selected company contains a number
		regNumIn.value = company.registrationNumber || ''
		regNumIn.readOnly = !!company && !!regNumIn.value

		if (company) {
			nameIn.rxValue.next(company.name)
			typeIn.rxValue.next(types.BUSINESS)
			visibilityIn.rxValue.next(visibilityTypes.PUBLIC)
		}
		this.setState({ inputs })
	}

	handleAddressSearchChange = deferred((_, { searchQuery }) => {
		if (`${searchQuery || ''}`.length < 3) return
		const { inputs } = this.state
		const { values = {} } = this.props
		const addressIn = findInput(inputs, inputNames.address)
		const isValidAddress = !!addressToStr(searchQuery)
		const promise = client.companySearch.promise(searchQuery, false)
		addressIn.allowAdditions = false
		addressIn.loading = true
		this.setState({ inputs })

		const AddressOptionText = React.memo(({ name, subText }) => (
			<div>
				{name}
				<div style={{ color: 'grey' }}>
					<small>{subText}</small>
				</div>
			</div>
		))

		const handleResult = success => result => {
			const err = !success ? result : null
			const companies = success ? result : new Map()
			addressIn.loading = false
			addressIn.allowAdditions = !err && companies.size === 0 && isValidAddress
			addressIn.options = err || !companies
					? []
				: Array
					.from(companies)
					.map(([hash, company]) => {
						const { countryCode, identity, name, regAddress = {} } = company
						const { addressLine1, county, postCode, postTown } = regAddress 
						const key = identity
						const ar = [addressLine1, postTown, postCode, county]
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
							search: [name, identity, subText].join(' '),
							style: { margin: '-6px 0' },
							text: <AddressOptionText {...{ key, name, subText }} />,
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
			addressIn.message = !err ? null : { content: err, status: 'error' }
			this.setState({ inputs })
		}
		this.companySearchDP(promise).then(
			handleResult(true),
			handleResult(false)
		)
	}, 300)

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
		const { autoSave, closeOnSubmit, onSubmit } = this.props
		const { inputs, values } = this.state
		const { company } =
			(
				findInput(inputs, inputNames.address) || { options: [] }
			).options.find(x => x.value === values.address) || {}
		const visibilityIn = findInput(inputs, inputNames.visibility)
		const visibilityDisabled = visibilityIn.disabled || visibilityIn.hidden
		const companyExists = !!company || visibilityDisabled
		let { name, address, locationId, visibility } = values
		if (!!companyExists) {
			name = (company && company.name) || name
			visibility = visibilityTypes.PUBLIC
		}
		const addCompany =
			!visibilityDisabled &&
			visibility === visibilityTypes.PUBLIC &&
			!company
		// save partner
		const valuesTemp = { ...values }
		if (addCompany) {
			// temporary set visibility to private and only update when company is successfully published
			valuesTemp[inputNames.visibility] = visibilityTypes.PRIVATE
			visibilityIn.rxValue.next(visibilityTypes.PRIVATE)
		}

		// if company added from database add location
		if (!!company && !!company.regAddress && !locationId) {
			const { countryCode, regAddress = {} } = company
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
			const location = {
				addressLine1: addressLine1 || placeholderValue,
				addressLine2,
				city: city || placeholderValue,
				countryCode: countryCode || placeholderValue,
				name: company.name,
				partnerIdentity: address,
				postcode: postCode || placeholderValue,
				state: state || placeholderValue,
			}
			locationId = newLocationId(address)
			saveLocation(location, locationId)
			values.locationId = locationId
		}

		const success = set(values) && (!this.doUpdate || !autoSave)
		const message =
			closeOnSubmit || this.doUpdate
				? null
				: {
						content: !success
							? textsCap.submitFailedMsg
							: this.doUpdate
							? textsCap.submitSuccessMsg2
							: textsCap.submitSuccessMsg1,
						icon: true,
						status: success ? 'success' : 'error',
				  }
		this.setState({ message, success })

		// Open add partner form
		isFn(onSubmit) && onSubmit(true, values)
		addCompany &&
			showForm(CompanyForm, {
				message: {
					header: this.doUpdate
						? textsCap.submitSuccessMsg2
						: textsCap.submitSuccessMsg1,
					content: textsCap.companyFormOnOpenMsg,
					icon: true,
					status: 'success',
				},
				onSubmit: (e, v, ok) =>
					!ok && visibilityIn.rxValue.next(visibilityTypes.PUBLIC),
				size: 'tiny',
				values: { name, identity: address },
			})
	}, 100)

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
}
PartnerForm.defaultProps = {
	autoSave: false,
	size: 'tiny',
}
