import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
import { downloadFile } from '../utils/utils'
// services
import identities from '../services/identity'
import { translated } from '../services/language'
import { confirm, showForm } from '../services/modal'
import storage, { generateBackupData } from '../services/storage'
import RestoreBackupForm from '../forms/RestoreBackup'

const [texts] = translated({
	backupData: 'Backup data',
	clearCachedData: 'Clear Cached Data',
	confirmBackupContent: `
		You are about to download your Totem application data as a JSON file. 
		The following information will be included: 
	`,
	// keep the commas. they will be used to generate an unordered list
	confirmBackupTypes: 'history, identities, notifications, partners, recent chat messages, settings',
	confirmHeader: 'Are you sure?',
	confirmRestoreContent: `
		You are about to replace application data with the JSON file. 
		This is potentially dangerour and you can loose your identity and other data.
	`,
	forceRefresh: 'Force App Refresh!',
	restoreBackup: 'Restore backup',
})

const forceReloadPage = () => window.location.reload(true)

export default class PageUtilitiesView extends Component {
	render = () => (
		<div>
			<div style={{ paddingBottom: '20px' }}>
				<Button onClick={forceReloadPage} content={texts.forceRefresh} />
				<Button
					onClick={() => confirm({
						onConfirm: () => storage.clearNonEssentialData() | forceReloadPage(),
						size: 'tiny',
					})}
					content={texts.clearCachedData}
				/>
				<Button {... {
					content: texts.backupData,
					positive: true,
					onClick: () => confirm({
						content: (
							<div>
								{texts.confirmBackupContent}
								<ul>
									{texts.confirmBackupTypes.split(',').map((str, i) => <li key={i}>{str}</li>)}
								</ul>
							</div>
						),
						header: texts.confirmHeader,
						size: 'tiny',
						onConfirm: () => {
							const timestamp = new Date().toISOString()
							downloadFile(
								JSON.stringify(generateBackupData()),
								`totem-backup-${timestamp}.json`,
								'application/json'
							)
							identities.getAll().forEach(identity => identities.set(
								identity.address,
								{
									...identity,
									fileBackupTS: timestamp
								}
							))
						},
					})
				}} />
				<Button {...{
					content: texts.restoreBackup,
					negative: true,
					onClick: () => showForm(RestoreBackupForm),
				}} />
			</div>
		</div>
	)
}
