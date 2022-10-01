import React, { useState } from 'react'
import DataTable from '../../components/DataTable'
import { showForm } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import ContactForm from './ContactForm'
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
								showForm(ContactForm, { values: entry }),
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
						// add user contact details
						content: textsCap.add,
						icon: 'plus',
						onClick: () => showForm(ContactForm),
					},
				],
			}}
		/>
	)
}
ContactList.propTypes = {}
ContactList.defaultProps = {}
