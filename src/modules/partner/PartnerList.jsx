import React from 'react'
import { Button } from '../../components/buttons'
import { textEllipsis } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import { ButtonGroup, UserID } from '../../components/buttons'
import Tags from '../../components/Tags'
// services
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { useRxSubject } from '../../services/react'
import { MOBILE, rxLayout } from '../../services/window'
import IdentityRequestForm from '../identity/IdentityRequestForm'
import {
	getAddressName,
	remove,
	rxPartners,
	setPublic,
	visibilityTypes,
} from './partner'
import CompanyForm from './CompanyForm'
import PartnerForm, { inputNames } from './PartnerForm'
import PartnerIcon from './PartnerIcon'

let textsCap = {
	add: 'add',
	chat: 'chat',
	delete: 'delete',
	edit: 'edit',
	public: 'public',
	request: 'request',
	tags: 'tags',
	update: 'update',
	usage: 'usage',
	columnPublicTitle1: 'a public company cannot be changed to private.',
	columnPublicTitle2:
		'click to add a company with this identity to the public database',
	partnerName: 'partner name',
	removePartner: 'remove partner',
	usedBy: 'used by',
}
textsCap = translated(textsCap, true)[1]

export default function PartnerList(props = {}) {
	const [tableProps] = useRxSubject(rxLayout, getTableProps)
	const [data] = useRxSubject(rxPartners, map =>
		Array.from(map).map(([_, partnerOrg]) => {
			const partner = { ...partnerOrg } // prevents unwanted data being writen to storage when caching is enabled
			const {
				associatedIdentity,
				address,
				name,
				tags = [],
				type,
				userId,
				visibility,
			} = partner
			const isPublic = visibilityTypes.PUBLIC === visibility
			partner._address = textEllipsis(address, 15, 3)
			partner._associatedIdentity = associatedIdentity && getAddressName(associatedIdentity)
			partner._name = (
				<div style={{ margin: !userId ? 0 : '-10px 0' }}>
					<div {...{
						draggable: true,
						onDragStart: (e) => e.dataTransfer.setData('Text', name),
						style: { display: 'block'}
					}}>
						{textEllipsis(name, 25, 3, false)}
					</div>
					<UserID {...{
						address,
						El: 'div',
						style: { color: 'grey' },
						userId,
					}} />
				</div>
			)
			partner._tags = <Tags tags={tags} />
			// makes tags searchable
			partner._tagsStr = tags.join(' ')
			partner._type = isPublic
				? visibilityTypes.PUBLIC
				: type
			return partner
		})
	)

	return <DataTable {...{ ...props, ...tableProps, data }} />
}

const getTableProps = layout => {
	const isMobile = layout === MOBILE
	return Object.freeze({
		columns: [
			{
				collapsing: true,
				content: ({ address, type, visibility }) => (
					<PartnerIcon {...{
						address,
						draggable: true,
						key: address,
						size: 'large',
						type,
						visibility,
					}} />
				),
				draggable: false,
				headerProps: { style: { borderRight: 'none' } },
				style: {
					borderRight: 'none',
					paddingRight: 0,
				},
				textAlign: 'center',
				title: '',
			},
			{
				draggable: false,
				headerProps: { style: { borderLeft: 'none' } },
				key: '_name',
				sortKey: 'name',
				style: { borderLeft: 'none' },
				title: textsCap.partnerName,
			},
			!isMobile && {
				draggableValueKey: 'associatedIdentity',
				key: '_associatedIdentity',
				title: textsCap.usedBy,
				style: { maxWidth: 200 },
			},
			!isMobile && {
				key: '_tags',
				draggable: false, // individual tags are draggable
				sortKey: 'tags',
				title: textsCap.tags,
			},
			{
				collapsing: true,
				content: getActions,
				draggable: false,
				title: textsCap.edit,
			},
			// !isMobile && {
			// 	content: getVisibilityContent,
			// 	collapsing: true,
			// 	textAlign: 'center',
			// 	title: textsCap.public,
			// },
		].filter(Boolean),
		defaultSort: 'name',
		emptyMessage: null,
		searchExtraKeys: [
			'address',
			'associatedIdentity',
			'name',
			'visibility',
			'userId',
			'_tagsStr',
			'_type',
		],
		searchable: true,
		topLeftMenu: [
			{
				El: ButtonGroup,
				buttons: [
					{
						content: textsCap.add,
						icon: 'plus',
					},
					{ content: textsCap.request },
				],
				onAction: (_, addPartner) => showForm(
					addPartner
						? PartnerForm
						: IdentityRequestForm
				),
				or: true,
				values: [true, false],
			},
		],
	})
}

function getActions(partner = {}) {
	const { address, name } = partner

	return [
		{
			icon: 'pencil',
			onClick: () => showForm(PartnerForm, {
				// auto save updates
				autoSave: true,
				size: 'tiny',
				values: partner,
			}),
			title: textsCap.update,
		},
		{
			icon: 'trash',
			onClick: () => confirm({
				confirmButton: (
					<Button negative content={textsCap.delete} />
				),
				content: (
					<p>
						{textsCap.partnerName}: <b>{name}</b>
					</p>
				),
				header: `${textsCap.removePartner}?`,
				onConfirm: () => remove(address),
				size: 'mini',
			}),
			title: textsCap.delete,
		},
	]
		.filter(Boolean)
		.map(props => <Button key={props.title} {...props} />)
}

// function getVisibilityContent(partner = {}) {
// 	const { address, name, visibility } = partner
// 	const isPublic = visibility === visibilityTypes.PUBLIC
// 	return (
// 		<div
// 			title={
// 				isPublic
// 					? textsCap.columnPublicTitle1
// 					: textsCap.columnPublicTitle2
// 			}
// 		>
// 			<Checkbox
// 				checked={isPublic}
// 				toggle
// 				onChange={(_, { checked }) =>
// 					checked &&
// 					showForm(CompanyForm, {
// 						values: { name, identity: address },
// 						onSubmit: (e, v, success) =>
// 							success && setPublic(address),
// 					})
// 				}
// 			/>
// 		</div>
// 	)
// }
