import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
import { forceClearCachedData, forceRefreshPage } from '../utils/utils'
import { translated } from '../services/language'
import { confirm } from '../services/modal'

const [texts] = translated({
	forceRefresh: 'Force App Refresh!',
	clearCachedData: 'Clear Cached Data',
})

class PageUtilitiesView extends Component {
	render = () => (
		<React.Fragment>
			<div style={{ paddingBottom: '20px' }}>
				<Button onClick={forceRefreshPage} content={texts.forceRefresh} />
				<Button
					onClick={() => confirm({ onConfirm: forceClearCachedData, size: 'tiny' })}
					content={texts.clearCachedData}
				/>
			</div>
		</React.Fragment>
	)
}

export default PageUtilitiesView
