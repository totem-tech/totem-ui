import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Subject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import { ss58Decode } from '../utils/convert'
import { getTxFee } from '../utils/polkadotHelper'
import { arrSort, textEllipsis, deferred, isValidNumber } from '../utils/utils'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import Balance from '../components/Balance'
import Currency from '../components/Currency'
import Text from '../components/Text'
import PartnerForm from '../modules/partner/PartnerForm'
import { find as findIdentity, rxIdentities, rxSelected } from '../modules/identity/identity'
import { getAddressName, rxPartners } from '../modules/partner/partner'
import { getConnection, query, queueables } from '../services/blockchain'
import { convertTo, currencyDefault, getCurrencies, rxSelected as rxSelectedCurrency } from '../services/currency'
import { translated } from '../services/language'
import { confirm, showForm } from '../services/modal'
import { addToQueue } from '../services/queue'
import { unsubscribe } from '../services/react'

const textsCap = translated({
    amount: 'amount',
    amountReceivedLabel: 'payment amount',
    amountReceivedPlaceholder: 'enter amount',
    amountSentLabel: 'amount in your display currency',
    amountToSend: 'amount to send',
    addPartner: 'add partner',
    availableBalance: 'available balance',
    currency: 'currency',
    currencyReceivedLabel: 'payment currency',
    currencySentLabel: 'your display currency',
    includesTxFee: 'Includes a transaction fee of',
    insufficientBalance: 'insufficient balance',
    loadingBalance: 'loading account balance',
    partnerEmptyMsg1: 'You do not have any partners yet. Add one in the Partner Module',
    partnerEmptyMsg2: 'No match found. Enter a valid address to add as a partner.',
    partnerPlaceholder: 'select a partner',
    payerIdentity: 'payer',
    queueTitle: 'transfer funds',
    recipient: 'recipient',
    send: 'send',
    sender: 'sender',
    status: 'status',
    submitErrorHeader: 'transfer error',
    submitInprogressHeader: 'transfer in-progress',
    submitSuccessHeader: 'transfer successful',
    toLabel: 'recipient (select a partner)',
    total: 'total',
    totalRequired: 'total required',
    txFee: 'transaction fee',
}, true)[1]

export default class Transfer extends Component {
    constructor(props) {
        super(props)

        this.names = {
            amountReceived: 'amountReceived',
            amountReceivedGroup: 'amountReceivedGroup',
            amountSent: 'amountSent',
            amountSentGroup: 'amountSentGroup',
            currencyReceived: 'currencyReceived',
            currencySent: 'currencySent',
            from: 'from',
            to: 'to',
            txFee: 'txFeeHTML'
        }
        this.state = {
            message: undefined,
            onChange: (_, values) => this.setState({ values }),
            onSubmit: this.handleSubmit,
            submitDisabled: {},
            success: false,
            values: {
                currency: rxSelectedCurrency.value,
            },
            inputs: [
                {
                    label: undefined,
                    name: this.names.from,
                    options: [],
                    required: true,
                    rxValue: new Subject(),
                    search: ['text', 'value'],
                    selection: true,
                    type: 'dropdown',
                    value: '',
                },
                {
                    additionLabel: `${textsCap.addPartner}: `,
                    allowAdditions: false,
                    clearable: true,
                    label: textsCap.toLabel,
                    name: this.names.to,
                    noResultsMessage: textsCap.partnerEmptyMsg1,
                    rxValue: new Subject(),
                    onAddItem: (_, { value: address }) => {
                        // in case, if partner is not added or user cancels modal makes sure to remove the item
                        const { inputs } = this.state
                        const toIn = findInput(inputs, this.names.to)
                        toIn.options = toIn.options.filter(({ value }) => value !== address)
                        toIn.rxValue.next(null)
                        this.setState({ inputs })

                        // Open add partner modal
                        showForm(PartnerForm, {
                            onSubmit: (ok, { address }) => ok && toIn.rxValue.next(address),
                            values: { address }
                        })
                    },
                    onSearchChange: (_, { searchQuery: q }) => {
                        q = q.trim()
                        const { inputs } = this.state
                        const valid = !!ss58Decode(q)
                        const toIn = findInput(inputs, this.names.to)
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
                    name: this.names.amountSentGroup,
                    inputs: [
                        {
                            disabled: true,
                            label: textsCap.amountSentLabel,
                            min: 0,
                            name: this.names.amountSent,
                            readOnly: true,
                            rxValue: new Subject(),
                            type: 'number',
                            useInput: true,
                            value: '',
                            width: 8,
                        },
                        {
                            disabled: true,
                            label: textsCap.currencySentLabel,
                            name: this.names.currencySent,
                            onChange: this.handleCurrencySentChange,
                            options: [],
                            rxValue: new Subject(),
                            search: ['text', 'description'],
                            selection: true,
                            type: 'dropdown',
                            width: 8,
                        },
                    ],
                    type: 'group',
                    unstackable: true,
                },
                {
                    content: undefined,
                    name: this.names.txFee,
                    type: 'html',
                },
                {
                    name: this.names.amountReceivedGroup,
                    type: 'group',
                    unstackable: true,
                    inputs: [
                        {
                            icon: 'money',
                            iconPosition: 'left',
                            label: textsCap.amountReceivedLabel,
                            maxLength: 12,
                            min: 0,
                            name: this.names.amountReceived,
                            onChange: deferred(this.handleAmountReceivedChange, 500),
                            onInvalid: this.handleAmountReceivedInvalid,
                            placeholder: textsCap.amountReceivedPlaceholder,
                            required: true,
                            rxValue: new Subject(),
                            type: 'number',
                            useInput: true,
                            value: '',
                            width: 8,
                        },
                        {
                            label: textsCap.currencyReceivedLabel,
                            name: this.names.currencyReceived,
                            onChange: this.handleCurrencyReceivedChange,
                            options: [],
                            required: true,
                            rxValue: new Subject(),
                            search: ['text', 'description'],
                            selection: true,
                            type: 'dropdown',
                            width: 8,
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
        const { values = {} } = this.props
        const fromIn = findInput(inputs, this.names.from)
        const toIn = findInput(inputs, this.names.to)
        this.currencies = await getCurrencies()
        const currencyReceivedIn = findInput(inputs, this.names.currencyReceived)
        const currencySentIn = findInput(inputs, this.names.currencySent)
        const options = arrSort(
            this.currencies.map(({ currency, nameInLanguage, ISO }) => ({
                description: (
                    <span className='description' style={{ fontSize: '75%' }}>
                        {nameInLanguage}
                    </span>
                ),
                key: ISO,
                text: currency,
                value: ISO
            })),
            'text'
        )
        currencyReceivedIn.options = options
        currencySentIn.options = options
        values[this.names.currencyReceived] = rxSelectedCurrency.value
        values[this.names.currencySent] = rxSelectedCurrency.value
        fillValues(inputs, values)
        findInput(inputs, this.names.txFee).content = this.getTxFeeEl()
        this.setState({ inputs })

        this.subscriptions.selectedCurency = rxSelectedCurrency.subscribe(v => currencySentIn.rxValue.next(v))
        // change value when selected address changes
        this.subscriptions.selected = rxSelected.subscribe(v => fromIn.rxValue.next(v))
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

    getTxFeeEl = feeXTX => {
        const { values } = this.state
        const currencyReceived = values[this.names.currencyReceived]
        const currentSent = values[this.names.currencySent]
        const secondCurEl = currencyReceived === currentSent ? null : (
            <Currency {...{
                prefix: ' | ',
                value: feeXTX,
                unitDisplayed: currencyReceived,
            }} />
        )
        return (
            <Text EL='div' style={{ margin: `${feeXTX ? '-' : ''}15px 0 15px 3px` }}>
                {feeXTX && (
                    <Currency {...{
                        prefix: `${textsCap.includesTxFee} : `,
                        value: feeXTX,
                        unitDisplayed: currentSent,
                        // suffix: secondCurEl,
                    }} />
                )}
                <div style={{
                    fontSize: 32,
                    paddingTop: !feeXTX ? 0 : 15,
                    textAlign: 'center',
                }}>
                    <Icon {...{ name: 'exchange', rotated: 'counterclockwise' }} />
                </div>
            </Text>
        )
    }

    handleAmountReceivedChange = async (_, values) => {
        const amountReceived = values[this.names.amountReceived]
        const currencyReceived = values[this.names.currencyReceived]
        const from = values[this.names.from]
        const to = values[this.names.to]
        const valid = isValidNumber(amountReceived) && amountReceived > 0
        const identity = findIdentity(from)
        const { inputs, submitDisabled } = this.state
        const amountIn = findInput(inputs, this.names.amountReceived)
        const amountGroupIn = findInput(inputs, this.names.amountReceivedGroup)
        const amountSentIn = findInput(inputs, this.names.amountSent)
        const txFeeIn = findInput(inputs, this.names.txFee)
        amountIn.loading = valid
        amountIn.invalid = !valid
        submitDisabled.loadingAmount = valid
        amountGroupIn.message = null
        this.setState({ inputs, submitDisabled })
        if (!valid) return

        const res = await convertTo(
            amountReceived,
            currencyReceived,
            currencyDefault,
        )
        this.amountXTX = res[0]
        const resAmountSent = await convertTo(
            this.amountXTX,
            currencyDefault,
            rxSelectedCurrency.value,
        )
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
        txFeeIn.content = this.getTxFeeEl(this.fee)
        const total = this.fee + this.amountXTX
        const gotFund = freeBalance - total > 0
        submitDisabled.loadingAmount = false
        amountIn.invalid = !gotFund
        amountIn.loading = false
        amountIn.icon = gotFund ? 'check' : 'exclamation circle'
        amountIn.iconPosition = 'left'
        amountGroupIn.message = gotFund ? null : {
            content: textsCap.insufficientBalance,
            status: 'error',
        }

        amountSentIn.rxValue.next(resAmountSent[1])
        this.setState({ inputs, submitDisabled })
    }

    handleAmountReceivedInvalid = () => {
        const { inputs } = this.state
        const amountReceivedIn = findInput(inputs, this.names.amountReceived)
        const amountReceivedGrpIn = findInput(inputs, this.names.amountReceivedGroup)
        const amountSentIn = findInput(inputs, this.names.amountSent)
        amountSentIn.rxValue.next('')
        amountReceivedIn.icon = 'money'
        amountReceivedGrpIn.message = null
        this.setState({ inputs })
    }

    handleCurrencyReceivedChange = (_, values) => {
        const { inputs } = this.state
        const amountReceived = values[this.names.amountReceived]
        const currencyReceived = values[this.names.currencyReceived]
        const amountReceivedIn = findInput(inputs, this.names.amountReceived)
        const currencyObj = this.currencies.find(x => x.ISO === currencyReceived) || {}
        amountReceivedIn.decimals = parseInt(currencyObj.decimals || 0)
        // this.setState({ inputs })
        isValidNumber(amountReceived) && amountReceivedIn.rxValue.next(amountReceived)
    }

    handleSubmit = (_, values) => {
        const amountReceived = values[this.names.amountReceived]
        const currencyReceived = values[this.names.currencyReceived]
        const from = values[this.names.from]
        const to = values[this.names.to]
        const description = [
            `${textsCap.sender}: ${findIdentity(from).name}`,
            `${textsCap.recipient}: ${getAddressName(to)}`,
            `${textsCap.amount}: ${amountReceived} ${currencyReceived}`,
        ]
        const queueProps = queueables.balanceTransfer(
            from,
            to,
            this.amountXTX,
            {
                description: description.join('\n'),
                title: textsCap.queueTitle,
                then: (success, resultOrError) => {
                    if (!success) return this.setPostSubmitMessage(resultOrError)
                    this.setPostSubmitMessage(null, resultOrError, description)
                    this.clearForm()
                },
            },
        )

        confirm({
            onConfirm: () => this.setPostSubmitMessage() | addToQueue(queueProps),
            size: 'mini',
        })

    }

    setPostSubmitMessage = (err, result = [], description) => {
        const { submitDisabled } = this.state
        const [hash] = result
        const submitInProgress = !err && !hash
        let content = ''
        let header = textsCap.submitInprogressHeader
        let status = 'loading'
        if (!submitInProgress) {
            content = err ? `${err}` : description && (
                <ul style={{ listStyleType: 'none', margin: 0, paddingLeft: 0 }}>
                    {description.map((content, i) => <li key={i}>{content}</li>)}
                </ul>
            )
            header = err ? textsCap.submitErrorHeader : textsCap.submitSuccessHeader
            status = err ? 'error' : 'success'
        }
        // submitDisabled.submission = submitInProgress
        this.setState({
            message: { content, header, icon: true, status },
            submitDisabled,
            submitInProgress,
        })
    }

    render = () => {
        const { inputs, values } = this.state
        const address = rxSelected.value
        const currencyReceived = values[this.names.currencyReceived]
        const currencySent = rxSelectedCurrency.value
        const dualBalance = currencyReceived && currencyReceived !== currencySent
        if (this.address !== address || this.curs !== currencyReceived + currencySent) {
            this.curs = currencyReceived + currencySent
            this.address = address
            const fromIn = findInput(inputs, this.names.from)
            fromIn.label = !address ? undefined : (
                <span>
                    {textsCap.payerIdentity} (
                    <Balance {...{
                        address,
                        emptyMessage: textsCap.loadingBalance + '...',
                        prefix: `${textsCap.availableBalance}: `,
                        unitDisplayed: currencySent,
                        suffix: !dualBalance ? '' : (
                            <Balance {...{
                                address,
                                prefix: ' | ',
                                showDetailed: null,
                                unitDisplayed: currencyReceived,
                            }} />
                        )
                    }} />
                    )
                </span>
            )
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
    size: 'tiny',
    submitText: textsCap.send,
}