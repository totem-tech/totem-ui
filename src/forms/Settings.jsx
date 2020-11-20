import React, { Component } from 'react'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { arrSort } from '../utils/utils'
// services
import { historyLimit as chatHistoryLimit } from '../modules/chat/chat'
import {
    getCurrencies,
    getSelected as getSelectedCurrency,
    setSelected as setSelectedCurrency
} from '../services/currency'
import { limit as historyItemsLimit } from '../modules/history/history'
import {
    getSelected as getSelectedLanguage,
    languages,
    setSelected as setSelectedLang,
    translated,
} from '../services/language'
import { gridColumns } from '../services/window'

const [texts, textsCap] = translated({
    column: 'column',
    columns: 'columns',
    chatLimitLabel: 'chat message limit per conversation',
    error: 'error',
    gridColumnsLabel: 'number of columns on main content (experimental)',
    gsCurrencyLabel: 'display currency',
    gsLanguageLabel: 'display language (experimental)',
    historyLimitLabel: 'history limit',
    unlimited: 'unlimited',
    saved: 'saved',
    settings: 'settings',
}, true)
const savedMsg = { content: textsCap.saved, status: 'success' }

export default class SettingsForm extends Component {
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
                    search: ['text', 'description'], // sort search results by specific keys
                    // selectOnBlur: false,
                    selectOnNavigation: false,
                    selection: true,
                    type: 'dropdown',
                    value: getSelectedLanguage(),
                },
                {
                    label: textsCap.gsCurrencyLabel,
                    name: 'currency',
                    onChange: this.handleCurrencyChange,
                    options: [],
                    search: ['text', 'description', 'value'],
                    selection: true,
                    type: 'dropdown',
                    value: getSelectedCurrency()
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
                    //0 for unlimited
                    options: [10, 50, 100, 200, 300, 500].map((limit, i) => ({
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
                    options: [1, 2, 3, 4, 5, 6].map(n => ({
                        icon: n === 1 ? 'bars' : 'grid layout',
                        key: n,
                        text: `${n} ${n > 1 ? texts.columns : texts.column}`,
                        value: n,
                    })),
                    selection: true,
                    type: 'dropdown',
                    value: gridColumns(),
                },
            ]
        }

        const { inputs } = this.state
        const currencyIn = findInput(inputs, 'currency')
        getCurrencies().then(currencies => {
            const options = currencies.map(({ currency, nameInLanguage, ISO }) => ({
                description: currency,
                key: ISO,
                text: nameInLanguage,
                value: ISO
            }))
            currencyIn.options = arrSort(options, 'text')
            this.setState({ inputs })
        })

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount = () => this._mounted = true
    componentWillUnmount = () => this._mounted = false

    handleCurrencyChange = async (_, { currency }) => {
        await setSelectedCurrency(currency)
        this.setInputMessage('currency', savedMsg)
    }

    handleChatLimitChange = (_, { chatMsgLimit }) => {
        chatHistoryLimit(chatMsgLimit)
        this.setInputMessage('chatMsgLimit', savedMsg)
    }

    handleGridCollumnsChange = (_, { gridCols }) => {
        gridColumns(gridCols)
        this.setInputMessage('gridCols', savedMsg)
    }

    handleHistoryLimitChange = (_, { historyLimit: limit }) => {
        historyItemsLimit(limit === textsCap.unlimited ? null : limit, true)
        this.setInputMessage('historyLimit', savedMsg)
    }

    handleLanguageChange = (_, { languageCode }) => {
        this.setInputMessage('languageCode', savedMsg, 0)
        setSelectedLang(languageCode).catch(err => {
            this.setInputMessage('languageCode', {
                content: `${err}`,
                header: textsCap.error,
                icon: true,
                status: 'error',
            })
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

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
SettingsForm.defaultProps = {
    header: textsCap.settings,
}