import React, { Component } from 'react'
import { forceRefreshPage } from '../utils/utils'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { translated } from '../services/language'
import { getSelected, setSelected } from '../services/language'
import storage from '../services/storage'

const [texts, textsCap] = translated({
    gsCurrencyLabel: 'default currency',
    gsLanguageLabel: 'default language',
    notImplemented: 'not implemented',
    saved: 'saved',
}, true)
const moduleKey = 'setttings'
export default class SettingsView extends Component {
    render = () => <GlobalSettings />
}

const savedMsg = { content: texts.saved, status: 'success' }
const notImplementedMsg = { content: texts.notImplemented, status: 'warning' }
class GlobalSettings extends Component {
    constructor(props) {
        super(props)
        // supported languages || ToDo: use API to retrieve from server
        const langCodes = {
            BN: 'Bangla',
            DE: 'German',
            EN: 'English',
            FR: 'French',
        }
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
                    label: textsCap.gsLanguageLabel,
                    name: 'languageCode',
                    onChange: this.handleLanguageChange,
                    options: Object.keys(langCodes).map(code => ({
                        key: code,
                        text: langCodes[code],
                        value: code,
                    })),
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: getSelected() || 'EN',
                },
                {
                    label: textsCap.gsCurrencyLabel,
                    name: 'currency',
                    onChange: this.handleCurrencyChange,
                    options: Object.keys(this.currencies).map(value => ({
                        description: this.currencies[value],
                        key: value,
                        text: value,
                        value
                    })),
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: storage.settings.global(moduleKey).currency || Object.keys(this.currencies)[0]
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
        // auto reload page
        forceRefreshPage()
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