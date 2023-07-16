import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { Button } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import { showForm, showInfo } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactjs'
import { getAll, rxLocations } from './location'
import LocationForm, { inputNames } from './LocationForm'

const textsCap = {
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
}
translated(textsCap, true)

export default function LocationsList({
	includePartners,
	...props
}) {
	const [data = []] = useRxSubject(
		rxLocations,
		// due to cache being disabled first time may receive undefined.
		(map = getAll()) => Array
			.from(map)
			.map(([id, location]) => {
				const ownLocation = !location[inputNames.partnerIdentity]
				return !includePartners && !ownLocation
					? null
					: { ...location, id, }
			})
			.filter(Boolean)
	)
	const [tableProps] = useState({
		...props,
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
					<Button {...{
						icon: 'pencil',
						onClick: () => showForm(
							LocationForm,
							{ autoSave: true, id }
						),
					}} />
				),
			},
		],
		topLeftMenu: [{
			content: textsCap.add,
			icon: 'plus',
			onClick: () => showForm(LocationForm),
		}],
	})

	return <DataTable {...{ ...tableProps, data }} />
}
LocationsList.propTypes = {
	// whether to include partner locations
	includePartners: PropTypes.bool,
}
LocationsList.defaultProps = {
	emptyMessage: textsCap.emptyMessage,
	includePartners: false,
}
LocationsList.asModal = (
	props = {},
	modalId,
	modalProps = {}
) => showInfo({
	...modalProps,
	content: <LocationsList {...props} />,
	header: textsCap.myLocations,
}, modalId)
