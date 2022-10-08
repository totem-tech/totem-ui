import React from 'react'
import { Button } from 'semantic-ui-react'
// services
import { translated } from '../services/language'
import { confirm } from '../services/modal'
import storage from '../services/storage'

const [texts] = translated({
	clearCachedData: 'Clear Cached Data',
	forceRefresh: 'Force App Refresh!',
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