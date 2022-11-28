import React from 'react'
import { ButtonAcceptOrReject, UserID } from '../../components/buttons'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { hasValue, isObj } from '../../utils/utils'
import {
	get as getContact,
	newId as newContactId,
	set as saveContact,
	remove as removeContact,
} from '../contact/contact'
import { inputNames as contactInputNames } from '../contact/ContactForm'
import {
	search as searchLocation,
	newId as newLocationId,
	remove as removeLocation,
	set as saveLocation,
} from '../location/location'
import { inputNames as locInputNames } from '../location/LocationForm'
import {
	remove,
	rxVisible,
	setItemViewHandler,
} from '../notification/notification'
import AddressName from './AddressName'
import { get } from './partner'
import PartnerForm from './PartnerForm'

let textsCap = {
	addPartner: 'add partner',
	ignore: 'ignore',
	identityShareMsg: 'shared an identity',
	introducedBy: 'introduced by',
	partnerName: 'partner name',
	updatePartner: 'update partner',
	unexpectedError: 'unexpected error occurred!',
}
textsCap = translated(textsCap, true)[1]

// identity received from other user
const handleIdentityReceived = (
	id,
	notification,
	{ senderId, senderIdBtn }
) => {
	const { data, message } = notification
	const {
		address,
		contactDetails,
		introducedBy,
		location,
		name: newName,
	} = data || {}
	const partner = get(address)
	const onAction = (_, accepted) => {
		try {
			if (!accepted) return remove(id)

			const [
				locationId = newLocationId(address),
				existingLocation,
			] = searchLocation(
				{ [locInputNames.partnerIdentity]: address },
				true,
				true,
				false,
				1,
			)[0] || []
			const hasLocation = isObj(location) && hasValue(location)
			const hasContact = isObj(contactDetails) && hasValue(contactDetails)
			const contactId = newContactId(address)
			contactDetails[contactInputNames.id] = contactId
			const existingContact = getContact(contactId)
			let partnerSaved = false
			// remove the location if partner wasn't added
			const handleOnClose = () => {
				if (partnerSaved) return
				// partner wasn't saved/updated but location already exists -> restore to location to original values
				existingLocation
					? saveLocation(existingLocation, locationId, true)
					: removeLocation(locationId)

				existingContact
					? saveContact(contactDetails, true, true)
					: removeContact(contactId)
			}
			if (hasLocation) {
				saveLocation(
					{
						...existingLocation,
						...location,
						[locInputNames.partnerIdentity]: address,
					},
					locationId,
				)
			}
			if (hasContact) {
				saveContact(
					{
						...existingContact,
						...contactDetails,
						[contactInputNames.partnerIdentity]: address,
					},
					true,
					true,
				)
			}

			showForm(PartnerForm, {
				// prevent saving changes unless user clicks on the submit button
				autoSave: false,
				closeOnSubmit: true,
				onClose: handleOnClose,
				values: {
					...partner,
					...data,
					userId: senderId,
				},
				onSubmit: success => {
					// partner wasn't created
					if (!success) return handleOnClose()
					partnerSaved = true
					// remove notification
					remove(id)
					// hide notifications
					rxVisible.next(false)
				},
			})
		} catch (err) {
			confirm({
				header: textsCap.unexpectedError,
				content: `${err}`,
				size: 'tiny',
			})
		}
	}

	return {
		icon: { name: 'user circle outline' },
		content: (
			<div>
				<div>
					<b>
						{senderIdBtn} {textsCap.identityShareMsg.toLowerCase()}
					</b>
				</div>
				{partner && (
					<div style={{ fontSize: '75%' }}>
						<b>{textsCap.partnerName}: </b>
						<AddressName {...{ address }} />
					</div>
				)}
				{introducedBy && (
					<div style={{ fontSize: '75%' }}>
						{textsCap.introducedBy} <UserID userId={introducedBy} />
					</div>
				)}
				<ButtonAcceptOrReject {...{
					acceptColor: 'blue',
					acceptText: partner
						? textsCap.updatePartner
						: textsCap.addPartner,
					onAction,
					rejectText: textsCap.ignore,
				}} />
				<div>{message}</div>
			</div>
		),
	}
}

// register notification view handlers
setTimeout(() =>
	[
		{
			childType: 'share',
			handler: handleIdentityReceived,
			type: 'identity',
		},
	].forEach(x => setItemViewHandler(x.type, x.childType, x.handler))
)
