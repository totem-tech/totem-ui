import React from 'react'
import { Checkbox, Button, Icon } from 'semantic-ui-react'
import { textEllipsis } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import { ButtonGroup, UserID } from '../../components/buttons'
import Tags from '../../components/Tags'
// services
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { useRxSubject } from '../../services/react'
import IdentityRequestForm from '../identity/IdentityRequestForm'
import {
	getAddressName,
	remove,
	rxPartners,
	setPublic,
	types,
	visibilityTypes,
} from './partner'
import CompanyForm from './CompanyForm'
import PartnerForm, { inputNames } from './PartnerForm'

const textsCap = translated(
	{
		add: 'add',
		business: 'business',
		chat: 'chat',
		delete: 'delete',
		edit: 'edit',
		personal: 'personal',
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
	},
	true
)[1]

export default function PartnerList(props = {}) {
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
			} = partner
			partner._address = textEllipsis(address, 15, 3)
			partner._associatedIdentity =
				associatedIdentity && getAddressName(associatedIdentity)
			partner._name = (
				<div style={{ margin: !userId ? 0 : '-10px 0' }}>
					{textEllipsis(name, 25, 3, false)}
					<UserID
						{...{
							address,
							El: 'div',
							style: {
								color: 'grey',
								fontSize: '80%',
								marginTop: -15,
								paddingTop: 15,
							},
							userId,
						}}
					/>
				</div>
			)
			partner._tags = <Tags tags={tags} />
			// makes tags searchable
			partner._tagsStr = tags.join(' ')
			return partner
		})
	)

	return <DataTable {...{ ...props, ...tableProps, data }} />
}

const tableProps = Object.freeze({
	columns: [
		{
			collapsing: true,
			content: p => {
				const { type, visibility } = p
				const isPersonal = type === types.PERSONAL
				const isPublic = visibility === visibilityTypes.PUBLIC
				const icons = {
					business: { name: 'building', title: textsCap.business },
					personal: { name: 'user circle', title: textsCap.personal },
					public: {
						color: 'blue',
						name: 'certificate',
						title: textsCap.public,
					},
				}
				const icon = isPublic
					? icons.public
					: isPersonal
					? icons.personal
					: icons.business
				return (
					<Icon
						{...{
							className: 'no-margin',
							size: 'large',
							...icon,
						}}
					/>
				)
			},
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
			headerProps: { style: { borderLeft: 'none' } },
			key: '_name',
			sortKey: 'name',
			style: { borderLeft: 'none' },
			title: textsCap.partnerName,
		},
		{
			key: '_associatedIdentity',
			title: textsCap.usedBy,
			style: { maxWidth: 200 },
		},
		{
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
		{
			content: getVisibilityContent,
			collapsing: true,
			textAlign: 'center',
			title: textsCap.public,
		},
	],
	defaultSort: 'name',
	emptyMessage: null,
	searchExtraKeys: [
		'address',
		'associatedIdentity',
		'name',
		'visibility',
		'_tagsStr',
		'userId',
	],
	searchable: true,
	topLeftMenu: [
		{
			El: ButtonGroup,
			buttons: [
				{ content: textsCap.add, icon: 'plus' },
				{ content: textsCap.request },
			],
			onAction: (_, addPartner) => {
				const handleSubmit = (ok, partner) => ok && _showForm({
						autoSave: true,
						key: 'saved',
						values: partner,
					}) 
				const _showForm = (props = {}) => showForm(
					addPartner
						? PartnerForm
						: IdentityRequestForm,
					props,
					addPartner ? 'add-partner' : 'request-identity',
				)

				_showForm({
					onSubmit: addPartner
						? handleSubmit
						: undefined
				})
			},
			or: true,
			values: [true, false],
		},
	],
})

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
				onConfirm: () => {
					remove(address)
				},
				size: 'mini',
			}),
			title: textsCap.delete,
		},
	]
		.filter(Boolean)
		.map(props => <Button key={props.title} {...props} />)
}

function getVisibilityContent(partner = {}) {
	const { address, name, visibility } = partner
	const isPublic = visibility === visibilityTypes.PUBLIC
	return (
		<div
			title={
				isPublic
					? textsCap.columnPublicTitle1
					: textsCap.columnPublicTitle2
			}
		>
			<Checkbox
				checked={isPublic}
				toggle
				onChange={(_, { checked }) =>
					checked &&
					showForm(CompanyForm, {
						values: { name, identity: address },
						onSubmit: (e, v, success) =>
							success && setPublic(address),
					})
				}
			/>
		</div>
	)
}
