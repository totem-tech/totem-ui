import React, { Component } from 'react'
import { arrSort, generateHash } from '../utils/utils'
import FormBuilder, { findInput } from '../components/FormBuilder'
import client from '../services/chatClient'
import { limit, setLimit } from '../services/history'
import { getSelected, getTexts, languages, setSelected, setTexts, translated } from '../services/language'
import storage from '../services/storage'

const [words, wordsCap] = translated({
    unlimited: 'unlimited',
    saved: 'saved',
}, true)
const [texts] = translated({
    gsCurrencyLabel: 'Default Currency',
    gsLanguageLabel: 'Default Language (experimental)',
    historyLimitLabel: 'History Limit',
    notImplemented: 'Not implemented',
})
const moduleKey = 'setttings'
export default class SettingsView extends Component {
    render = () => <GlobalSettings />
}

const forceRefreshPage = () => window.location.reload(true)
const savedMsg = { content: wordsCap.saved, status: 'success' }
const notImplementedMsg = { content: texts.notImplemented, status: 'warning' }
class GlobalSettings extends Component {
    constructor(props) {
        super(props)
        // supported languages || ToDo: use API to retrieve from server
        this.currencies = {
            Transactions: 'Totem Blockchain',
            USD: 'United States Dollar',
            EUR: 'Euro',
            AUD: 'Australian Dollar'
        }
        this.timeoutIds = {}

        this.state = {
            submitText: null,
            inputs: [
                {
                    label: texts.gsLanguageLabel,
                    name: 'languageCode',
                    onChange: this.handleLanguageChange,
                    options: arrSort(
                        Object.keys(languages).sort().map(code => ({
                            key: code,
                            text: languages[code],
                            value: code,
                        })),
                        'text',
                    ),
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: getSelected(),
                },
                {
                    label: texts.gsCurrencyLabel,
                    name: 'currency',
                    onChange: this.handleCurrencyChange,
                    options: arrSort(
                        Object.keys(this.currencies).map(value => ({
                            description: this.currencies[value],
                            key: value,
                            text: value,
                            value
                        })),
                        'text',
                    ),
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: storage.settings.global(moduleKey).currency || Object.keys(this.currencies)[0]
                },
                {
                    label: texts.historyLimitLabel,
                    name: 'historyLimit',
                    onChange: this.handleHistoryLimitChange,
                    options: [wordsCap.unlimited, 0, 5, 100, 500, 1000].map((limit, i) => ({
                        key: i,
                        text: limit,
                        value: limit,
                    })),
                    selection: true,
                    type: 'dropdown',
                    value: limit,
                }
            ]
        }
    }

    handleCurrencyChange = (_, { currency }) => {
        const doSave = Object.keys(this.currencies)[0] === currency
        doSave && storage.settings.global(moduleKey, { currency })
        this.setInputMessage('currency', doSave ? savedMsg : notImplementedMsg)
    }

    handleLanguageChange = (_, { languageCode }) => {
        setSelected(languageCode)
        this.setInputMessage('languageCode', savedMsg, false)
        const selected = getSelected()
        if (selected === 'EN') return forceRefreshPage()
        const selectedHash = generateHash(getTexts(selected) || '')
        client.translations(selected, selectedHash, (err, texts) => {
            if (texts !== null) setTexts(selected, texts)
            // reload page
            forceRefreshPage()
        })
    }

    handleHistoryLimitChange = (_, { historyLimit }) => {
        setLimit(historyLimit === wordsCap.unlimited ? null : historyLimit)
        this.setInputMessage('historyLimit', savedMsg)
    }

    setInputMessage = (inputName, message, autoHide = true, delay = 2000) => {
        const { inputs } = this.state
        const input = findInput(inputs, inputName)
        input.message = message
        this.timeoutIds[inputName] && clearTimeout(this.timeoutIds[inputName])
        this.setState({ inputs })
        if (!autoHide) return
        this.timeoutIds[inputName] = setTimeout(() => {
            input.message = null
            this.setState({ inputs })
        }, delay)
    }

    render = () => <FormBuilder {...this.state} />
}