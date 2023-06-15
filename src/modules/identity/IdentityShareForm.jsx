import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Button } from 'semantic-ui-react'
import { iUseReducer } from '../../utils/reactjs'
import { deferred, isBool, isFn, isStr } from '../../utils/utils'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { translated } from '../../utils/languageHelper'
import { showForm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { get as getContact } from '../contact/contact'
import ContactForm, { inputNames as contactInputNames } from '../contact/ContactForm'
import { get as getLocation } from '../location/location'
import LocationForm, { inputNames as locInputNames } from '../location/LocationForm'
import { getIdentityOptions } from './getIdentityOptions'
import { get as getIdentity, rxIdentities } from './identity'
import { inputNames as idInputNames } from './IdentityForm'
import {
	handleSubmitCb,
	reasons,
	inputNames as reqInputNames
} from './IdentityRequestForm'

const notificationType = 'identity'
const childType = 'share'
let textsCap = {
	failedMsgHeader: 'submission failed!',
	formHeader: 'share identity',
	formSubheader: 'share with Totem users',
	identities: 'identities',
	identity: 'identity',
	identityLabel: 'identity to be shared',
	identityPlaceholder: 'select an identity',
	includeContact: 'include contact details',
	includeLabel: 'select optional information to share',
	includeLocation: 'include location',
	introducedByLabel: 'introduced by',
	includeRegNumber: 'include registered number',
	includeVATNumber: 'include VAT number',
	nameLabel: 'change partner name',
	nameLabelDetails: 'this will be seen by recipients',
	namePlaceholder: 'enter a name to be shared',
	// partner: 'partner',
	partners: 'partners',
	requestLabel: 'request identity from selected users',
	successMsgContent: 'identity has been sent to selected users',
	successMsgHeader: 'identity sent!',
	updateContact: 'update contact details',
	updateLocation: 'update location',
	userIdsLabel: 'recipients',
	userIdsNoResultMsg: 'type user ID and press enter to add',
	userIdsPlaceholder: 'enter user IDs',
}
textsCap = translated(textsCap, true)[1]

export const inputNames = {
	address: 'address',
	include: 'include',
	introducedBy: 'introducedBy',
	name: 'name',
	request: 'request',
	userIds: 'userIds',
}

export const IdentityShareForm = props => {
	const [state = {}] = iUseReducer(null, getInitialState(props))

	return <FormBuilder {...{ ...props, ...state }} />
}
IdentityShareForm.propTypes = {
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
	size: 'mini',
	header: textsCap.formHeader,
	subheader: textsCap.formSubheader,
}
export default IdentityShareForm

const getInitialState = props => rxSetState => {
	const { values = {} } = props
	const { request = false } = values
	values.request = isBool(request)
		? request
		: isStr(request) && request.toLowerCase() === 'true'
	const rxAddress = new BehaviorSubject()
	const inputs = [
		{
			label: textsCap.identityLabel,
			name: inputNames.address,
			onChange: handleAddressChange(rxSetState, () => inputs),
			placeholder: textsCap.identityPlaceholder,
			required: true,
			rxOptions: rxIdentities,
			rxOptionsModifier: identities => getIdentityOptions(
				identities,
				{
					// trigger identity change in case identity details is changed.
					// this is requied to makes sure all extra information fields are populated propertly and instantly
					onClose: () => {
						const address = rxAddress.value
						rxAddress.next('')
						setTimeout(() => rxAddress.next(address), 350)
					},
				}
			),
			rxValue: rxAddress,
			search: ['keywords'],
			selection: true,
			type: 'dropdown',
		},
		{
			label: textsCap.nameLabel,
			labelDetails: (
				<span {...{
					children: textsCap.nameLabelDetails,
					style: {
						fontWeight: 'bold',
						fontSize: '105%',
						color: 'deeppink',
					},
				}} />
			),
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
			includeFromChat: true,
			includePartners: true,
			label: textsCap.userIdsLabel,
			name: inputNames.userIds,
			multiple: true,
			noResultsMessage: textsCap.userIdsLabel,
			placeholder: textsCap.userIdsPlaceholder,
			// options: userIdOptions,
			required: true,
			type: 'UserIdInput',
			// value: userIds,
		},
		{
			name: inputNames.request,
			options: [{
				label: textsCap.requestLabel,
				value: true,
			}],
			toggle: true,
			type: 'checkbox-group'
		},
		{
			hidden: true,
			label: textsCap.introducedByLabel,
			multiple: false,
			name: inputNames.introducedBy,
			readOnly: true,
			type: 'UserIdInput',
		},
	]

	const state = {
		message: {},
		// onChange: this.handleFormChange,
		onSubmit: handleSubmit(rxSetState, props),
		success: false,
		inputs: fillValues(
			inputs,
			values,
			false,
			true,
		),
	}

	return state
}

// populate extra information options whenever identity/address changes
const handleAddressChange = (rxSetState, getInputs) => (_, values) => {
	const inputs = getInputs()
	const address = values[inputNames.address]
	const identity = getIdentity(address) || {}
	const {
		contactId,
		locationId,
		registeredNumber,
		vatNumber,
	} = identity

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
		getLocation(locationId) && getOption(
			idInputNames.locationId,
			textsCap.includeLocation,
			LocationForm,
			{
				autoSave: true,
				id: locationId,
				// disable remove button prevent location being deleted from here
				inputsHidden: [locInputNames.removeBtn],
				onClose: () => handleAddressChange(rxSetState, getInputs)(_, values),
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
				inputsHidden: [contactInputNames.removeBtn],
				onClose: () => handleAddressChange(rxSetState, getInputs)(_, values),
				values: {
					[contactInputNames.id]: contactId,
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

	rxSetState.next({ inputs })
}
const handleSubmit = (rxSetState, props = {}) => (_, values) => {
	const { onSubmit } = props
	const address = values[inputNames.address]
	const identity = getIdentity(address)
	const includeArr = values[inputNames.include] || []
	const name = values[inputNames.name] || (identity.name)
	const requestPartner = values[inputNames.request] === true
	const userIds = values[inputNames.userIds]
	const data = { address, name }
	includeArr.forEach(name => {
		const n = idInputNames
		switch (name) {
			case n.contactId:
				data.contactDetails = getContact(identity[n.contactId])
				break
			case n.locationId:
				data.location = getLocation(identity[n.locationId])
				break
			case n.registeredNumber:
				data.registeredNumber = identity[n.registeredNumber]
				break
			case n.vatNumber:
				data.registeredNumber = identity[n.vatNumber]
				break
		}
	})

	rxSetState.next({ loading: true })

	const handleResult = (success, err) => {
		const message = {
			content: textsCap.successMsgContent,
			header: textsCap.successMsgHeader,
			icon: true,
			status: 'success',
		}
		rxSetState.next({
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
	const shareType = textsCap.identity
	const description = [
		`${shareType}: ${data.name}`,
		`${textsCap.userIdsLabel}: ${userIds.join()}`,
	].join('\n')
	const sendIdentity = (send = true) => send && addToQueue({
		args: [
			userIds,
			notificationType,
			childType,
			null,
			data,
		],
		description,
		func: 'notify',
		type: QUEUE_TYPES.CHATCLIENT,
		then: handleResult,
		title: textsCap.formHeader,
	})

	if (!requestPartner) return sendIdentity()

	// send partner request first, then share own identity
	handleSubmitCb({ onSubmit: sendIdentity }, rxSetState)(_, {
		[reqInputNames.userIds]: userIds,
		[reqInputNames.reason]: reasons[1],
	})

}