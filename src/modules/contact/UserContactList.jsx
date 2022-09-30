import React from 'react'
import { confirm } from '../../services/modal'
import DataStorage from '../../utils/DataStorage'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactHelper'
import { storage } from '.'
import { ContactList } from './ContactList'

const textsCap = translated({ header: 'my contact details' }, true)[1]

export const UserContactList = props => {
	const [data] = useRxSubject(storage.rxData, map =>
		new DataStorage(null, false, map).search({
			partnerAddress: undefined,
		})
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
