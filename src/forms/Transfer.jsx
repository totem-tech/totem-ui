import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Subject } from 'rxjs'
import { Dropdown } from 'semantic-ui-react'
import { Bond } from 'oo7'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import Balance from '../components/Balance'
import { arrSort, textEllipsis, isFn, deferred, isValidNumber } from '../utils/utils'
import { ss58Decode } from '../utils/convert'
import PartnerForm from '../forms/Partner'
// services
import { getConnection, query, queueables } from '../services/blockchain'
import {
    convertTo,
    currencyDefault,
    getCurrencies,
    rxSelected as rxSelectedCurrency,
} from '../services/currency'
import {
    find as findIdentity,
    getAll,
    rxIdentities,
    rxSelected,
} from '../services/identity'
import { translated } from '../services/language'
import { confirm, showForm } from '../services/modal'
import partners, { getAddressName, rxPartners } from '../services/partner'
import { addToQueue } from '../services/queue'
import { unsubscribe } from '../services/react'
import { getTxFee } from '../utils/polkadotHelper'
import Currency from '../components/Currency'
import DataTable from '../components/DataTable'

const textsCap = translated({
    amount: 'amount',
    amountToSend: 'amount to send',
    currency: 'currency',
    availableBalance: 'available balance',
    identity: 'identity',
    partner: 'partner',
    recipient: 'recipient',
    sender: 'sender',
    status: 'status',
    addPartner: 'add partner',
    amountPlaceholder: 'enter the amount to send',
    insufficientBalance: 'insufficient balance',
    loadingBalance: 'loading account balance',
    partnerEmptyMsg1: 'You do not have any partner yet. Add one in the Partner Module',
    partnerEmptyMsg2: 'No match found. Enter a valid address to add as a partner.',
    partnerPlaceholder: 'select a partner',
    queueTitle: 'transfer funds',
    submitErrorHeader: 'transfer error',
    submitInprogressHeader: 'transfer in-progress',
    submitSuccessHeader: 'transfer successful',
    total: 'total',
    totalRequired: 'total required',
    txFee: 'transaction fee',
}, true)[1]

export default class Transfer extends Component {
    constructor(props) {
        super(props)

        this.values = {
            currency: rxSelectedCurrency.value,
        }
        this.state = {
            message: undefined,
            onChange: (_, values) => this.values = values,
            onSubmit: this.handleSubmit,
            submitDisabled: {},
            success: false,
            inputs: [
                {
                    bond: new Bond(),
                    label: textsCap.identity,
                    name: 'from',
                    options: [],
                    required: true,
                    search: ['text', 'value'],
                    selection: true,
                    type: 'dropdown',
                    value: '',
                },
                {
                    additionLabel: `${textsCap.addPartner}: `,
                    allowAdditions: false,
                    bond: new Bond(),
                    clearable: true,
                    label: textsCap.partner,
                    name: 'to',
                    noResultsMessage: textsCap.partnerEmptyMsg1,
                    onAddItem: (_, { value: address }) => {
                        // in case, if partner is not added or user cancels modal makes sure to remove the item
                        const { inputs } = this.state
                        const toIn = findInput(inputs, 'to')
                        toIn.options = toIn.options.filter(({ value }) => value !== address)
                        toIn.bond.changed(null)
                        this.setState({ inputs })

                        // Open add partner modal
                        showForm(PartnerForm, {
                            onSubmit: (ok, { address }) => ok && toIn.bond.changed(address),
                            values: { address }
                        })
                    },
                    onSearchChange: (_, { searchQuery: q }) => {
                        q = q.trim()
                        const { inputs } = this.state
                        const valid = !!ss58Decode(q)
                        const toIn = findInput(inputs, 'to')
                        toIn.allowAdditions = valid && !toIn.options.find(x => x.value === q)
                        toIn.noResultsMessage = !valid && q.length > 0 ? textsCap.partnerEmptyMsg2 : textsCap.partnerEmptyMsg1
                        this.setState({ inputs })
                    },
                    options: [],
                    placeholder: textsCap.partnerPlaceholder,
                    required: true,
                    search: ['text', 'value'],
                    selection: true,
                    selectOnBlur: false,
                    selectOnNavigation: false,
                    type: 'dropdown',
                },
                {
                    name: 'amount-group',
                    type: 'group',
                    unstackable: true,
                    inputs: [
                        {
                            label: textsCap.amount,
                            min: 0,
                            name: 'amount',
                            onChange: deferred(this.handleAmountChange, 500),
                            placeholder: textsCap.amountPlaceholder,
                            required: true,
                            rxValue: new Subject(),
                            type: 'number',
                            useInput: true,
                            value: '',
                            width: 9,
                        },
                        {
                            label: textsCap.currency,
                            name: 'currency',
                            onChange: this.handleCurrencyChange,
                            options: [],
                            rxValue: new Subject(),
                            search: ['text', 'description'],
                            selection: true,
                            type: 'dropdown',
                            width: 7,
                        },
                    ],
                },
            ],
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    async componentWillMount() {
        this._mounted = true
        this.subscriptions = {}
        const { inputs } = this.state
        const { values } = this.props
        const fromIn = findInput(inputs, 'from')
        const toIn = findInput(inputs, 'to')
        // change value when selected address changes
        this.subscriptions.selected = rxSelected.subscribe(address => {
            fromIn.bond.changed(address)
        })
        // re-/populate options if identity list changes
        this.subscriptions.identities = rxIdentities.subscribe(map => {
            const options = Array.from(map).map(([address, { name }]) => ({
                key: address,
                text: name,
                value: address,
            }))
            fromIn.options = arrSort(options, 'text')
            this.setState({ inputs })
        })
        // repopulate options if partners list changes
        this.subscriptions.partners = rxPartners.subscribe(map => {
            toIn.options = arrSort(
                Array.from(map).map(([address, { name }]) => ({
                    description: textEllipsis(address, 20),
                    key: address,
                    text: name,
                    value: address,
                })),
                'text'
            )
            this.setState({ inputs })
        })

        // set currency options
        this.currencies = await getCurrencies()
        const currencyIn = findInput(inputs, 'currency')
        const options = this.currencies.map(({ currency, nameInLanguage, ISO }) => ({
            description: currency,
            key: ISO,
            text: nameInLanguage,
            value: ISO
        }))
        currencyIn.options = arrSort(options, 'text')
        currencyIn.rxValue.next(rxSelectedCurrency.value)

        fillValues(inputs, values)
        this.setState({ inputs })
    }

    componentWillUnmount() {
        this._mounted = false
        unsubscribe(this.subscriptions)
    }

    clearForm = () => {
        const { inputs } = this.state
        fillValues(inputs, { to: null, amount: '' }, true)
        this.setState({ inputs })
    }

    handleCurrencyChange = (e, values) => {
        const { inputs } = this.state
        const amountIn = findInput(inputs, 'amount')
        const currencyObj = this.currencies.find(x => x.ISO === values.currency) || {}
        amountIn.decimals = parseInt(currencyObj.decimals || 0)
        this.setState({ inputs })
        isValidNumber(values.amount) && setTimeout(() => amountIn.rxValue.next(values.amount))
    }

    handleAmountChange = async (_, values) => {
        const { amount, currency, from, to } = values
        const valid = isValidNumber(amount) && amount > 0
        const identity = findIdentity(from)
        const { inputs, submitDisabled } = this.state
        const amountIn = findInput(inputs, 'amount')
        const amountGroupIn = findInput(inputs, 'amount-group')
        amountIn.loading = valid
        amountIn.invalid = !valid
        submitDisabled.loadingAmount = valid
        amountGroupIn.message = null
        this.setState({ inputs, submitDisabled })
        if (!valid) return

        const dualMode = currency && currency !== rxSelectedCurrency.value
        const res = await convertTo(
            amount,
            currency,
            currencyDefault,
        )
        this.amountXTX = res[0]
        const { api } = await getConnection()
        const [balance, locks] = await query(api.queryMulti, [[
            [api.query.balances.freeBalance, from],
            [api.query.balances.locks, from]
        ]])
        const freeBalance = balance - locks.reduce((sum, x) => sum + x.amount, 0)
        this.fee = await getTxFee(
            api,
            from,
            await api.tx.balances.transfer(to || from, this.amountXTX),
            identity.uri,
        )
        const total = this.fee + this.amountXTX
        const gotFund = freeBalance - total >= 0
        submitDisabled.loadingAmount = false
        submitDisabled.loadingAmount = false
        amountIn.invalid = !gotFund
        const unitDisplayed = rxSelectedCurrency.value
        amountGroupIn.message = {
            content: valid && (
                <DataTable {...{
                    columns: [
                        { key: 'amountXTX', title: textsCap.amountToSend },
                        { key: 'fee', title: textsCap.fxFee },
                        { key: 'total', title: textsCap.totalRequired },
                    ],
                    data: [
                        {
                            amountXTX: <Currency {...{ EL: 'div', unitDisplayed, value: this.amountXTX }} />,
                            fee: < Currency {...{ EL: 'div', unitDisplayed, value: this.fee }} />,
                            total: <Currency {...{ EL: 'div', unitDisplayed, value: total }} />,
                        },
                        dualMode && {
                            amountXTX: <Currency {...{ unitDisplayed: currency, value: this.amountXTX }} />,
                            fee: <Currency {...{ unitDisplayed: currency, value: this.fee }} />,
                            total: <Currency {...{ unitDisplayed: currency, value: total }} />,
                        }
                    ].filter(Boolean),
                    searchable: false,
                }} />
            ),
            // content: (
            //     <span>
            //         <Currency {...{
            //             EL: 'div',
            //             prefix: `${textsCap.amount}: `,
            //             unitDisplayed: rxSelectedCurrency.value,
            //             value: this.amountXTX,
            //             suffix: !dualMode ? '' : (
            //                 <Currency {...{
            //                     prefix: ' | ',
            //                     unitDisplayed: currency,
            //                     value: this.amountXTX,
            //                 }} />
            //             )
            //         }} />
            //         <Currency {...{
            //             EL: 'div',
            //             prefix: `${textsCap.txFee}: `,
            //             unitDisplayed: rxSelectedCurrency.value,
            //             value: this.fee,
            //             suffix: !dualMode ? '' : (
            //                 <Currency {...{
            //                     prefix: ' | ',
            //                     unitDisplayed: currency,
            //                     value: this.fee,
            //                 }} />
            //             )
            //         }} />
            //         <Currency {...{
            //             EL: 'div',
            //             prefix: `${textsCap.total}: `,
            //             unitDisplayed: rxSelectedCurrency.value,
            //             value: total,
            //             suffix: !dualMode ? '' : (
            //                 <Currency {...{
            //                     prefix: ' | ',
            //                     unitDisplayed: currency,
            //                     value: total,
            //                 }} />
            //             )
            //         }} />
            //     </span>
            // ),
            header: gotFund ? '' : (
                <div className='header' style={{ paddingTop: 10 }}>
                    {textsCap.insufficientBalance}
                </div>
            ),
            status: gotFund ? 'info' : 'error',
            style: { padding: 0, margin: '0 -5 0 0' }
        }
        amountIn.loading = false
        this.setState({ inputs, submitDisabled })
    }

    handleSubmit = (_, { amount, currency, from, to }) => {
        const { name } = partners.get(to)
        const description = [
            `${textsCap.sender}: ${findIdentity(from).name}`,
            `${textsCap.recipient}: ${getAddressName(to)}`,
            `${textsCap.amount}: ${amount} ${currencyDefault}`,
        ].join('\n')
        const then = (success, resultOrError) => {
            if (!success) return this.setMessage(resultOrError)
            this.setMessage(null, resultOrError, name, amount, currency)
            this.clearForm()
        }

        const queueProps = queueables.balanceTransfer(from, to, this.amountXTX, {
            description,
            title: textsCap.queueTitle,
            then,
        })

        confirm({
            onConfirm: () => this.setMessage() | addToQueue(queueProps),
            size: 'mini',
        })

    }

    setMessage = (err, result = [], recipientName, amount, currency) => {
        const { submitDisabled } = this.state
        const [hash] = result
        const inProgress = !err && !hash
        let content = ''
        let header = textsCap.submitInprogressHeader
        let status = 'loading'
        if (!inProgress) {
            content = err ? `${err}` : (
                <ul style={{ listStyleType: 'none', margin: 0, paddingLeft: 0 }}>
                    <li>{textsCap.recipient}: {recipientName}</li>
                    <li>
                        <Currency {...{
                            prefix: `${textsCap.amount}: `,
                            unit: currencyDefault,
                            unitDisplayed: rxSelectedCurrency,
                            value: amount,
                        }} />
                    </li>
                    <li>
                        <Currency {...{
                            prefix: `${textsCap.txFee}: `,
                            unit: currencyDefault,
                            unitDisplayed: rxSelectedCurrency,
                            value: this.fee,
                        }} />
                    </li>
                </ul>
            )
            header = err ? textsCap.submitErrorHeader : textsCap.submitSuccessHeader
            status = err ? 'error' : 'success'
        }
        submitDisabled.submission = inProgress
        this.setState({
            message: { content, header, showIcon: true, status },
            submitDisabled,
        })
    }

    render = () => {
        const { inputs } = this.state
        const address = rxSelected.value
        const { currency } = this.values
        const dualBalance = currency && currency !== rxSelectedCurrency.value
        if (this.address !== address || this.currency !== currency + rxSelectedCurrency.value) {
            this.currency = currency + rxSelectedCurrency.value
            this.address = address
            const fromIn = findInput(inputs, 'from')
            fromIn.message = !address ? null : {
                content: (
                    <Balance {...{
                        address,
                        emptyMessage: textsCap.loadingBalance + '...',
                        prefix: `${textsCap.availableBalance}: `,
                        suffix: !dualBalance ? undefined : (
                            <Balance {...{
                                address,
                                prefix: ' | ',
                                unit: rxSelectedCurrency.value,
                                unitDisplayed: currency || rxSelectedCurrency.value,
                            }} />
                        )
                    }} />
                )
            }
        }
        return <FormBuilder {...{ ...this.props, ...this.state }} />
    }
}

Transfer.propTypes = {
    values: PropTypes.shape({
        amount: PropTypes.number,
        from: PropTypes.string,
        to: PropTypes.string,
        currency: PropTypes.string,
    })
}
Transfer.defaultProps = {
    inputsDisabled: ['from'],
    header: textsCap.queueTitle,
    size: 'tiny'
}