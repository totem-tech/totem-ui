import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'semantic-ui-react'
import DataTable from '../../components/DataTable'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { useRxSubject } from '../../services/react'
import { getAll, rxLocations } from './location'
import LocationForm, { inputNames } from './LocationForm'

const textsCap = translated(
	{
		actions: 'actions',
		add: 'add',
		addressLine1: 'address line 1',
		addressLine2: 'address line 2',
		city: 'city',
		country: 'country',
		delete: 'delete',
		emptyMessage: 'no locations available',
		myLocations: 'my locations',
		name: 'name',
		postcode: 'postcode or zip',
		state: 'state or province',
	},
	true
)[1]

export default function LocationsList(props = {}) {
	const [initialValue] = useState(getAll)
	const [locations] = useRxSubject(
		rxLocations,
		map => {
			const locations = Array.from(map).map(([id, location]) => ({
				...location,
				id,
			}))
			if (props.includePartners) return locations
			return locations.filter(loc => !loc[inputNames.partnerIdentity])
		},
		initialValue
	)
	const [listProps] = useState({
		stackable: true,
		columns: [
			{ key: 'name', title: textsCap.name },
			{ key: 'addressLine1', title: textsCap.addressLine1 },
			// { key: 'addressLine2', title: textsCap.addressLine2},
			{ key: 'city', title: textsCap.city },
			{ key: 'postcode', textAlign: 'center', title: textsCap.postcode },
			// { key: 'state', textAlign: 'center', title: textsCap.state},
			// { key: 'countryCode', title: textsCap.country },
			{
				collapsing: true,
				draggable: false,
				textAlign: 'center',
				title: textsCap.actions,
				content: ({ id }) => (
					<Button
						{...{
							icon: 'pencil',
							onClick: () =>
								showForm(LocationForm, { autoSave: true, id }),
						}}
					/>
				),
			},
		],
		topLeftMenu: [
			{
				content: textsCap.add,
				icon: 'plus',
				onClick: () => showForm(LocationForm),
			},
		],
	})

	return <DataTable {...{ ...props, ...listProps, data: locations }} />
}
LocationsList.propTypes = {
	// whether to include partner locations
	includePartners: PropTypes.bool,
}
LocationsList.defaultProps = {
	emptyMessage: textsCap.emptyMessage,
	includePartners: false,
}

export const showLocations = (size, tableProps = {}) =>
	confirm({
		cancelButton: null,
		confirmButton: null,
		content: <LocationsList {...tableProps} />,
		header: textsCap.myLocations,
		size,
	})
