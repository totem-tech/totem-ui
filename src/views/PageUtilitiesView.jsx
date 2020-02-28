import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
// services
import { translated } from '../services/language'
import { confirm } from '../services/modal'

const [texts] = translated({
	forceRefresh: 'Force App Refresh!',
	clearCachedData: 'Clear Cached Data',
})

// forceClearCachedData removes any cached data from localStorage
export const forceClearCachedData = () => {
	const keys = ['totem__cache_', 'totem__static']
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
			</div>
		</div>
	)
}
