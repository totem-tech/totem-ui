import React, { Component } from 'react'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { arrSort, generateHash } from '../utils/utils'
// services
import client, { historyLimit as chatHistoryLimit } from '../services/chatClient'
import { limit as historyItemsLimit } from '../services/history'
import { getSelected, getTexts, languages, setSelected, setTexts, translated } from '../services/language'
import storage from '../services/storage'

const [words, wordsCap] = translated({
    unlimited: 'unlimited',
    saved: 'saved',
}, true)
const [texts] = translated({
    chatLimitLabel: 'Chat message limit',
    gsCurrencyLabel: 'Default currency',
    gsLanguageLabel: 'Default language (experimental)',
    historyLimitLabel: 'History limit',
    notImplemented: 'Not implemented',
})
// read/write to global settings
const rwg = (key, value) => storage.settings.global(key, value)
const forceRefreshPage = () => window.location.reload(true)
const savedMsg = { content: wordsCap.saved, status: 'success' }
const notImplementedMsg = { content: texts.notImplemented, status: 'warning' }

export default class Settings extends Component {
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
                            description: code,
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
                    value: rwg('currency') || Object.keys(this.currencies)[0]
                },
                {
                    label: texts.historyLimitLabel,
                    name: 'historyLimit',
                    onChange: this.handleHistoryLimitChange,
                    options: [0, 10, 50, 100, 500, 1000].map((limit, i) => ({
                        key: i,
                        text: limit || wordsCap.unlimited,
                        value: limit,
                    })),
                    selection: true,
                    type: 'dropdown',
                    value: historyItemsLimit(),
                },
                {
                    label: texts.chatLimitLabel,
                    name: 'chatMsgLimit',
                    onChange: this.handleChatLimitChange,
                    options: [0, 10, 50, 100, 500, 1000].map((limit, i) => ({
                        key: i,
                        text: limit || wordsCap.unlimited,
                        value: limit,
                    })),
                    selection: true,
                    type: 'dropdown',
                    value: chatHistoryLimit(),
                },
            ]
        }
    }

    handleCurrencyChange = (_, { currency }) => {
        const doSave = Object.keys(this.currencies)[0] === currency
        doSave && rwg('currency', currency)
        this.setInputMessage('currency', doSave ? savedMsg : notImplementedMsg)
    }

    handleChatLimitChange = (_, { chatMsgLimit }) => {
        chatHistoryLimit(chatMsgLimit)
        this.setInputMessage('chatMsgLimit', savedMsg)
    }

    handleHistoryLimitChange = (_, { historyLimit: limit }) => {
        historyItemsLimit(limit === wordsCap.unlimited ? null : limit, true)
        this.setInputMessage('historyLimit', savedMsg)
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