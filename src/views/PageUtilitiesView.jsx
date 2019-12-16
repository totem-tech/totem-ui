import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react';
import { forceRefreshPage } from '../utils/utils'

class PageUtilitiesView extends ReactiveComponent {
	constructor() {
		super()
	}

	render() {
		return (
			<React.Fragment>
				<div style={{paddingBottom: '20px'}}>
					<Button onClick={forceRefreshPage} content="Force App Refresh!" />
				</div>
			</React.Fragment>
		)
	}
}

export default PageUtilitiesView
