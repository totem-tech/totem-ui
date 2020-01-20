import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react';
import { forceClearCachedData, forceRefreshPage } from '../utils/utils'
import { confirm } from '../services/modal'

class PageUtilitiesView extends ReactiveComponent {
	constructor() {
		super()
	}

	render() {
		return (
			<React.Fragment>
				<div style={{ paddingBottom: '20px' }}>
					<Button onClick={forceRefreshPage} content="Force App Refresh!" />
					<Button
						onClick={() => confirm({ onConfirm: forceClearCachedData, size: 'tiny' })}
						content="Clear Cached Data"
					/>
				</div>
			</React.Fragment>
		)
	}
}

export default PageUtilitiesView
