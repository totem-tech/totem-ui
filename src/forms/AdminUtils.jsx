import React, { Component } from 'react'
import { Bond } from 'oo7'
import { Progress } from 'semantic-ui-react'
import { csvToMap, csvToArr } from '../utils/convert'
import { keyring } from '../utils/polkadotHelper'
import { downloadFile, objWithoutKeys } from '../utils/utils'
import FormBuilder, { findInput } from '../components/FormBuilder'
// services
import client from '../services/chatClient'
import { downloadWordsListCSV, translated } from '../services/language'
import storage from '../services/storage'

export default class AdminUtils extends Component {
    constructor() {
        super()

        this.countries = Array.from(storage.countries.getAll())

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
                            text: 'Convert translations.tsv to translations.json',
                            value: 'language',
                        },
                        {
                            accept: '.csv',
                            text: 'Convert companies.csv to companies.json',
                            value: 'companies',
                        },
                    ].map(x => ({ ...x, key: x.value })),
                    placeholder: 'Select an action',
                    required: true,
                    selection: true,
                    type: 'dropdown',
                },
                {
                    hidden: ({ action }) => action !== 'companies',
                    label: 'Seed for adress generation',
                    name: 'seed',
                    placeholder: 'Enter a seed (without derivation path) to generate missing addresses',
                    required: true,
                    rows: 1,
                    type: 'textarea',
                    value: '',
                },
                {
                    hidden: ({ action }) => action !== 'companies',
                    integer: true,
                    label: 'Derivation starting number',
                    name: 'seedStartNum',
                    placeholder: 'Enter a seed derivation starting number',
                    required: true,
                    rows: 1,
                    type: 'number',
                    value: '',
                },
                {
                    accept: '*/*',
                    hidden: ({ action }) => !action || action === 'language-download',
                    name: 'file',
                    multiple: false,
                    onChange: this.handleFileChange,
                    type: 'file',
                    useInput: true,
                },
                {
                    bond: new Bond(),
                    hidden: ({ action }) => !action || action === 'language-download',
                    label: 'File contents',
                    name: 'text',
                    required: true,
                    readOnly: true,
                    style: { minHeight: 100 },
                    type: 'textarea',
                    value: '',
                },
            ]
        }
    }

    getCountry = codeOrName => {
        codeOrName = codeOrName.toUpperCase()
        const country = this.countries.find(([code, { name }]) => code === codeOrName || name.toUpperCase() === codeOrName)
        return !!country ? country[0] : ''
    }

    handleSubmit = (e, { action, filename, seed, seedStartNum, text }) => {
        let data, name, type
        switch (action) {
            case 'companies':
                return this.processCompanies(e, { seed, seedStartNum, text })
            case 'language':
                data = Array.from(csvToMap(text, null, '\t'))
                name = 'translations.json'
                break
            case 'language-download':
                return client.errorMessages((_, texts) => {
                    translated(texts || '')
                    downloadWordsListCSV()
                })
            default:
                data = text
                name = filename || `${action}.json`
        }
        type = type || 'application/json'
        downloadFile(JSON.stringify(data), name, type)
    }

    processCompanies = (e, { seed, seedStartNum, text }) => {
        let counter = 0
        let counterAddr = 0
        let updateCount = 0
        let error = false
        const companies = (
            csvToArr(text, null, ',')
                .map((com, i) => [
                    com.address,// || accountFromPhrase(`${seed}/${uuid.v1()}`),
                    {
                        ...objWithoutKeys(com, ['address']),
                        country: this.getCountry(com.country),
                    }
                ])
        )//.slice(0, 100)
        let updateEvery = parseInt(companies.length / 100) || 1
        const message = {
            content: 'Starting conversion...',
            showIcon: true,
            status: 'loading',
        }
        this.setState({ message, submitDisabled: true })

        const process = keyring => companies.forEach(([address], i) => setTimeout(() => {
            if (error || !keyring) return
            const seedFull = `${seed}/1/${++seedStartNum}`
            try {
                if (!address) {
                    const pair = keyring.addFromUri(seedFull)
                    counterAddr++
                    companies[i][0] = pair.address
                }
                counter++

                if (counter % updateEvery === 0) {
                    message.header = `${counter}/${companies.length} companies processed. 
                    ${counterAddr} new address generated`
                    message.content = <Progress percent={counter / companies.length} indicating />
                    this.setState({ message })
                    updateCount++
                }
                if (counter >= companies.length) {
                    console.timeEnd('companies')
                    this.handleSubmit(e, { filename: 'companies.json', text: companies })
                    return this.setState({ message: null, submitDisabled: false })
                }
            } catch (err) {
                error = true
                message.content = 'Address generation failed! Please check if the supplied seed is valid:\n' + seed
                    + '\n\nCurrent seed with derivation path:\n' + seedFull
                    + '\n\n' + err
                message.status = 'error'
                console.timeEnd('companies')
                this.setState({ message, submitDisabled: false })
            }
        }))

        console.time('companies') | process(keyring.keyring)
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
                findInput(this.state.inputs, 'text').bond.changed(le.target.result)
                e.target.value = null
            }
            reader.readAsText(file)
        } catch (err) {
            alert(err)
        }
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}