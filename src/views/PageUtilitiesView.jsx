import React from 'react'
import { Button } from 'semantic-ui-react'
// services
import { translated } from '../services/language'
import { confirm } from '../services/modal'
import storage from '../services/storage'

const [texts] = translated({
	backupData: 'Backup data',
	clearCachedData: 'Clear Cached Data',
	confirmBackupContent: `
		You are about to download your Totem application data as a JSON file. 
		The following information will be included: 
	`,

	forceRefresh: 'Force App Refresh!',
	restoreBackup: 'Restore backup',
})

const forceReloadPage = () => window.location.reload(true)

const PageUtilitiesView = () => (
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
		</div>
	</div>
)
export default PageUtilitiesView