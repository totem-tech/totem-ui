import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import FormBuilder, {
    findInput,
    fillValues,
} from '../../components/FormBuilder'
import Text from '../../components/Text'

import {
    getConnection,
    queueables,
    randomHex,
} from '../../services/blockchain'
import { confirm, showForm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'

import { ss58Decode } from '../../utils/convert'
import { translated } from '../../utils/languageHelper'
import { getTxFee } from '../../utils/polkadotHelper'
import {
    copyRxSubject,
    statuses,
    subjectAsPromise,
    useRxSubject,
} from '../../utils/reactjs'
import {
    deferred,
    isArr,
    isValidNumber,
} from '../../utils/utils'
import Currency from '../currency/Currency'
import {
    convertTo,
    currencyDefault,
    rxSelected as rxSelectedCurrency,
} from '../currency/currency'
import { asInlineLabel } from '../currency/CurrencyDropdown'
import { remove as removeNotif, setItemViewHandler } from '../notification/notification'
import AddressName from '../partner/AddressName'
import getPartnerOptions from '../partner/getPartnerOptions'
import {
    get as getPartner,
    getAddressName,
    rxPartners,
} from '../partner/partner'
import PartnerForm from '../partner/PartnerForm'
import Balance, { rxBalances } from './Balance'
import { getIdentityOptions } from './getIdentityOptions'
import {
    get as getIdentity,
    rxIdentities,
    rxSelected,
} from './identity'
import IdentityIcon from './IdentityIcon'

const textsCap = {
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
}
translated(textsCap, true)
// notification type
const TRANSFER_TYPE = 'transfer'

export const inputNames = {
    amountReceived: 'amountReceived',
    amountSent: 'amountSent',
    currencyReceived: 'currencyReceived',
    currencySent: 'currencySent',
    from: 'from',
    to: 'to',
    txFee: 'txFeeHTML'
}

export default class TransferFundsForm extends Component {
    constructor(props) {
        super(props)

        const { values = {} } = props
        this.names = inputNames
        this.rxAddress = copyRxSubject(rxSelected)
        this.rxCurrencies = new BehaviorSubject()
        this.rxCurrencyReceived = new BehaviorSubject(rxSelectedCurrency.value)
        this.rxCurrencySent = copyRxSubject(rxSelectedCurrency)
        this.rxCurrencyOptions = new BehaviorSubject([])
        this.rxPartners = copyRxSubject(rxPartners)
        const inputs = [
            {
                label: (
                    <FromInputLabel {...{
                        rxAddress: this.rxAddress,
                        rxCurrencyReceived: this.rxCurrencyReceived,
                        rxCurrencySent: this.rxCurrencySent,
                    }} />
                ),
                name: this.names.from,
                onChange: (...args) => {
                    this.handleCurrencyChange(...args)
                    // trigger partner options update
                    this.rxPartners.next(this.rxPartners.value)
                },
                options: [],
                rxOptions: rxIdentities,
                rxOptionsModifier: getIdentityOptions,
                required: true,
                rxValue: this.rxAddress,
                search: ['keywords'],
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
                    toIn.allowAdditions = valid
                        && !rxIdentities.value.get(q)
                        && !rxPartners.value.get(q)
                    toIn.noResultsMessage = !valid && q.length > 0
                        ? textsCap.partnerEmptyMsg2
                        : textsCap.partnerEmptyMsg1
                    this.setState({ inputs })
                },
                options: [],
                placeholder: textsCap.partnerPlaceholder,
                rxOptions: this.rxPartners,
                rxOptionsModifier: partners => getPartnerOptions(partners, {}, true)
                    .filter(x => x.value !== this.rxAddress.value),
                required: true,
                rxValue: new BehaviorSubject(),
                search: ['keywords'],
                selection: true,
                selectOnBlur: false,
                selectOnNavigation: false,
                type: 'dropdown',
            },
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
                onChange: this.handleCurrencyChange,
                rxValue: this.rxCurrencySent,
            },
            {
                content: this.getTxFeeEl(),
                name: this.names.txFee,
                type: 'html',
            },
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
                onChange: this.handleCurrencyChange,
                rxValue: this.rxCurrencyReceived,
            },
        ]
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
            values,
            inputs: fillValues(inputs, values),
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount = () => this._mounted = true

    componentWillUnmount = () => this._mounted = false

    clearForm = () => {
        const { inputs } = this.state
        const toIn = findInput(inputs, this.names.to)
        const amtIn = findInput(inputs, this.names.amountReceived)
        toIn.rxValue.next('')
        amtIn.rxValue.next('')
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
        const currencySent = values[this.names.currencySent]
        const from = values[this.names.from]
        const to = values[this.names.to]
        const valid = isValidNumber(amountReceived)
        const identity = getIdentity(from)
        const { inputs, submitDisabled } = this.state
        const amountIn = findInput(inputs, this.names.amountReceived)
        const amountSentIn = findInput(inputs, this.names.amountSent)
        const txFeeIn = findInput(inputs, this.names.txFee)
        amountIn.invalid = false
        amountIn.loading = valid
        amountIn.message = null
        submitDisabled.loadingAmount = valid
        amountIn.message = null
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
            currencySent,
        )
        const { api } = await getConnection()
        // wait until balance for this identity is fetched
        const balances = await subjectAsPromise(rxBalances, balances => isValidNumber(balances.get(from)))[0]
        const freeBalance = balances.get(from)
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
            return this.setState({ inputs })
        }
        txFeeIn.content = this.getTxFeeEl(this.fee)
        const total = this.fee + this.amountRounded
        const gotFund = freeBalance - total > 0
        submitDisabled.loadingAmount = false
        amountIn.invalid = !gotFund
        amountIn.loading = false
        amountIn.icon = gotFund ? 'check' : 'exclamation circle'
        amountIn.iconPosition = 'left'
        amountIn.message = gotFund ? null : {
            content: textsCap.insufficientBalance,
            status: 'error',
        }

        amountSentIn.rxValue.next(Number(resAmountSent[1]))
        this.setState({ inputs, submitDisabled })
    }, 300)

    handleAmountReceivedInvalid = deferred(() => {
        const { inputs } = this.state
        const amountReceivedIn = findInput(inputs, this.names.amountReceived)
        const amountSentIn = findInput(inputs, this.names.amountSent)
        amountSentIn.rxValue.next('')
        amountReceivedIn.icon = 'money'
        amountReceivedIn.message = null
        this.setState({ inputs })
    }, 100)

    handleCurrencyChange = deferred(async (_, values) => {
        const { inputs } = this.state
        const amountReceived = values[this.names.amountReceived]
        const currencyReceived = values[this.names.currencyReceived]
        const amountReceivedIn = findInput(inputs, this.names.amountReceived)
        const currencies = await subjectAsPromise(this.rxCurrencies, isArr)[0]
        const currencyObj = currencies.find(x => x.currency === currencyReceived) || {}
        amountReceivedIn.decimals = parseInt(currencyObj.decimals || '') || 0
        this.setState({ inputs })

        if (!isValidNumber(amountReceived)) return

        amountReceivedIn.rxValue.next('')
        amountReceivedIn.rxValue.next(amountReceived)

    }, 300)

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
                next: userId && {
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
            content = err
                ? `${err}`
                : description && (
                    <ul style={{ listStyleType: 'none', margin: 0, paddingLeft: 0 }}>
                        {description.map((content, i) => <li key={i}>{content}</li>)}
                    </ul>
                )
            header = err
                ? textsCap.submitErrorHeader
                : textsCap.submitSuccessHeader
            status = err
                ? 'error'
                : 'success'
        }
        // submitDisabled.submission = submitInProgress
        this.setState({
            message: {
                content,
                header,
                icon: true,
                status,
            },
            submitDisabled,
            submitInProgress,
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
TransferFundsForm.propTypes = {
    values: PropTypes.shape({
        amount: PropTypes.number,
        from: PropTypes.string,
        to: PropTypes.string,
        currency: PropTypes.string,
    })
}
TransferFundsForm.defaultProps = {
    inputsDisabled: [inputNames.from],
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
                detailsPrefix: (
                    <span>
                        <Icon className='no-margin' name='eye slash' />{' '}
                    </span>
                ),
                emptyMessage: textsCap.loadingBalance + '...',
                key,
                prefix: (
                    <span>
                        <Icon className='no-margin' name='eye' />
                        {' ' + textsCap.availableBalance + ': '}
                    </span>
                ),
                suffix: !dualBalance
                    ? undefined
                    : (
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
// ToDo: move to notificationHandlers.js
setItemViewHandler(
    TRANSFER_TYPE,
    null,
    (id, notification = {}, { senderId, senderIdBtn }) => {
        const { data = {} } = notification
        const {
            addressFrom,
            addressTo,
            amount,
        } = data
        const identity = getIdentity(addressTo)
        if (!identity || !isValidNumber(amount)) return removeNotif(id)

        const { address, name, usageType } = identity

        return {
            icon: 'money bill alternate outline',
            content: (
                <div>
                    {senderIdBtn} {textsCap.transferedFunds.toLowerCase()}
                    <Currency {...{
                        EL: 'div',
                        prefix: <b>{textsCap.amount}: </b>,
                        value: amount,
                    }} />
                    <div>
                        <b>{textsCap.payerIdentity}: </b>
                        <AddressName {...{
                            address: addressFrom,
                            userId: senderId,
                        }} />
                    </div>
                    <div>
                        <b>{textsCap.yourIdentity}: </b>
                        <IdentityIcon {...{ address, usageType }} />
                        {' ' + name}
                    </div>
                </div>
            ),
        }
    },
)