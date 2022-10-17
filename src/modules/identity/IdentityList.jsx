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
		const settings = storage.settings.module('messaging') || {}
		const { user: { address: rewardsIdentity = '' } = '' } = settings

		return Array.from(map).map(([_, identityOrg]) => {
			const identity = { ...identityOrg }
			const { address, fileBackupTS, tags = [], usageType } = identity
			const isPersonal = usageType === USAGE_TYPES.PERSONAL
			identity._isReward = address === rewardsIdentity
			identity._balance = (
				<Balance {...{ address, lockSeparator: <br />, showDetailed: true }} />
			)
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
					let icon
					const ut = p._isReward ? USAGE_TYPES.REWARD : p.usageType
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
				key: 'name',
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
			{
				content: getActions,
				collapsing: true,
				draggable: false,
				textAlign: 'center',
				title: textsCap.actions,
			},
		],
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
						icon: 'text telephone',
						onClick: () => UserContactList.asModal(),
					},
				],
				key: 0,
				vertical,
			},
		],
	}
}
