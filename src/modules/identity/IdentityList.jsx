import React from 'react'
import { Icon } from 'semantic-ui-react'
// components
import { Button, ButtonGroup } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import Tags from '../../components/Tags'
// services
import { showForm } from '../../services/modal'
// utils
import storage from '../../utils/storageHelper'
import { format } from '../../utils/time'
import { useRxSubject } from '../../utils/reactjs'
import { translated } from '../../utils/languageHelper'
import { textEllipsis } from '../../utils/utils'
import { MOBILE, rxLayout } from '../../utils/window'
// modules
import UserContactList from '../contact/UserContactList'
import { showLocations } from '../location/LocationsList'
import Balance from './Balance'
import { rxIdentities, USAGE_TYPES } from './identity'
import IdentityDetailsForm from './IdentityDetailsForm'
import IdentityForm from './IdentityForm'
import IdentityIcon from './IdentityIcon'
import IdentityShareForm from './IdentityShareForm'

let textsCap = {
	actions: 'actions',
	balance: 'balance',
	contacts: 'contacts',
	create: 'create',
	locations: 'locations',
	name: 'name',
	never: 'never',
	tags: 'tags',
	usage: 'usage',
	emptyMessage: 'no matching identity found', // assumes there will always be an itentity
	lastBackup: 'last backup',
	showDetails: 'show details',
	shareIdentityDetails: 'share your identity with other Totem users',
	txAllocations: 'transaction balance',
	updateIdentity: 'update your identity',
}
textsCap = translated(textsCap, true)[1]

export default function IdentityList(props) {
	const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
	const [data] = useRxSubject(rxIdentities, map => {
		const settings = storage
			.settings
			.module('messaging') || {}
		const {
			user: {
				address: rewardsIdentity = '',
			} = '',
		} = settings

		return Array
			.from(map)
			.map(([_, identityOrg]) => {
				const identity = { ...identityOrg }
				const {
					address,
					fileBackupTS,
					tags = [],
					usageType,
				} = identity
				const isReward = address === rewardsIdentity
				identity._fileBackupTS = format(fileBackupTS) || textsCap.never
				identity._tagsStr = tags.join(' ') // for tags search
				identity._tags = <Tags key={address} tags={tags} />
				identity._searchType = isReward
					? USAGE_TYPES.REWARD
					: usageType
				return identity
			})
	})

	return (
		<DataTable {...{
			...props,
			...getTableProps(isMobile),
			data,
		}} />
	)
}

const getActions = ({ address, name }) =>
	[
		{
			icon: 'share',
			onClick: () => showForm(IdentityShareForm, {
				// inputsDisabled: ['address'],
				includeOwnIdentities: true,
				includePartners: false,
				size: 'tiny',
				values: { address, name },
			}),
			title: textsCap.shareIdentityDetails,
		},
		{
			icon: 'pencil',
			onClick: () => showForm(IdentityDetailsForm, { values: { address } }),
			title: textsCap.showDetails,
		},
	].map(props => <Button {...props} key={props.title + props.icon} />)

const getTableProps = isMobile => {
	const BtnText = (props) => {
		const El = isMobile && window.outerWidth <= 400 ? 'div' : 'span'
		return <El {...{ ...props, style: { paddingTop: 5 } }} />
	}
	const getIcon = name => (
		<Icon {...{
			className: isMobile && 'no-margin' || '',
			name,
		}} />
	)
	const getBalance = ({ address }) => (
		<Balance {...{
			address,
			EL: 'div',
			key: address,
			lockSeparator: <br />,
			style: isMobile
				? undefined
				: {
					alignItems: 'center',
					display: 'flex',
					justifyContent: 'center',
					// minHeight: 40,
					textAlign: 'center',
				}
		}} />
	)
	return {
		columns: [
			{
				collapsing: true,
				content: ({ address, usageType }) => (
					<IdentityIcon {...{
						address,
						key: address,
						draggable: true,
						size: 'large',
						usageType,
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
				content: !isMobile
					? undefined
					: identity => (
						<div>
							<div>{textEllipsis(identity.name, 28, 3, false)}</div>
							{getBalance(identity)}
						</div>
					),
				headerProps: { style: { borderLeft: 'none' } },
				key: 'name',
				style: {
					// maxWidth: isMobile ? 120 : undefined,
					minWidth: 150, //isMobile ? 150 : 120,
					overflowX: 'hidden'
				},
				title: textsCap.name,
			},
			!isMobile && {
				content: getBalance,
				// collapsing: true,
				draggable: false,
				sortable: false,
				textAlign: 'right',
				title: isMobile
					? textsCap.balance
					: textsCap.txAllocations,
			},
			!isMobile && {
				key: '_tags',
				draggable: false, // individual tags are draggable
				sortKey: 'tags',
				title: textsCap.tags,
			},
			!isMobile && {
				key: '_fileBackupTS',
				textAlign: 'center',
				title: textsCap.lastBackup,
			},
			{
				content: getActions,
				collapsing: true,
				draggable: false,
				textAlign: 'center',
				title: textsCap.actions,
			},
		].filter(Boolean),
		defaultSort: 'name',
		emptyMessage: { content: textsCap.emptyMessage },
		searchExtraKeys: [
			'address',
			'name',
			'_tagsStr',
			'usageType',
		],
		// tableProps: {
		// 	celled: false,
		// 	compact: true,
		// },
		topLeftMenu: [
			{
				El: ButtonGroup,
				buttons: [
					{
						content: <BtnText>{textsCap.create}</BtnText>,
						icon: getIcon('plus'),
						onClick: () => showForm(IdentityForm),
					},
					{
						content: <BtnText>{textsCap.locations}</BtnText>,
						icon: getIcon('building'),
						onClick: () => showLocations(),
					},
					{
						content: <BtnText>{textsCap.contacts}</BtnText>,
						icon: getIcon('text telephone'),
						onClick: () => UserContactList.asModal(),
					},
				],
				key: 0,
			},
		],
	}
}
