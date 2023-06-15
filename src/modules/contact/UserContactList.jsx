import React from 'react'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactjs'
import { confirm } from '../../services/modal'
import { rxContacts } from './contact'
import { ContactList } from './ContactList'

const textsCap = translated({ header: 'my contact details' }, true)[1]

export const UserContactList = props => {
	const [data] = useRxSubject(
		rxContacts,
		map => new Map(
			Array.from(map)
				.filter(([_, c]) => !c.partnerIdentity)
		)
	)
	return <ContactList {...{ ...props, data }} />
}
UserContactList.asModal = (...args) => {
	confirm({
		content: <UserContactList />,
		confirmButton: null,
		cancelButton: null,
		header: textsCap.header,
		...args,
	})
}
export default UserContactList
