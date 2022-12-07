import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import { showForm } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import ContactForm, { inputNames } from './ContactForm'

let textsCap = {
		action: 'action',
		add: 'add',
		email: 'email',
		id: 'ID',
		name: 'name',
		phone: 'phone',
		update: 'update',
}
textsCap = translated(textsCap, true)[1]

export const ContactList = props => {
	const [tableProps] = useState(() => ({
		columns: [
			// {
			// 	collapsing: true,
			// 	key: 'id',
			// 	textAlign: 'center',
			// 	title: textsCap.id,
			// },
			{ key: 'name', title: textsCap.name },
			{
				content: contact => {
					const email = contact[inputNames.email]
					return (
						email && (
							<a href={`mailto:${email}`} target='_blank'>
								{email}
							</a>
						)
					)
				},
				key: 'email',
				textAlign: 'center',
				title: textsCap.email,
			},
			{
				content: contact => {
					const code = contact[inputNames.phoneCode]
					const number = contact[inputNames.phoneNumber]
					if (!number || !code) return

					return (
						<a
							draggable={false}
							href={`tel:${`${code}${number}`}`}
							target='_blank'
						>
							{`${code} ${number}`}
						</a>
					)
				},
				draggableValueKey: 'phoneNumber',
				key: 'phone',
				textAlign: 'center',
				title: textsCap.phone,
			},

			{
				collapsing: true,
				content: entry => [{
					icon: 'pencil',
					onClick: () => showForm(ContactForm, {
						autoSave: true,
						values: entry,
					}),
					title: textsCap.update,
				}].map((props, i) => <Button {...props} key={i} />),
				draggable: false,
				textAlign: 'center',
				title: textsCap.action,
			},
		],
		searchExtraKeys: ['phoneCode', 'phoneNumber'],
	}))

	return (
		<DataTable {...{
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
		}} />
	)
}
ContactList.propTypes = {
	// contact entries
	data: PropTypes.oneOfType([
		PropTypes.array,
		PropTypes.instanceOf(Map),
	]),
}
ContactList.defaultProps = {}
