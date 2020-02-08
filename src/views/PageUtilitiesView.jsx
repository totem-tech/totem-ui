import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
import { downloadFile, forceClearCachedData, forceRefreshPage } from '../utils/utils'
import FormInput from '../components/FormInput'
import { buildMode, downloadWordsListCSV, translated } from '../services/language'
import { confirm } from '../services/modal'
import { tsvToMap } from '../utils/convert'

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
			{buildMode && (
				<div>
					<Button content='Download applications texts as CSV for translation' onClick={downloadWordsListCSV} />
					<h1>Convert TSV to JSON for use with Totem Messaging Service</h1>
					<FormInput
						placeholder='TSV file string'
						name='tsv'
						onChange={(_, { value }) => this.setState({ tsv: value })}
						style={{ minHeight: 100, width: '100%' }}
						type='textarea'
					/>
					{this.state && (
						<Button
							content='Download JSON'
							disabled={!this.state.tsv}
							onClick={() => {
								const map = tsvToMap(this.state.tsv)
								const content = JSON.stringify(Array.from(map))
								const name = 'translations.json'
								const type = 'application/json'
								downloadFile(content, name, type)
								downloadFile(content, name, type)
							}}
						/>
					)}
				</div>
			)}
		</React.Fragment>
	)
}

export default PageUtilitiesView
