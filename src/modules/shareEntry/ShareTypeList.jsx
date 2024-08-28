import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { Button } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import { showForm, showInfo } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactjs'
import { getAll, rxShares } from './shares'
import ShareTypeForm, { inputNames } from './ShareTypeForm'

const textsCap = {
	actions: 'actions',
	add: 'add',
	category: 'category',
	delete: 'delete',
	emptyMessage: 'no share type information available. Please add some.',
	price: 'price',
	quantity: 'quantity',
	shareTypes: 'share register',
	subCategory: 'subcategory',
	type: 'type',
	vesting: 'vesting',
	voting: 'voting',
}
translated(textsCap, true)

export default function ShareTypeList({
	includePartners,
	...props
}) {
	const [data = []] = useRxSubject(
		rxShares,
		//due to cache being disabled first time may receive undefined.
		(map = getAll()) => Array
			.from(map)
			.map(([id, share]) => {
				const ownLocation = !share[inputNames.partnerIdentity]
				return !includePartners && !ownLocation
					? null
					: { ...share, id, }
			})
			.filter(Boolean)
	)
	const [tableProps] = useState({
		...props,
		stackable: true,
		columns: [
			{ key: 'sharetype', title: textsCap.sharetype },
			{ key: 'quantity', title: textsCap.quantity },
			{ key: 'category', title: textsCap.category },
			{ key: 'subCategory', title: textsCap.subcategory },
			{ key: 'voting', title: textsCap.voting },
			{ key: 'vesting', title: textsCap.vesting },
			{ key: 'price', textAlign: 'center', title: textsCap.price },
			{
				collapsing: true,
				draggable: false,
				textAlign: 'center',
				title: textsCap.actions,
				content: ({ id }) => (
					<Button {...{
						icon: 'pencil',
						onClick: () => showForm(
							ShareTypeForm,
							{ autoSave: true, id }
						),
					}} />
				),
			},
		],
		topLeftMenu: [{
			content: textsCap.add,
			icon: 'plus',
			onClick: () => showForm(ShareTypeForm),
		}],
	})

	return <DataTable {...{ ...tableProps, data }} />
}
ShareTypeList.propTypes = {
	// whether to include partner locations
	includePartners: PropTypes.bool,
}
ShareTypeList.defaultProps = {
	emptyMessage: textsCap.emptyMessage,
	includePartners: false,
}
ShareTypeList.asModal = (
	props = {},
	modalId,
	modalProps = {}
) => showInfo({
	...modalProps,
	content: <ShareTypeList {...props} />,
	header: textsCap.shareTypes,
}, modalId)
