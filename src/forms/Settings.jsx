import React, { Component } from 'react'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { arrSort, generateHash } from '../utils/utils'
// services
import client, { historyLimit as chatHistoryLimit } from '../services/chatClient'
import { convertTo, currencies, currencyDefault, selected as selectedCurrency } from '../services/currency'
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
})
// read/write to global settings
const rwg = (key, value) => storage.settings.global(key, value)
const forceRefreshPage = () => window.location.reload(true)
const savedMsg = { content: wordsCap.saved, status: 'success' }

export default class Settings extends Component {
    constructor(props) {
        super(props)

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
                        Object.keys(currencies).map(value => ({
                            description: currencies[value],
                            key: value,
                            text: value,
                            value
                        })),
                        'text',
                    ),
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: selectedCurrency()
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

    handleCurrencyChange = async (_, { currency }) => {
        let msg = savedMsg
        try{
            // check if currency conversion is supported
            await convertTo(0, currency, currencyDefault)
            selectedCurrency(currency)
        } catch(e) {
            msg = { content: e, status: 'error'}
        }
        this.setInputMessage('currency', msg, 0)
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
        this.setInputMessage('languageCode', savedMsg, 0)
        const selected = getSelected()
        if (selected === 'EN') return forceRefreshPage()
        const selectedHash = generateHash(getTexts(selected) || '')
        client.translations(selected, selectedHash, (err, texts) => {
            if (texts !== null) setTexts(selected, texts)
            // reload page
            forceRefreshPage()
        })
    }

    setInputMessage = (inputName, message, delay = 2000) => {
        const { inputs } = this.state
        const input = findInput(inputs, inputName)
        input.message = message
        this.timeoutIds[inputName] && clearTimeout(this.timeoutIds[inputName])
        this.setState({ inputs })
        if (delay === 0) return
        this.timeoutIds[inputName] = setTimeout(() => {
            input.message = null
            this.setState({ inputs })
        }, delay)
    }

    render = () => <FormBuilder {...this.state} />
}