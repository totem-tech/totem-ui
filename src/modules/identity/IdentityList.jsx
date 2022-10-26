import React from 'react'
import { Button, Icon } from 'semantic-ui-react'
import { format } from '../../utils/time'
// components
import { ButtonGroup } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import Tags from '../../components/Tags'
// services
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { useRxSubject } from '../../services/react'
// modules
import { showLocations } from '../location/LocationsList'
import { rxIdentities, USAGE_TYPES } from './identity'
import IdentityDetailsForm from './IdentityDetailsForm'
import IdentityForm from './IdentityForm'
import IdentityShareForm from './IdentityShareForm'
import Balance from './Balance'
import storage from '../../utils/storageHelper'
import { UserContactList } from '../contact/UserContactList'
import { MOBILE, rxLayout } from '../../services/window'

const textsCap = translated(
	{
		actions: 'actions',
		balance: 'balance',
		business: 'business',
		contacts: 'contacts',
		create: 'create',
		locations: 'locations',
		name: 'name',
		never: 'never',
		personal: 'personal',
		tags: 'tags',
		usage: 'usage',
		rewardsIdentity: 'this is your rewards identity',
		emptyMessage: 'no matching identity found', // assumes there will always be an itentity
		lastBackup: 'last backup',
		showDetails: 'show details',
		shareIdentityDetails: 'share your identity with other Totem users',
		txAllocations: 'transaction balance',
		updateIdentity: 'update your identity',
	},
	true
)[1]

export default function IdentityList(props) {
	const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
	const [data] = useRxSubject(rxIdentities, map => {
		const settings = storage.settings.module('messaging') || {}
		const { user: { address: rewardsIdentity = '' } = '' } = settings

		return Array.from(map).map(([_, identityOrg]) => {
			const identity = { ...identityOrg }
			const { address, fileBackupTS, tags = [], usageType } = identity
			const isPersonal = usageType === USAGE_TYPES.PERSONAL
			identity._isReward = address === rewardsIdentity
			identity._fileBackupTS = format(fileBackupTS) || textsCap.never
			identity._tagsStr = tags.join(' ') // for tags search
			identity._tags = <Tags key={address} tags={tags} />
			return identity
		})
	})

	return <DataTable {...{ ...props, ...getTableProps(isMobile), data }} />
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
		return <El {...{ ...props, style: {paddingTop: 5 }}} />
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
			lockSeparator: <br />,
			showDetailed: true,
			style: isMobile ? undefined : {
				alignItems: 'center',
				display: 'flex',
				justifyContent: 'center',
				minHeight: 40,
				textAlign: 'center',
			}
		}} />
	)
	return {
		columns: [
			{
				collapsing: true,
				content: p => {
					let icon
					const ut = p._isReward
						? USAGE_TYPES.REWARD
						: p.usageType
					switch (ut) {
						case USAGE_TYPES.BUSINESS:
							icon = {
								name: 'building',
								title: textsCap.business,
							}
							break
						case USAGE_TYPES.PERSONAL:
							icon = {
								name: 'user circle',
								title: textsCap.personal,
							}
							break
						case USAGE_TYPES.REWARD:
							icon = {
								color: 'orange',
								name: 'gift',
								title: textsCap.rewardsIdentity,
							}
							break
					}

					return (
						<Icon {...{
							className: 'no-margin',
							size: 'large',
							...icon,
						}} />
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
				content: !isMobile 
					? undefined
					: identity => (
						<div>
							<div>{identity.name}</div>
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
		searchExtraKeys: ['address', 'name', '_tagsStr', 'usageType'],
		tableProps: {
			// basic:  'very',
			celled: false,
			compact: true,
		},
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
