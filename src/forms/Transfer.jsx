import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Dropdown } from 'semantic-ui-react'
import { Bond } from 'oo7'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import Balance from '../components/Balance'
import { arrSort, isStr, textEllipsis } from '../utils/utils'
import { ss58Decode } from '../utils/convert'
import PartnerForm from '../forms/Partner'
// services
import { denominations } from '../services/blockchain'
import identities from '../services/identity'
import { translated } from '../services/language'
import { showForm } from '../services/modal'
import partners from '../services/partner'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { currencyDefault } from '../services/currency'

const wordsCap = translated({
    amount: 'amount',
    balance: 'balance',
    identity: 'identity',
    partner: 'partner',
    recipient: 'recipient',
    status: 'status',
}, true)[1]
const texts = translated({
    amountPlaceholder: 'Enter a value',
    loadingBalance: 'Loading account balance',
    partnerEmptyMsg1: 'You do not have any partner yet. Add one in the Partner Module',
    partnerEmptyMsg2: 'No match found. Enter a valid address to add as a partner.',
    partnerPlaceholder: 'Select a Partner',
    submitErrorHeader: 'Transfer error',
    submitInprogressHeader: 'Transfer in-progress',
    submitSuccessHeader: 'Transfer successful',
    txFee: 'Transaction fee',
})[0]

export default class Transfer extends Component {
    constructor(props) {
        super(props)

        const primary = 'Transactions' //getConfig().primary
        this.state = {
            denomination: primary,
            message: undefined,
            onSubmit: this.handleSubmit,
            success: false,
            inputs: [
                {
                    bond: new Bond(),
                    label: wordsCap.identity,
                    name: 'from',
                    options: [],
                    required: true,
                    search: ['text', 'value'],
                    selection: true,
                    type: 'dropdown',
                    value: '',
                },
                {
                    additionLabel: 'Add partner: ',
                    allowAdditions: false,
                    bond: new Bond(),
                    clearable: true,
                    label: wordsCap.partner,
                    name: 'to',
                    noResultsMessage: texts.partnerEmptyMsg1,
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
                        toIn.noResultsMessage = !valid && q.length > 0 ? texts.partnerEmptyMsg2 : texts.partnerEmptyMsg1
                        this.setState({ inputs })
                    },
                    options: [],
                    placeholder: texts.partnerPlaceholder,
                    required: true,
                    search: ['text', 'value'],
                    selection: true,
                    selectOnBlur: false,
                    selectOnNavigation: false,
                    type: 'dropdown',
                },
                {
                    inlineLabel: (
                        <Dropdown
                            basic
                            className='no-margin'
                            defaultValue={primary}
                            disabled={true}
                            onChange={(_, { value: denomination }) => {
                                const { inputs } = this.state
                                findInput(inputs, 'amount').min = this.getAmountMin(denomination)
                                this.setState({ denomination, inputs })
                            }}
                            options={[{ key: 0, text: primary, value: primary }]}
                        // options={Object.keys(denominations).map(key => ({ key, text: key, value: key }))}
                        />
                    ),
                    label: wordsCap.amount,
                    labelPosition: 'right', //inline label position
                    min: this.getAmountMin(primary),
                    name: 'amount',
                    placeholder: texts.amountPlaceholder,
                    required: true,
                    type: 'number',
                    useInput: true,
                    value: '',
                }
            ],
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        const { inputs } = this.state
        const { values } = this.props
        const fromIn = findInput(inputs, 'from')
        // change value when selected address changes
        this.tieIdSelected = identities.selectedAddressBond.tie(address => {
            fromIn.bond.changed(address)
            fromIn.message = !address ? '' : {
                content: (
                    [
                        <Balance {...{
                            address,
                            emptyMessage: texts.loadingBalance + '...',
                            key: 'XTX',
                            prefix: `${wordsCap.balance}: `,
                            unitDisplayed: currencyDefault,
                        }} />,
                        <Balance {...{
                            address,
                            emptyMessage: null,
                            key: 'selected',
                            prefix: ' | ',
                        }} />
                    ]
                )
            }
        })
        // re-/populate options if identity list changes
        this.tieIdIdentity = identities.bond.tie(() => {
            fromIn.options = arrSort(identities.getAll().map(({ address, name }) => ({
                key: address,
                text: name,
                value: address,
            })), 'text')
            this.setState({ inputs })
        })
        // repopulate options if partners list changes
        this.tieIdPartner = partners.bond.tie(() => {
            findInput(inputs, 'to').options = arrSort(
                Array.from(partners.getAll()).map(([_, { address, name }]) => ({
                    description: textEllipsis(address, 20),
                    key: address,
                    text: name,
                    value: address,
                })),
                'text'
            )
            this.setState({ inputs })
        })

        fillValues(inputs, values)
    }

    componentWillUnmount() {
        this._mounted = false
        identities.bond.untie(this.tieIdIdentity)
        identities.selectedAddressBond.untie(this.tieIdSelected)
        partners.bond.untie(this.tieIdPartner)
    }

    clearForm = () => {
        const { inputs } = this.state
        fillValues(inputs, { to: null, amount: '' }, true)
        this.setState({ inputs })
    }

    handleSubmit = (_, { amount, from, to }) => {
        const { denomination } = this.state
        const { name } = partners.get(to)
        // amount in transactions
        const amountXTX = amount * Math.pow(10, denominations[denomination])
        this.setMessage()

        addToQueue({
            type: QUEUE_TYPES.TX_TRANSFER,
            args: [to, amount],
            address: from,
            then: (success, resultOrError) => {
                if (!success) return this.setMessage(resultOrError)
                this.setMessage(null, resultOrError, name, amountXTX)
                this.clearForm()
            }
        })
    }

    // returns the min value acceptable for the selected denomination
    getAmountMin = denomination => {
        const n = denominations[denomination] || 0
        return Math.pow(10, -n).toFixed(n)
    }

    setMessage = (err, result = [], recipientName, amount) => {
        const [hash] = result
        const inProgress = !err && !hash
        const { denomination } = this.state
        const content = inProgress ? '' : (!err || isStr(err) ? err : err.message) || (
            <ul style={{ listStyleType: 'none', margin: 0, paddingLeft: 0 }}>
                <li>{wordsCap.recipient}: {recipientName}</li>
                <li>{wordsCap.amount}: {amount} {denomination}</li>
                <li>{texts.txFee}: {}</li>
            </ul>
        )
        const header = inProgress ? texts.submitInprogressHeader : (
            err ? texts.submitErrorHeader : texts.submitSuccessHeader
        )
        const status = inProgress ? 'loading' : (err ? 'error' : 'success')
        this.setState({
            loading: inProgress,
            message: {
                content,
                header,
                showIcon: true,
                status
            },
            submitDisabled: inProgress,
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}

Transfer.propTypes = {
    values: PropTypes.shape({
        amount: PropTypes.number,
        from: PropTypes.string,
        to: PropTypes.string,
    })
}
Transfer.defaultProps = {
    inputsDisabled: ['from']
}