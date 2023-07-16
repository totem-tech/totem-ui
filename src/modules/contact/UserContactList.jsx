import React from 'react'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactjs'
import { showInfo } from '../../services/modal'
import { getAll, rxContacts } from './contact'
import { ContactList } from './ContactList'

const textsCap = translated({ header: 'my contact details' }, true)[1]

export const UserContactList = props => {
	const [data] = useRxSubject(
		rxContacts,
		(map = getAll()) => new Map(
			Array
				.from(map)
				.filter(([_, c]) =>
					!c.partnerIdentity
				)
		)
	)
	return <ContactList {...{ ...props, data }} />
}
UserContactList.asModal = (
	props = {},
	modalId,
	modalProps = {}
) => showInfo({
	...modalProps,
	content: <UserContactList {...props} />,
	header: textsCap.header,
}, modalId)
export default UserContactList
