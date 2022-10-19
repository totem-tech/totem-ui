import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Button } from 'semantic-ui-react'
import {
	isFn,
	isObj,
	isArr,
	isStr,
	deferred,
} from '../../utils/utils'
import FormBuilder, {
	fillValues,
	findInput,
} from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import client from '../chat/ChatClient'
import { get as getContact } from '../contact/contact'
import ContactForm, {
	inputNames as contactcInputNames,
} from '../contact/ContactForm'
import { getAll as getPartners } from '../partner/partner'
import { get as getLocation } from '../location/location'
import LocationForm, {
	inputNames as locFormInputNames,
} from '../location/LocationForm'
import { find as findIdentity, getAll as getIdentities } from './identity'
import IdentityForm, { inputNames as idInputNames } from './IdentityForm'

const notificationType = 'identity'
const childType = 'share'
const textsCap = translated(
	{
		failedMsgHeader: 'submission failed!',
		formHeader1: 'share identity/partner',
		formHeader2: 'share identity',
		formHeader3: 'share partner',
		formSubheader: 'with one or more Totem users',
		identities: 'identities',
		identity: 'identity',
		identityLabel1: 'partner/identity to be shared',
		identityLabel2: 'identity to be shared',
		identityLabel3: 'partner to be shared',
		identityPlaceholder: 'select an identity',
		includeContact: 'include contact details',
		includeLabel: 'select optional information to share',
		includeLocation: 'include location',
		introducedByLabel: 'introduced by',
		includeRegNumber: 'include registered number',
		includeVATNumber: 'include VAT number',
		nameLabel: 'change partner name (this will be seen by recipients)',
		namePlaceholder: 'enter a name to be shared',
		partner: 'partner',
		partners: 'partners',
		successMsgContent: 'identity has been sent to selected users',
		successMsgHeader: 'identity sent!',
		updateContact: 'update contact details',
		updateLocation: 'update location',
		userIdsLabel: 'recipients',
		userIdsNoResultMsg: 'type user ID and press enter to add',
		userIdsPlaceholder: 'enter user IDs',
	},
	true
)[1]

export const inputNames = {
	address: 'address',
	include: 'include',
	introducedBy: 'introducedBy',
	name: 'name',
	userIds: 'userIds',
}

export default class IdentityShareForm extends Component {
	constructor(props) {
		super(props)

		this.values = props.values || {}
		this.state = {
			header: textsCap.formHeader1,
			message: {},
			onChange: this.handleFormChange,
			onSubmit: this.handleSubmit,
			success: false,
			inputs: [
				{
					label: textsCap.identityLabel1,
					name: inputNames.address,
					onChange: this.handleAddressChange,
					placeholder: textsCap.identityPlaceholder,
					required: true,
					rxValue: new BehaviorSubject(),
					search: ['name', 'value'],
					selection: true,
					type: 'dropdown',
				},
				{
					label: textsCap.nameLabel,
					maxLength: 64,
					minLength: 3,
					name: inputNames.name,
					placeholder: textsCap.namePlaceholder,
					required: false,
					type: 'text',
				},
				{
					hidden: true,
					label: textsCap.includeLabel,
					// inline: true,
					name: inputNames.include,
					multiple: true,
					options: [],
					type: 'checkbox-group',
					toggle: true,
					value: false,
				},
				{
					includePartners: true,
					label: textsCap.userIdsLabel,
					name: inputNames.userIds,
					multiple: true,
					noResultsMessage: textsCap.userIdsLabel,
					placeholder: textsCap.userIdsPlaceholder,
					required: true,
					type: 'UserIdInput',
				},
				{
					hidden: true,
					label: textsCap.introducedByLabel,
					multiple: false,
					name: inputNames.introducedBy,
					readOnly: true,
					type: 'UserIdInput',
				},
			],
		}
	}

	componentWillMount() {
		// prefill and disable fields
		const { includePartners, includeOwnIdentities, values } = this.props

		values.userIds = values.userIds || []
		if (isStr(values.userIds)) values.userIds = values.userIds.split(',')

		const address = values[inputNames.address]
		const userIds = values[inputNames.userIds]
		const { inputs } = this.state
		const identityIn = findInput(inputs, inputNames.address)
		// add identity options
		identityIn.options = []

		const getIdentityOption = ({ address, name }) => ({
			key: address,
			name, // keep
			text: name,
			value: address,
			text: (
				<span style={{ paddingLeft: 25 }}>
					<Button {...{
						compact: true,
						icon: 'pencil',
						onClick: e => {
							e.preventDefault()
							e.stopPropagation()
							showForm(IdentityForm, {
								autoSave: true,
								// onChange: deferred(e => {
								// 	this.handleAddressChange(e, this.values)
								// }, 100),
								values: {
									[idInputNames.address]: address,
								},
								// repopulate includeInput options
								onClose: () => this.handleAddressChange({}, this.values),
							})
						},
						size: 'mini',
						// style adjustment to make sure height of the dropdown doesn't change because of the button
						style: {
							position: 'absolute',
							margin: '-5px -30px',
						},
					}} />
					{name}
				</span>
			),
		})

		if (includeOwnIdentities) {
			includePartners &&
				identityIn.options.push({
					key: 0,
					style: styles.itemHeader,
					text: textsCap.identities,
					value: '', // keep
				})
			identityIn.options.push(...getIdentities().map(getIdentityOption))
		}
		if (includePartners) {
			includeOwnIdentities &&
				identityIn.options.push({
					key: 0,
					style: styles.itemHeader,
					text: textsCap.partners,
					value: '', // keep
				})
			identityIn.options.push(
				...Array.from(getPartners()).map(([address, { name }]) => ({
					key: address,
					name, // keep
					text: name,
					value: address,
				}))
			)
		}

		let header = textsCap.formHeader1
		if (!includePartners) {
			identityIn.label = textsCap.identityLabel2
			header = textsCap.formHeader2
		} else if (!includeOwnIdentities) {
			identityIn.label = textsCap.identityLabel3
			header = textsCap.formHeader3
		}

		// add User Ids as options if supplied in values
		if (isArr(userIds) && userIds.length > 0) {
			const userIdIn = findInput(inputs, inputNames.userIds)
			userIdIn.options = (userIds || []).map(id => ({
				key: id,
				text: id,
				value: id,
			}))
		}

		// prefill values
		fillValues(inputs, values)

		// show introducedBy only if value exists
		findInput(inputs, inputNames.introducedBy).hidden =
			!values[inputNames.introducedBy]
		this.setState({ header, inputs })

		if (!address) return
		// hide name input if public company is being shared
		identityIn.loading = true
		client.company(address, null, (_, company) => {
			identityIn.loading = false
			if (isObj(company)) findInput(inputs, inputNames.name).hidden = true
			this.setState({ inputs })
		})
	}

	handleAddressChange = (_, values) => {
		const { inputs } = this.state
		const address = values[inputNames.address]
		const identity = findIdentity(address) || {}
		const { contactId, locationId, registeredNumber, vatNumber } = identity

		// show/hide location share option
		const includeIn = findInput(inputs, inputNames.include)
		const getOption = (value, label, Form, formProps, btnTitle) => ({
			label: !Form
				? label
				: (
					<div style={{ marginTop: -5 }}>
						{label + ' '}
						<Button {...{
							icon: 'pencil',
							onClick: e => {
								e.stopPropagation()
								e.preventDefault()
								showForm(Form, formProps)
							},
							size: 'mini',
							title: btnTitle,
						}} />
					</div>
				),
			value,
		})
		includeIn.options = [
			locationId && getOption(
				idInputNames.locationId,
				textsCap.includeLocation,
				LocationForm,
				{
					autoSave: true,
					id: locationId,
					// disable remove button prevent location being deleted from here
					inputsHidden: [locFormInputNames.removeBtn],
				},
				textsCap.updateLocation
			),
			contactId && getOption(
				idInputNames.contactId,
				textsCap.includeContact,
				ContactForm,
				{
					autoSave: true,
					// disable remove button prevent location being deleted from here
					inputsHidden: [contactcInputNames.removeBtn],
					values: {
						[contactcInputNames.id]: contactId,
					},
				},
				textsCap.updateContact
			),
			registeredNumber && getOption(
				idInputNames.registeredNumber,
				`${textsCap.includeRegNumber}: "${registeredNumber}"`
			),
			vatNumber && getOption(
				idInputNames.vatNumber,
				`${textsCap.includeVATNumber}: "${vatNumber}"`
			),
		].filter(Boolean)
		includeIn.hidden = includeIn.options.length === 0

		this.setState({ inputs })
	}

	handleFormChange = (_, values) => this.values = values

	handleSubmit = (e, values) => {
		const { onSubmit } = this.props
		const { inputs } = this.state
		const addressIn = findInput(inputs, inputNames.address)
		const address = values[inputNames.address]
		const identity = findIdentity(address)
		const sharePartner = !identity
		const includeArr = values[inputNames.include] || []
		const name =
			values[inputNames.name] ||
			addressIn.options.find(x => x.value === address).name
		const userIds = values[inputNames.userIds]
		const data = {
			address,
			contactDetails: includeArr.includes(idInputNames.contactId)
				? getContact(identity[idInputNames.contactId])
				: undefined,
			location: includeArr.includes(idInputNames.locationId)
				? getLocation(identity[idInputNames.locationId])
				: undefined,
			name,
			registeredNumber: includeArr.includes(idInputNames.registeredNumber)
				? identity[idInputNames.registeredNumber]
				: undefined,
			vatNumber: includeArr.includes(idInputNames.vatNumber)
				? identity[idInputNames.vatNumber]
				: undefined,
		}

		this.setState({ loading: true })
		const callback = err => {
			const success = !err
			const message = {
				content: textsCap.successMsgContent,
				header: textsCap.successMsgHeader,
				icon: true,
				status: 'success',
			}
			this.setState({
				loading: false,
				message: success
					? message
					: {
							header: textsCap.failedMsgHeader,
							content: err,
							icon: true,
							status: 'error',
					  },
				success,
			})
			isFn(onSubmit) && onSubmit(success, values)
		}
		addToQueue({
			type: QUEUE_TYPES.CHATCLIENT,
			func: 'notify',
			title: sharePartner ? textsCap.formHeader3 : textsCap.formHeader2,
			description:
				`${sharePartner ? textsCap.partner : textsCap.identity}: ${
					data.name
				}` +
				'\n' +
				`${textsCap.userIdsLabel}: ${userIds.join()}`,
			args: [userIds, notificationType, childType, null, data, callback],
		})
	}

	render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}

IdentityShareForm.propTypes = {
	// determines whether to include partner list as well as user owned identities
	includePartners: PropTypes.bool,
	includeOwnIdentities: PropTypes.bool,
	values: PropTypes.shape({
		[inputNames.address]: PropTypes.string,
		[inputNames.include]: PropTypes.array,
		[inputNames.introducedBy]: PropTypes.string,
		[inputNames.name]: PropTypes.string,
		[inputNames.userIds]: PropTypes.oneOfType([
			PropTypes.array,
			PropTypes.string,
		]),
	}),
}
IdentityShareForm.defaultProps = {
	includePartners: false,
	includeOwnIdentities: true,
	size: 'tiny',
	subheader: textsCap.formSubheader,
}

const styles = {
	itemHeader: {
		background: 'grey',
		color: 'white',
		fontWeight: 'bold',
		fontSize: '1em',
	},
}
