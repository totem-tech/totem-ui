import React, { Component } from 'react'
// utils
import { arrSort } from '../utils/utils'
// components
import DataTable from '../components/DataTable'
import FormBuilder, { findInput } from '../components/FormBuilder'
// modules
import { historyLimit as chatHistoryLimit } from '../modules/chat/chat'
import {
    getCurrencies,
    getSelected as getSelectedCurrency,
    setSelected as setSelectedCurrency
} from '../modules/currency/currency'
import { limit as historyItemsLimit } from '../modules/history/history'
// services
import {
    getSelected as getSelectedLang,
    languages,
    setSelected as setSelectedLang,
    translated,
} from '../services/language'
import { gridColumns } from '../services/window'
import { confirm } from '../services/modal'

const [texts, textsCap] = translated({
    chatLimitLabel: 'chat message limit per conversation',
    column: 'column',
    columns: 'columns',
    error: 'error',
    gridColumnsLabel: 'number of columns on main content (experimental)',
    gsCurrencyLabel: 'display currency',
    gsLanguageLabel: 'display language (experimental)',
    historyLimitLabel: 'history limit',
    kbShortcuts: 'keyboard shortcuts',
    langConfirmCancelBtn: 'later',
    langConfirmHeader: 'page reload required',
    langConfirmOk: 'reload page',
    saved: 'saved',
    settings: 'settings',
    unlimited: 'unlimited',
}, true)
const savedMsg = { content: textsCap.saved, status: 'success' }

export const inputNames = {
    chatMsgLimit: 'chatMsgLimit',
    currency: 'currency',
    gridCols: 'gridCols',
    historyLimit: 'historyLimit',
    kbShortcutsBtn: 'kbShortcutsBtn',
    languageCode: 'languageCode',
}

export default class SettingsForm extends Component {
    constructor(props) {
        super(props)

        this.timeoutIds = {}

        this.state = {
            submitText: null,
            inputs: [
                {
                    label: textsCap.gsLanguageLabel,
                    name: inputNames.languageCode,
                    onChange: this.handleLanguageChange,
                    options: arrSort(
                        Object.keys(languages).sort()
                            .map(code => ({
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
                    value: getSelectedLang(),
                },
                {
                    label: textsCap.gsCurrencyLabel,
                    name: inputNames.currency,
                    onChange: this.handleCurrencyChange,
                    options: [],
                    search: ['text', 'description'],
                    selection: true,
                    type: 'dropdown',
                    value: getSelectedCurrency()
                },
                {
                    label: textsCap.historyLimitLabel,
                    name: inputNames.historyLimit,
                    onChange: this.handleHistoryLimitChange,
                    options: [0, 10, 50, 100, 500, 1000]
                        .map((limit, i) => ({
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
                    name: inputNames.chatMsgLimit,
                    onChange: this.handleChatLimitChange,
                    //0 for unlimited
                    options: [10, 50, 100, 200, 300, 500]
                        .map((limit, i) => ({
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
                    name: inputNames.gridCols,
                    onChange: this.handleGridCollumnsChange,
                    options: [1, 2, 3, 4, 5, 6]
                        .map(n => ({
                            icon: n === 1 ? 'bars' : 'grid layout',
                            key: n,
                            text: `${n} ${n > 1 ? texts.columns : texts.column}`,
                            value: n,
                        })),
                    selection: true,
                    type: 'dropdown',
                    value: gridColumns(),
                },
                {
                    content: `${textsCap.kbShortcuts} (K)`,
                    icon: 'keyboard',
                    name: inputNames.kbShortcutsBtn,
                    onClick: showKeyboardShortcuts,
                    type: 'button'
                },
            ]
        }

        const { inputs } = this.state
        const currencyIn = findInput(inputs, 'currency')
        getCurrencies().then(currencies => {
            const options = currencies.map(c => ({
                description: c.currency,
                key: c.ticker,
                text: c.name,
                value: c.ticker,
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
        const changed = getSelectedLang() !== languageCode
        setSelectedLang(languageCode)
            .then(updated => {
                const reloadRequired = changed || updated
                if (!reloadRequired) return
                confirm({
                    cancelButton: textsCap.langConfirmCancelBtn,
                    confirmButton: textsCap.langConfirmOk,
                    header: textsCap.langConfirmHeader,
                    onConfirm: () => window.location.reload(true),
                    size: 'mini',
                })
            })
            .catch(err => {
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
    closeOnDimmerClick: true,
    closeOnEscape: true,
    closeText: null,
    header: textsCap.settings,
    // prevents multiple modal being open at the same time
    modalId: 'SettingsForm',
}


export const showKeyboardShortcuts = () => confirm(
    {
        cancelButton: null,
        confirmButton: null,
        content: (
                <DataTable {...{
                    searchable: false,
                    columns: [
                        { key: 'key', title: 'Shortcut Key'},
                        { key: 'action', title: 'Action'},
                    ],
                    data: [
                        { key: 'SHIFT + C', action: 'Start new chat'},
                        { key: 'SHIFT + S', action: 'Settings'},
                        { key: 'SHIFT + T', action: 'Timekeeping form'},
                        { key: 'C', action: 'Toggle chat bar visibility'},
                        { key: 'K', action: 'Toggle keyboard shortcuts view'},
                        { key: 'I', action: 'Toggle identity dropdown visibility'},
                        { key: 'N', action: 'Toggle notification visibility'},
                        { key: 'S', action: 'Toggle sidebar'},
                ],
                style: {margin: '-15px 0'}
                }} />
        ),
        header: 'Keyboard shortcuts',
        size: 'mini',
    },
    'shortcutKey-K',
    { style: { padding: 0 }},
)

/*


        <div>
            SHIFT + C => Start new chat<br />
            SHIFT + S => Settings<br />
            SHIFT + T => Timekeeping form<br />
            C => Toggle chat bar visibility<br />
            K => Toggle keyboard shortcuts view<br />
            I => Toggle identity dropdown visibility<br />
            N => Toggle notification visibility<br />
            S => Toggle sidebar<br />

        </div>
        */