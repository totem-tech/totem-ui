import React, { useState } from 'react'
import PropTypes from 'prop-types'
import DataTable from '../../components/DataTable'
import { confirm, showForm } from '../../services/modal'
import DataStorage from '../../utils/DataStorage'
import { translated } from '../../utils/languageHelper'
import ContactDetailsForm from './ContactForm'
import { useRxSubject } from '../../utils/reactHelper'
import { storage } from '.'
import { Button } from 'semantic-ui-react'

const textsCap = translated(
	{
		action: 'action',
		add: 'add',
		email: 'email',
		id: 'ID',
		name: 'name',
		phone: 'phone',
		update: 'update',
	},
	true
)[1]

export const ContactList = props => {
	const [tableProps] = useState(() => ({
		columns: [
			{
				collapsing: true,
				key: 'id',
				textAlign: 'center',
				title: textsCap.id,
			},
			{ key: 'name', title: textsCap.name },
			{ key: 'email', textAlign: 'center', title: textsCap.email },
			{
				content: x => `${x.phoneCode || ''}${x.phoneNumber || ''}`,
				key: 'phone',
				textAlign: 'center',
				title: textsCap.phone,
			},

			{
				collapsing: true,
				content: entry =>
					[
						{
							icon: 'pencil',
							onClick: () =>
								showForm(ContactDetailsForm, { values: entry }),
							title: textsCap.update,
						},
					].map((props, i) => <Button {...props} key={i} />),
				textAlign: 'center',
				title: textsCap.action,
			},
		],
	}))

	return (
		<DataTable
			{...{
				...props,
				...tableProps,
				topLeftMenu: [
					{
						content: textsCap.add,
						icon: 'plus',
						onClick: () => showForm(ContactDetailsForm),
					},
				],
			}}
		/>
	)
}
ContactList.propTypes = {}
ContactList.defaultProps = {}

// export const UserContactList = props => {
// 	const [data] = useRxSubject(storage.rxData, map => {
// 		const result = new DataStorage(null, false, map).search({
// 			partnerAddress: undefined,
// 		})
// 		return result
// 	})
// 	return <ContactList {...{ ...props, data }} />
// }
// UserContactList.asModal = (...args) => {
// 	confirm({
// 		content: <UserContactList />,
// 		confirmButton: null,
// 		cancelButton: null,
// 		...args,
// 	})
// }
// // UserContactList.asModal()
