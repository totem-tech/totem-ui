import React, { Component, useState } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
// utils
import { ss58Decode } from '../../utils/convert'
import { getTxFee } from '../../utils/polkadotHelper'
import { arrSort, textEllipsis, deferred, isValidNumber, isArr } from '../../utils/utils'
// components
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import Text from '../../components/Text'
// services
import { getConnection, query, queueables, randomHex } from '../../services/blockchain'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { unsubscribe } from '../../services/react'
// modules
import Currency from '../currency/Currency'
import {
    convertTo,
    currencyDefault,
    getCurrencies,
    rxSelected as rxSelectedCurrency,
} from '../currency/currency'
import { remove as removeNotif, setItemViewHandler } from '../notification/notification'
import { get as getPartner, getAddressName, rxPartners } from '../partner/partner'
import PartnerForm from '../partner/PartnerForm'
import Balance from './Balance'
import { get as getIdentity, rxIdentities, rxSelected } from './identity'
import AddPartnerBtn from '../partner/AddPartnerBtn'
import { copyRxSubject, subjectAsPromise, useRxSubject } from '../../utils/reactHelper'
import { asInlineLabel } from '../currency/CurrencyDropdown'
import { statuses } from '../../components/Message'

const textsCap = translated({
    amount: 'amount',
    amountReceivedLabel: 'payment amount',
    amountReceivedPlaceholder: 'enter amount',
    amountSentLabel: 'amount in display currency',
    amountTooLarge: 'amount too large',
    amountToSend: 'amount to send',
    addPartner: 'add partner',
    availableBalance: 'available balance',
    currency: 'currency',
    currencyReceivedLabel: 'payment currency',
    currencySentLabel: 'your display currency',
    includesTxFee: 'plus a transaction fee of',
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
    transferedFunds: 'transfered funds to you',
    txFee: 'transaction fee',
    yourIdentity: 'your identity',
}, true)[1]
// notification type
const TRANSFER_TYPE = 'transfer'

export default class TransferForm extends Component {
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
        this.rxAddress = new BehaviorSubject()
        this.rxCurrencies = new BehaviorSubject()
        this.rxCurrencyReceived = new BehaviorSubject(rxSelectedCurrency.value)
        this.rxCurrencySent = copyRxSubject(rxSelectedCurrency)
        this.rxCurrencyOptions = new BehaviorSubject([])
        this.state = {
            loading: {
                // wait until currencies list is loaded
                currencies: true,
            }, 
            message: undefined,
            onChange: (_, values) => this.setState({ values }),
            onSubmit: this.handleSubmit,
            submitDisabled: {},
            success: false,
            values: {
                // currency: rxSelectedCurrency.value,
            },
            inputs: [
                {
                    label: (
                        <FromInputLabel {...{
                            rxAddress: this.rxAddress,
                            rxCurrencyReceived: this.rxCurrencyReceived,
                            rxCurrencySent: this.rxCurrencySent,
                        }} />
                    ),
                    name: this.names.from,
                    onChange: this.handleCurrencyReceivedChange,
                    options: [],
                    required: true,
                    rxValue: this.rxAddress,
                    search: ['text', 'value'],
                    selection: true,
                    type: 'dropdown',
                },
                {
                    additionLabel: `${textsCap.addPartner}: `,
                    allowAdditions: false,
                    clearable: true,
                    label: textsCap.toLabel,
                    name: this.names.to,
                    noResultsMessage: textsCap.partnerEmptyMsg1,
                    rxValue: new BehaviorSubject(),
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
                            ...asInlineLabel({
                                // readOnly: true,
                                rxValue: this.rxCurrencySent,
                            }),
                            label: textsCap.amountSentLabel,
                            min: 0,
                            name: this.names.amountSent,
                            readOnly: true,
                            rxValue: new BehaviorSubject(''),
                            type: 'number',
                        },
                        {
                            hidden: true,
                            name: this.names.currencySent,
                            onChange: this.handleCurrencyReceivedChange,
                            rxValue: this.rxCurrencySent,
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
                            ...asInlineLabel({
                                onCurrencies: currencies => {
                                    this.rxCurrencies.next(currencies)
                                    const { loading } = this.state
                                    loading.currencies = false
                                    this.setState({ loading })
                                },
                                rxValue: this.rxCurrencyReceived,
                                upward: true,
                            }),
                            icon: 'money',
                            iconPosition: 'left',
                            label: textsCap.amountReceivedLabel,
                            maxLength: 12,
                            min: 0,
                            name: this.names.amountReceived,
                            onChange: this.handleAmountReceivedChange,
                            onInvalid: this.handleAmountReceivedInvalid,
                            placeholder: textsCap.amountReceivedPlaceholder,
                            required: true,
                            rxValue: new BehaviorSubject(''),
                            type: 'number',
                        },
                        {
                            hidden: true,
                            name: this.names.currencyReceived,
                            onChange: this.handleCurrencyReceivedChange,
                            rxValue: this.rxCurrencyReceived,
                        },
                    ],
                },
            ],
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        this.subscriptions = {}
        const { inputs } = this.state
        const { values = {} } = this.props
        const fromIn = findInput(inputs, this.names.from)
        const toIn = findInput(inputs, this.names.to)
        const currencyReceivedIn = findInput(inputs, this.names.currencyReceived)
        const currencySentIn = findInput(inputs, this.names.currencySent)
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

    getTxFeeEl = feeAmount => (
        <Text El='div' style={{ margin: `${feeAmount ? '-' : ''}15px 0 15px 3px` }}>
            {feeAmount && (
                <Currency {...{
                    prefix: `${textsCap.includesTxFee} `,
                    value: feeAmount,
                    decimalPlaces: 4,
                }} />
            )}
            <div style={{
                fontSize: 32,
                paddingTop: !feeAmount ? 0 : 15,
                textAlign: 'center',
            }}>
                <Icon {...{ name: 'exchange', rotated: 'counterclockwise' }} />
            </div>
        </Text>
    )

    handleAmountReceivedChange = deferred(async (_, values) => {
        const amountReceived = values[this.names.amountReceived]
        const currencyReceived = values[this.names.currencyReceived]
        const from = values[this.names.from]
        const to = values[this.names.to]
        const valid = isValidNumber(amountReceived)
        const identity = getIdentity(from)
        const { inputs, submitDisabled } = this.state
        const amountIn = findInput(inputs, this.names.amountReceived)
        const amountGroupIn = findInput(inputs, this.names.amountReceivedGroup)
        const amountSentIn = findInput(inputs, this.names.amountSent)
        const txFeeIn = findInput(inputs, this.names.txFee)
        amountIn.invalid = false
        amountIn.loading = valid
        amountIn.message = null
        submitDisabled.loadingAmount = valid
        amountGroupIn.message = null
        this.setState({ inputs, submitDisabled })
        if (!valid) return

        const res = await convertTo(
            amountReceived,
            currencyReceived,
            currencyDefault,
        )
        this.amountRounded = eval(res[1] || '') || 0
        const resAmountSent = await convertTo(
            this.amountRounded,
            currencyDefault,
            rxSelectedCurrency.value,
        )
        const { api } = await getConnection()
        const [balance, locks] = await query(api.queryMulti, [[
            [api.query.balances.freeBalance, from],
            [api.query.balances.locks, from]
        ]])
        const freeBalance = balance - locks.reduce((sum, x) => sum + x.amount, 0)
        try {
            const tx = await api.tx.transfer.networkCurrency(
                to || from,
                this.amountRounded,
                randomHex(from)
            )
            this.fee = await getTxFee(
                api,
                from,
                tx,
                identity.uri,
            )
        } catch (err) {
            const content = `${err}`.includes(`'payment_amount':: Assertion failed`)
                ? textsCap.amountTooLarge
                : `${err}`
            amountIn.invalid = true
            amountIn.loading = false
            amountIn.message = {
                content,
                status: statuses.ERROR,
            }
            return this.setState({inputs})
        }
        txFeeIn.content = this.getTxFeeEl(this.fee)
        const total = this.fee + this.amountRounded
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
    }, 300)

    handleAmountReceivedInvalid = deferred(() => {
        const { inputs } = this.state
        const amountReceivedIn = findInput(inputs, this.names.amountReceived)
        const amountReceivedGrpIn = findInput(inputs, this.names.amountReceivedGroup)
        const amountSentIn = findInput(inputs, this.names.amountSent)
        amountSentIn.rxValue.next('')
        amountReceivedIn.icon = 'money'
        amountReceivedGrpIn.message = null
        this.setState({ inputs })
    }, 100)

    handleCurrencyReceivedChange = deferred(async (_, values) => {
        const { inputs } = this.state
        const amountReceived = values[this.names.amountReceived]
        const currencyReceived = values[this.names.currencyReceived]
        const amountReceivedIn = findInput(inputs, this.names.amountReceived)
        const currencies = await subjectAsPromise(this.rxCurrencies, x => isArr(x) && x)[0]
        const currencyObj = currencies.find(x => x.currency === currencyReceived) || {}
        amountReceivedIn.decimals = parseInt(currencyObj.decimals || '') || 0
        this.setState({ inputs })

        if (!isValidNumber(amountReceived)) return

        this.handleAmountReceivedChange(_, values)      
    }, 500)

    handleSubmit = (_, values) => {
        const amountReceived = values[this.names.amountReceived]
        const currencyReceived = values[this.names.currencyReceived]
        const from = values[this.names.from]
        const to = values[this.names.to]
        const toSelf = getIdentity(to)
        const userId = !toSelf && (getPartner(to) || {}).userId
        const description = [
            `${textsCap.sender}: ${getIdentity(from).name}`,
            `${textsCap.recipient}: ${getAddressName(to)}`,
            `${textsCap.amount}: ${amountReceived} ${currencyReceived}`,
        ]
        const queueProps = queueables.balanceTransfer(
            from,
            to,
            this.amountRounded,
            {
                description: description.join('\n'),
                title: textsCap.queueTitle,
                next: !userId ? null : {
                    args: [
                        [userId],
                        TRANSFER_TYPE,
                        null,
                        'transfered funds',
                        {
                            addressFrom: from,
                            addressTo: to,
                            amount: this.amountRounded,
                        },
                    ],
                    func: 'notify',
                    silent: true,
                    type: QUEUE_TYPES.CHATCLIENT,
                },
                then: (success, resultOrError) => {
                    if (!success) return this.setPostSubmitMessage(resultOrError)
                    this.setPostSubmitMessage(null, resultOrError, description)
                    this.clearForm()
                },
            },
        )

        confirm({
            onConfirm: () => this.setPostSubmitMessage()
                | addToQueue(queueProps),
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

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
TransferForm.propTypes = {
    values: PropTypes.shape({
        amount: PropTypes.number,
        from: PropTypes.string,
        to: PropTypes.string,
        currency: PropTypes.string,
    })
}
TransferForm.defaultProps = {
    inputsDisabled: ['from'],
    header: textsCap.queueTitle,
    size: 'tiny',
    submitText: textsCap.send,
}
const FromInputLabel = ({ rxAddress, rxCurrencyReceived, rxCurrencySent }) => {
    const [address] = useRxSubject(rxAddress)
    const [currencyReceived] = useRxSubject(rxCurrencyReceived)
    const [currencySent = currencyReceived] = useRxSubject(rxCurrencySent)
    const dualBalance = currencyReceived !== currencySent
    const key = `${dualBalance}${address}${currencyReceived}${currencySent}`
    return (
        <span>
            {textsCap.payerIdentity}
            {' ('}
            <Balance {...{
                address,
                El: 'a',
                detailsPrefix: <span><Icon className='no-margin' name='eye slash' /> </span>,
                emptyMessage: textsCap.loadingBalance + '...',
                key,
                prefix: (
                    <span>
                        <Icon className='no-margin' name='eye' />
                        {' ' + textsCap.availableBalance + ': '}
                    </span>
                ),
                showDetailed: true,
                suffix: !dualBalance ? undefined : (
                    <Balance {...{
                        address,
                        key,
                        prefix: ' | ',
                        showDetailed: null,
                        // suffix: icon,
                        unitDisplayed: currencyReceived,
                    }} />
                ),
                unitDisplayed: currencySent,
            }} />
            {')'}
        </span>
    )
}

// set transfer notificaton item view handler
setItemViewHandler(
    TRANSFER_TYPE,
    null,
    (id, notification = {}, { senderId, senderIdBtn }) => {
        const { data = {} } = notification
        const { addressFrom, addressTo, amount } = data
        const identity = getIdentity(addressTo)
        if (!identity || !isValidNumber(amount)) return removeNotif(id)

        return {
            icon: 'money bill alternate outline',
            content: (
                <div>
                    {senderIdBtn} {textsCap.transferedFunds}
                    <Currency {...{
                        EL: 'div',
                        prefix: <b>{textsCap.amount}: </b>,
                        value: amount,
                    }} />
                    <div>
                        <b>{textsCap.payerIdentity}: </b>
                        <AddPartnerBtn {...{
                            address: addressFrom,
                            userId: senderId,
                        }} />
                    </div>
                    <div>
                        <b>{textsCap.yourIdentity}: </b>
                        {identity.name}
                    </div>
                </div>
            ),
        }
    },
)