import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
import { downloadFile } from '../utils/utils'
// services
import { translated } from '../services/language'
import { confirm } from '../services/modal'

const [texts] = translated({
	backupData: 'Backup data',
	clearCachedData: 'Clear Cached Data',
	confirmBackupContent: 'You are about to download your Totem application data as JSON file. The following information will be backed up: history, identities, partners and settings',
	confirmHeader: 'Are you sure?',
	confirmRestoreContent: 'You are about to replace application data with the JSON file. This is potentially dangerour and you can loose your identity and other data.',
	forceRefresh: 'Force App Refresh!',
	restoreBackup: 'Restore backup',
})

// forceClearCachedData removes any cached data from localStorage
export const forceClearCachedData = () => {
	const keys = ['totem__cache_', 'totem__static', '_translations']
	Object.keys(localStorage).forEach(key => keys.includes(key) && localStorage.removeItem(key))
	forceRefreshPage()
}
// force refresh page from server
const forceRefreshPage = () => window.location.reload(true)

export default class PageUtilitiesView extends Component {
	render = () => (
		<div>
			<div style={{ paddingBottom: '20px' }}>
				<Button onClick={forceRefreshPage} content={texts.forceRefresh} />
				<Button
					onClick={() => confirm({ onConfirm: forceClearCachedData, size: 'tiny' })}
					content={texts.clearCachedData}
				/>
				<Button {... {
					content: texts.backupData,
					positive: true,
					onClick: () => confirm({
						content: texts.confirmBackupContent,
						header: texts.confirmHeader,
						size: 'tiny',
						onConfirm: () => {
							// LocalStorage keys to backup
							// if changed, dont forget to update `texts.confirmBackupContent`
							const backupKeys = [
								'totem_history',
								'totem_identities',
								'totem_partners',
								'secretStore', // ToDo: deprecate by migrating completely to identities
								'totem_settings',
							]
							const keys = Object.keys(localStorage)
								.map(key => !backupKeys.includes(key) ? null : key)
								.filter(Boolean)
								.sort()
							const data = keys.reduce((data, key) => {
								data[key] = JSON.parse(localStorage[key])
								return data
							}, {})
							downloadFile(
								JSON.stringify(data),
								`totem-backup-${new Date().toISOString()}.json`,
								'application/json'
							)
						},
					})
				}} />
				<Button {...{
					content: texts.restoreBackup,
					negative: true,
					onClick: () => alert('To be implemented'),
					// restore to merge only. DO NOT REMOVE new data
					// onClick: () => confirm({
					// content: texts.confirmRestoreContent,
					// header: texts.confirmHeader,
					// size: 'tiny',
					// onConfirm: () => {
					// }
					// })
				}} />
			</div>
		</div>
	)
}
