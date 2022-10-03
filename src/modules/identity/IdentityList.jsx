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
		const { user: { address: rewardsIdentity = '' } = '' } =
			storage.settings.module('messaging') || {}
		return Array.from(map).map(([_, identityOrg]) => {
			const identity = { ...identityOrg }
			const {
				address,
				fileBackupTS,
				name,
				tags = [],
				usageType,
			} = identity
			const isRewardsIdentity = address === rewardsIdentity
			identity._balance = (
				<Balance {...{ address, lockSeparator: <br /> }} />
			)
			identity._fileBackupTS = format(fileBackupTS) || textsCap.never
			identity._name = (
				<div
					{...{
						key: address,
						title: isRewardsIdentity
							? textsCap.rewardsIdentity
							: '',
					}}
				>
					{isRewardsIdentity && (
						<Icon
							{...{
								name: 'gift',
								style: { color: 'orange' },
							}}
						/>
					)}
					{name}
				</div>
			)
			identity._tagsStr = tags.join(' ') // for tags search
			identity._tags = <Tags key={address} tags={tags} />
			identity._usageType =
				usageType === 'personal' ? textsCap.personal : textsCap.business
			return identity
		})
	})

	return <DataTable {...{ ...props, ...getTableProps(isMobile), data }} />
}

const getActions = ({ address, name }) =>
	[
		{
			icon: 'share',
			onClick: () =>
				showForm(IdentityShareForm, {
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
			onClick: () =>
				showForm(IdentityDetailsForm, { values: { address } }),
			title: textsCap.showDetails,
		},
	].map(props => <Button {...props} key={props.title + props.icon} />)

const getTableProps = isMobile => {
	const vertical = isMobile && window.innerWidth < 415
	return {
		columns: [
			{
				collapsing: true,
				content: p => {
					const isPersonal = p.usageType === USAGE_TYPES.PERSONAL
					const name = isPersonal ? 'user circle' : 'building'
					return (
						<Icon
							{...{ className: 'no-margin', name, size: 'large' }}
						/>
					)
				},
				headerProps: { style: { borderRight: 'none' } },
				style: {
					borderRight: 'none',
					paddingRight: 0,
				},
				textAlign: 'center',
				title: '',
			},
			{
				key: '_name',
				sortKey: 'name',
				style: { minWidth: 150 },
				title: textsCap.name,
			},
			{
				collapsing: true,
				draggable: false,
				key: '_balance',
				sortable: false,
				textAlign: 'right',
				title: textsCap.txAllocations,
			},
			{
				key: '_tags',
				draggable: false, // individual tags are draggable
				sortKey: 'tags',
				title: textsCap.tags,
			},
			{
				key: '_fileBackupTS',
				textAlign: 'center',
				title: textsCap.lastBackup,
			},
			{ collapsing: true, key: '_usageType', title: textsCap.usage },
			{
				content: getActions,
				collapsing: true,
				draggable: false,
				textAlign: 'center',
				title: textsCap.actions,
			},
		],
		emptyMessage: { content: textsCap.emptyMessage },
		searchExtraKeys: ['address', 'name', '_tagsStr'],
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
						content: textsCap.create,
						icon: 'plus',
						onClick: () => showForm(IdentityForm),
					},
					{
						content: textsCap.locations,
						icon: 'building',
						onClick: () => showLocations(),
					},
					{
						content: textsCap.contacts,
						icon: 'building',
						onClick: () => UserContactList.asModal(),
					},
				],
				key: 0,
				vertical,
			},
		],
	}
}
