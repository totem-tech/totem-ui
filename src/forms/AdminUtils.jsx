import React, { Component } from 'react'
import { BehaviorSubject } from 'rxjs'
import { csvToMap } from '../utils/convert'
import storage from '../utils/storageHelper'
import { downloadFile } from '../utils/utils'
import FormBuilder, { findInput } from '../components/FormBuilder'
// services
import client from '../utils/chatClient'
import { downloadTextListCSV, translated } from '../utils/languageHelper'

export default class AdminUtils extends Component {
	constructor() {
		super()

		// this.countries = Array.from(storage.countries.getAll())

		this.state = {
			fileType: '',
			text: '',
			onSubmit: this.handleSubmit,
			submitText: 'Download File',
			inputs: [
				{
					label: 'Action',
					name: 'action',
					onChange: (_, { action }, i) => {
						// set appripriate file type for the selected action
						const { inputs } = this.state
						const { accept } = inputs[i].options.find(x => x.value === action) || {}
						findInput(inputs, 'file').accept = accept
						findInput(inputs, 'text').value = ''
						this.setState({ inputs, text: '' })
					},
					options: [
						{
							text: 'Download a list of all texts for translation',
							value: 'language-download',
						},
						{
							accept: '.tsv',
							text: 'Convert English-Texts.tsv file to translations.json',
							value: 'language',
						},
					].map(x => ({ ...x, key: x.value })),
					placeholder: 'Select an action',
					required: true,
					selection: true,
					type: 'dropdown',
					value: 'language-download',
				},
				{
					accept: '*/*',
					hidden: ({ action }) => !action || action === 'language-download',
					label: 'Upload file',
					name: 'file',
					multiple: false,
					onChange: this.handleFileChange,
					required: true,
					type: 'file',
					useInput: true,
				},
				{
					rxValue: new BehaviorSubject(),
					hidden: ({ action }) => !action || action === 'language-download',
					label: 'File contents',
					name: 'text',
					required: true,
					readOnly: true,
					style: { minHeight: 100 },
					type: 'textarea',
					value: '',
				},
			],
		}
	}

	getCountry = codeOrName => {
		if (!codeOrName) return ''
		let country = storage.countries.get(codeOrName)
		country =
			country ||
			storage.countries.find(
				{
					code: codeOrName,
					code3: codeOrName,
					name: codeOrName,
				},
				true,
				false,
				true
			)
		return (country && country.code) || ''
	}

	handleSubmit = async (_, { action, text }) => {
		switch (action) {
			case 'language': // convert csv to json
				downloadFile(
					JSON.stringify(
						Array.from(
							csvToMap(text, null, '\t')
						)
					),
					'translations.json',
					'application/json',
				)
				break
			case 'language-download':
				const texts = await client.languageErrorMessages()
				translated(texts || '')
				downloadTextListCSV()
		}
		this.setState({
			message: {
				content: 'Read up the howto-language.md file',
				header: 'Not sure what to do next?',
				icon: true,
				status: 'info'
			}
		})
	}

	handleFileChange = (e, { action }) => {
		try {
			const { inputs } = this.state
			const file = e.target.files[0]
			var reader = new FileReader()
			const { accept } = findInput(inputs, 'action').options.find(x => x.value === action) || {}
			if (!file.name.endsWith(accept || '')) {
				e.target.value = null
				alert('File type not acceptable. Select a file with the following extension: ' + accept)
				return
			}
			reader.onload = le => {
				findInput(this.state.inputs, 'text').rxValue.next(le.target.result)
				e.target.value = null
			}
			reader.readAsText(file)
		} catch (err) {
			alert(err)
		}
	}

	render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
