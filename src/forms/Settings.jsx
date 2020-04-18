import React, { Component } from 'react'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { arrSort, generateHash } from '../utils/utils'
// services
import client, { historyLimit as chatHistoryLimit } from '../services/chatClient'
import { convertTo, currencies, currencyDefault, selected as selectedCurrency } from '../services/currency'
import { limit as historyItemsLimit } from '../services/history'
import { getSelected, getTexts, languages, setSelected, setTexts, translated } from '../services/language'
import { gridColumns } from '../services/window'

const [texts, textsCap] = translated({
    column: 'column',
    columns: 'columns',
    chatLimitLabel: 'chat message limit',
    gridColumnsLabel: 'number of columns on main content (experimental)',
    gsCurrencyLabel: 'default currency',
    gsLanguageLabel: 'default language (experimental)',
    historyLimitLabel: 'history limit',
    unlimited: 'unlimited',
    saved: 'saved',
}, true)
const forceRefreshPage = () => window.location.reload(true)
const savedMsg = { content: textsCap.saved, status: 'success' }

export default class Settings extends Component {
    constructor(props) {
        super(props)

        this.timeoutIds = {}

        this.state = {
            submitText: null,
            inputs: [
                {
                    label: textsCap.gsLanguageLabel,
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
                    label: textsCap.gsCurrencyLabel,
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
                    label: textsCap.historyLimitLabel,
                    name: 'historyLimit',
                    onChange: this.handleHistoryLimitChange,
                    options: [0, 10, 50, 100, 500, 1000].map((limit, i) => ({
                        key: i,
                        text: limit || textsCap.unlimited,
                        value: limit,
                    })),
                    selection: true,
                    type: 'dropdown',
                    value: historyItemsLimit(),
                },
                {
                    label: textsCap.chatLimitLabel,
                    name: 'chatMsgLimit',
                    onChange: this.handleChatLimitChange,
                    options: [0, 10, 50, 100, 500, 1000].map((limit, i) => ({
                        key: i,
                        text: limit || textsCap.unlimited,
                        value: limit,
                    })),
                    selection: true,
                    type: 'dropdown',
                    value: chatHistoryLimit(),
                },
                {
                    label: textsCap.gridColumnsLabel,
                    name: 'gridCols',
                    onChange: this.handleGridCollumnsChange,
                    options: [1, 2, 3, 4].map(n => ({
                        icon: n === 1 ? 'bars' : 'grid layout',
                        key: n,
                        text: `${n} ${ n > 1 ? texts.columns : texts.column }`,
                        value: n,
                    })),
                    selection: true,
                    type: 'dropdown',
                    value: gridColumns(),
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

    handleGridCollumnsChange = (_, {gridCols}) => {
        gridColumns(gridCols)
        this.setInputMessage('gridCols', savedMsg)
    }

    handleHistoryLimitChange = (_, { historyLimit: limit }) => {
        historyItemsLimit(limit === textsCap.unlimited ? null : limit, true)
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