import React, { Component } from 'react'
// components
import DataTable from '../components/DataTable'
import FormBuilder, { findInput } from '../components/FormBuilder'
// modules
import { historyLimit as chatHistoryLimit } from '../modules/chat/chat'
import client from '../utils/chatClient'
import {
    rxSelected as rxSelectedCurrency,
    setSelected as setSelectedCurrency
} from '../modules/currency/currency'
import { asInput } from '../modules/currency/CurrencyDropdown'
import { limit as historyItemsLimit } from '../modules/history/history'
import TimekeepingSettings from '../modules/timekeeping/TimekeepingSettings'
// services
import { nodes, nodesDefault, setNodes } from '../services/blockchain'
import {
    getSelected as getSelectedLang,
    languages,
    setSelected as setSelectedLang,
    translated,
} from '../utils/languageHelper'
import { confirm, confirmAsPromise } from '../services/modal'
// utils
import { copyRxSubject } from '../utils/reactjs'
import {
    arrSort,
    deferred,
    isObj
} from '../utils/utils'
import { gridColumns } from '../utils/window'

let textsCap = {
    chatLimitLabel: 'messages per chat',
    column: 'column',
    columns: 'columns',
    error: 'error',
    gridLabel: 'main content columns',
    gsCurrencyLabel: 'display currency',
    gsLanguageLabel: 'language (experimental)',
    historyLbl: 'user activity history limit',
    historyLblDetails: 'maximum number items to keep',
    kbShortcuts: 'keyboard shortcuts',
    langConfirmCancelBtn: 'later',
    langConfirmHeader: 'page reload required',
    langConfirmOk: 'reload page',
    nodeUrlCofirmHeader: 'are you sure?',
    nodeUrlCofirmMsg: `
    CAUTION: an invalid node URL will cause Blockchain connectivity to fail.
    Page will be reloaded to apply the change.
    
    If you would like to revert to default node URL, remove it from the input field.
    `,
    nodeUrlCofirmBtn: 'Yes, proceed',
    nodeUrlLabel: 'blockchain node URL',
    nodeUrlReset: 'Revert to default Node URL',
    saved: 'saved',
    settings: 'settings',
    unlimited: 'unlimited',
    _c: 'toggle chat bar visibility',
    _d: 'toggle dark mode',
    _k: 'toggle keyboard shortcuts view',
    _i: 'toggle identity dropdown visibility',
    _n: 'toggle notification visibility',
    _s: 'toggle sidebar',
    _shiftC: 'start new chat',
    _shiftS: 'settings',
    _shiftT: 'timekeeping form',
    _header: 'keyboard shortcuts',
    _subheader: 'not available when an input field is on focus',
}
textsCap = translated(textsCap, true)[1]
const savedMsg = {
    content: textsCap.saved,
    status: 'success',
}

export const inputNames = {
    chatMsgLimit: 'chatMsgLimit',
    currency: 'currency',
    gridCols: 'gridCols',
    historyLimit: 'historyLimit',
    kbShortcutsBtn: 'kbShortcutsBtn',
    languageCode: 'languageCode',
    nodeUrl: 'nodeUrl',
    timekeeping: 'timekeeping',
}

export const showKeyboardShortcuts = () => confirm(
    {
        cancelButton: null,
        confirmButton: null,
        content: (
            <DataTable {...{
                searchable: false,
                columns: [
                    {
                        key: 'key',
                        style: { paddingLeft: 25 },
                        title: 'Shortcut Key',
                    },
                    { key: 'action', title: 'Action' },
                ],
                data: [
                    { key: 'SHIFT + C', action: textsCap._shiftC },
                    { key: 'SHIFT + S', action: textsCap._shiftS },
                    { key: 'SHIFT + T', action: textsCap._shiftT },
                    { key: 'C', action: textsCap._c },
                    { key: 'D', action: textsCap._d },
                    { key: 'K', action: textsCap._k },
                    { key: 'I', action: textsCap._i },
                    { key: 'N', action: textsCap._n },
                    { key: 'S', action: textsCap._s },
                ],
                style: { margin: '-15px 0' },
            }} />
        ),
        header: (
            <div className='header'>
                {textsCap._header}
                <div style={{
                    fontWeight: 'normal',
                    fontSize: 13,
                    textTransform: 'initial',
                    lineHeight: 1,
                    fontStyle: 'italic',
                }}>
                    * {textsCap._subheader}
                </div>
            </div>
        ),
        size: 'mini',
    },
    'shortcutKey-K',
    { style: { padding: 0 } },
)

export default class SettingsForm extends Component {
    constructor(props) {
        super(props)

        this.timeoutIds = {}
        this.defaultNodeUrl = nodesDefault[0]
        this.connectedNodeUrl = nodes[0] || ''
        this.defaultNodeUrlChanged = this.connectedNodeUrl !== nodesDefault[0]
        const values = {}
        values[inputNames.nodeUrl] = this.connectedNodeUrl
        this.rxCurrency = copyRxSubject(rxSelectedCurrency)
        this.state = {
            values,
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
                    selectOnBlur: false,
                    selectOnNavigation: false,
                    selection: true,
                    type: 'dropdown',
                    value: getSelectedLang(),
                },
                asInput({
                    label: textsCap.gsCurrencyLabel,
                    name: inputNames.currency,
                    onChange: this.handleCurrencyChange,
                    rxValue: this.rxCurrency,
                    type: 'html',
                }),
                {
                    label: textsCap.historyLbl,
                    labelDetails: textsCap.historyLblDetails,
                    name: inputNames.historyLimit,
                    onChange: this.handleHistoryLimitChange,
                    options: [-1, 10, 50, 100, 500, 1000]
                        .map((limit, i) => ({
                            key: i,
                            text: limit === -1
                                ? textsCap.unlimited
                                : limit,
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
                    label: textsCap.gridLabel,
                    name: inputNames.gridCols,
                    onChange: this.handleGridCollumnsChange,
                    options: [1, 2, 3, 4, 5, 6]
                        .map(n => ({
                            icon: n === 1 ? 'bars' : 'grid layout',
                            key: n,
                            text: `${n} ${(
                                n > 1
                                    ? textsCap.columns
                                    : textsCap.column
                            ).toLowerCase()}`,
                            value: n,
                        })),
                    selection: true,
                    type: 'dropdown',
                    value: gridColumns(),
                },
                {
                    label: textsCap.nodeUrlLabel,
                    name: inputNames.nodeUrl,
                    onChange: deferred((_, values) => this.setState({ values: { ...values } }), 100),
                    type: 'url',
                    value: this.connectedNodeUrl || this.defaultNodeUrl,
                },
                {
                    content: <TimekeepingSettings El='div' />,
                    name: inputNames.timekeeping,
                    type: 'html',
                },
                {
                    content: `${textsCap.kbShortcuts} (K)`,
                    fluid: true,
                    icon: 'keyboard',
                    name: inputNames.kbShortcutsBtn,
                    onClick: showKeyboardShortcuts,
                    type: 'button'
                }
            ]
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount = () => this._mounted = true
    componentWillUnmount = () => this._mounted = false

    handleCurrencyChange = async (_, values) => {
        const currency = values[inputNames.currency]
        await setSelectedCurrency(currency)
        this.setInputMessage('currency', savedMsg)
    }

    handleChatLimitChange = (_, values) => {
        const chatMsgLimit = values[inputNames.chatMsgLimit]
        chatHistoryLimit(chatMsgLimit)
        this.setInputMessage('chatMsgLimit', savedMsg)
    }

    handleGridCollumnsChange = (_, values) => {
        const gridCols = values[inputNames.gridCols]
        gridColumns(gridCols)
        this.setInputMessage('gridCols', savedMsg)
    }

    handleHistoryLimitChange = (_, values) => {
        const limit = values[inputNames.historyLimit]
        historyItemsLimit(limit === textsCap.unlimited ? null : limit, true)
        this.setInputMessage('historyLimit', savedMsg)
    }

    handleLanguageChange = async (_, values) => {
        const languageCode = values[inputNames.languageCode]
        const changed = getSelectedLang() !== languageCode
        const updated = await setSelectedLang(languageCode, client)
        const reloadRequired = changed || updated
        if (!reloadRequired) return

        this.setInputMessage('languageCode', savedMsg, 2000)
        confirmAsPromise({
            cancelButton: textsCap.langConfirmCancelBtn,
            confirmButton: textsCap.langConfirmOk,
            header: textsCap.langConfirmHeader,
            onConfirm: () => window.location.reload(true),
            size: 'mini',
        })
    }

    handleNodeUrlSubmit = (reset = false) => {
        const nodes = reset
            ? []
            : [
                this.state
                    .values[inputNames.nodeUrl]
                    .trim()
            ]
        confirm({
            confirmButton: {
                content: textsCap.nodeUrlCofirmBtn,
                negative: !reset,
            },
            content: reset
                ? textsCap.nodeUrlReset
                : textsCap.nodeUrlCofirmMsg,
            header: textsCap.nodeUrlCofirmHeader,
            onConfirm: () => setNodes(nodes),
            size: 'mini',
        })
    }

    setInputMessage = (inputName, message, delay = 2000) => {
        const { inputs } = this.state
        const input = findInput(inputs, inputName)
        input.message = message
        this.timeoutIds[inputName] && clearTimeout(this.timeoutIds[inputName])
        this.setState({ inputs })

        const isError = isObj(message) && message.status === 'error'
        if (delay === 0 || isError) return
        this.timeoutIds[inputName] = setTimeout(() => {
            input.message = null
            this.setState({ inputs })
        }, delay)
    }

    render = () => {
        const { values } = this.state
        const nodeUrl = values[inputNames.nodeUrl]
        const input = findInput(this.state.inputs, inputNames.nodeUrl)
        input.action = {
            disabled: !nodeUrl || [
                !this.defaultNodeUrlChanged && this.defaultNodeUrl,
                this.connectedNodeUrl
            ]
                .filter(Boolean)
                .includes(nodeUrl),
            icon: 'check',
            onClick: () => this.handleNodeUrlSubmit(),
        }
        input.inlineLabel = this.defaultNodeUrlChanged && {
            icon: {
                className: 'no-margin',
                name: 'reply',
            },
            title: textsCap.nodeUrlReset,
            onClick: () => {
                const { values } = this.state
                values[inputNames.nodeUrl] = ''
                this.setState({ values })
                this.handleNodeUrlSubmit(true)
            },
        }
        return <FormBuilder {...{ ...this.props, ...this.state }} />
    }
}
SettingsForm.defaultProps = {
    closeOnDimmerClick: true,
    closeOnEscape: true,
    closeText: null,
    header: textsCap.settings,
    // prevents multiple modal being open at the same time
    modalId: 'SettingsForm',
}