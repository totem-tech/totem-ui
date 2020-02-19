import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
import { downloadFile, objWithoutKeys } from '../utils/utils'
import { csvToMap, csvToArr } from '../utils/convert'
import FormInput from '../components/FormInput'
// services
import client from '../services/chatClient'
import { accountFromPhrase } from '../services/identity'
import { buildMode, downloadWordsListCSV, translated } from '../services/language'
import { confirm } from '../services/modal'
import storage from '../services/storage'

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

class PageUtilitiesView extends Component {
	constructor() {
		super()

		this.state = {
			action: '',
			fileType: '',
			seed: '',
			text: '',
		}
	}

	getCountry = codeOrName => {
		codeOrName = codeOrName.toUpperCase()
		const countries = Array.from(storage.countries.getAll())
		const country = countries.find(([code, { name }]) => code === codeOrName || name.toUpperCase() === codeOrName)
		return !!country ? country[0] : ''
	}

	handleDownload = () => {
		const { action, fileType, seed, text } = this.state
		const separator = fileType.includes('text/tab-separated-values') ? '\t' : ','
		let data, name, type
		switch (action) {
			case 'companies':
				data = Array.from(new Map(
					csvToArr(text, null, separator)
						.map((com, i) => [
							com.address || accountFromPhrase(`${seed}/${(com.name + com.registrationNumber)
								.match(/[a-z0-9]+/ig).join('')}`),
							{
								...objWithoutKeys(com, ['address']),
								country: this.getCountry(com.country)
							}
						])
				))
				name = 'companies.json'
				break
			case 'language':
				data = Array.from(csvToMap(text, null, separator))
				name = 'translations.json'
				break
			case 'language-gen':
				return client.errorMessages((_, texts) => {
					translated(texts || '')
					downloadWordsListCSV()
				})
		}
		type = type || 'application/json'
		downloadFile(JSON.stringify(data), name, type)
	}

	handleFileChange = e => {
		const file = e.target.files[0]
		if (!file || !FileReader) return
		var r = new FileReader();
		r.onload = e => {
			var text = e.target.result;
			this.setState({ fileType: file.type, text })
		}
		r.readAsText(file);
	}

	render() {
		const { action, seed, text } = this.state
		return (
			<React.Fragment>
				<div style={{ paddingBottom: '20px' }}>
					<Button onClick={forceRefreshPage} content={texts.forceRefresh} />
					<Button
						onClick={() => confirm({ onConfirm: forceClearCachedData, size: 'tiny' })}
						content={texts.clearCachedData}
					/>
				</div>

				{/* for admin use only. not translated intentionally */}
				{/* {buildMode && (
					<div>
						<Button
							content='Download applications texts as CSV for translation'
							onClick={() => client.errorMessages((_, texts) => translated(texts || []) | downloadWordsListCSV())}
						/>
						<h2>Convert TSV to JSON for use with Totem Messaging Service</h2>
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
									const map = csvToMap(this.state.tsv, null, '\t')
									const content = JSON.stringify(Array.from(map))
									const name = 'translations.json'
									const type = 'application/json'
									downloadFile(content, name, type)
								}}
							/>
						)}
					</div>
				)} */}
				{buildMode && (
					<div>
						<h2>Admin Tools</h2>
						<input {...{
							accept: 'text/csv, text/tsv',
							multiple: false,
							name: 'csv',
							id: 'csvFile',
							onChange: this.handleFileChange,
							style: { ...style, height: 0, position: 'fixed', visibility: 'hidden', width: 0 },
							ref: x => this.fileRef = x,
							type: 'file',
						}} />
						<FormInput {...{
							name: 'action',
							onChange: (_, { value }) => this.setState({ action: value }),
							options: [
								{ key: 0, text: 'Convert translations.tsv file', value: 'language' },
								{ key: 1, text: 'Generate translations.tsv file', value: 'language-gen' },
								{ key: 2, text: 'Generate companies.json file', value: 'companies' },
							],
							placeholder: 'Select an action',
							selection: true,
							style: { ...style, minWidth: 200 },
							type: 'dropdown',
							value: action,
						}} />
						<FormInput {...{
							hidden: action !== 'companies',
							name: 'seed',
							onChange: (_, { value }) => this.setState({ seed: value }),
							placeholder: 'Enter a seed to generate missing addresses',
							style: { ...style, width: 300 },
							type: 'textarea',
						}} />
						<FormInput {...{
							content: 'Select a file',
							hidden: !action || action === 'language-gen',
							name: 'filebtn',
							onClick: () => this.fileRef.click(),
							style,
							type: 'button',
						}} />
						<FormInput {...{
							hidden: !text,
							label: 'File contents',
							name: 'ta',
							style: { ...style, minHeight: 100, width: '100%' },
							type: 'textarea',
							value: text,
						}} />
						<FormInput {...{
							content: 'Download JSON File',
							hidden: !action || (action === 'companies' && !seed),
							name: 'download',
							onClick: this.handleDownload,
							style,
							type: 'button'
						}} />
					</div>
				)}
			</React.Fragment>
		)
	}
}

const style = { margin: '10px 0' }

export default PageUtilitiesView
