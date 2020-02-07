import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Dropdown } from 'semantic-ui-react'
import { Bond } from 'oo7'
import { runtime } from 'oo7-substrate'
import { Pretty } from '../components/Pretty'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import PartnerForm from '../forms/Partner'
import { getConfig, denominations } from '../services/blockchain'
import identities from '../services/identity'
import { translated } from '../services/language'
import { showForm } from '../services/modal'
import partners from '../services/partner'
import { arrSort, isStr, textEllipsis } from '../utils/utils'
import { ss58Decode } from '../utils/convert'
import { connect, getDefaultConfig, transfer } from '../utils/polkadotHelper'

const [words, wordsCap] = translated({
    amount: 'amount',
    identity: 'identity',
    partner: 'partner',
    recipient: 'recipient',
    status: 'status',
}, true)
const [texts] = translated({
    amountPlaceholder: 'Enter a value',
    partnerEmptyMsg1: 'You do not have any partner yet. Add one in the Partner Module',
    partnerEmptyMsg2: 'No match found. Enter a valid address to add as a partner.',
    partnerPlaceholder: 'Select a Partner',
    submitErrorHeader: 'Transfer error',
    submitInprogressHeader: 'Transfer in-progress',
    submitSuccessHeader: 'Transfer successful',
})
const connection = {}

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
                    value: identities.getSelected().address,
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
    }

    componentWillMount() {
        const { inputs } = this.state
        const { disabledFields, values } = this.props
        const fromIn = findInput(inputs, 'from')
        // change value when selected address changes
        this.tieIdSelected = identities.selectedAddressBond.tie(() => {
            fromIn.bond.changed(identities.getSelected().address)
        })
        // repopulate options if identity list changes
        this.tieIdIdentity = identities.bond.tie(() => {
            fromIn.options = arrSort(identities.getAll().map(({ address, name }) => ({
                description: <Pretty value={runtime.balances.balance(ss58Decode(address))} />,
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

        // disable inputs
        disabledFields && disabledFields.forEach(name => (findInput(inputs, name) || {}).disabled = true)

        fillValues(inputs, values)

        if (connection.api) return
        const config = getDefaultConfig()
        this.setState({ loading: true })
        console.log('TransferForm: connecting using Polkadot')
        connect(config.nodes[0], config.types, false).then(({ api, provider }) => {
            this.setState({ loading: false })
            connection.api = api
            connection.provider = provider
            console.log('TransferForm: connected using Polkadot', { api, provider })
        })
    }

    componentWillUnmount() {
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
        const { uri } = identities.get(from)
        const { name } = partners.get(to)
        // amount in transactions
        const amountTransations = amount * Math.pow(10, denominations[denomination])
        this.setMessage()
        transfer(to, amountTransations, uri, null, connection.api).then(
            hash => this.setMessage(null, hash, name, amountTransations) | this.clearForm(),
            err => this.setMessage(err),
        )
    }

    // returns the min value acceptable for the selected denomination
    getAmountMin = denomination => {
        const n = denominations[denomination] || 0
        return Math.pow(10, -n).toFixed(n)
    }

    setMessage = (err, hash, recipientName, amount) => {
        const inProgress = !err && !hash
        const { denomination } = this.state
        const content = inProgress ? '' : (!err || isStr(err) ? err : err.message) || (
            <ul style={{ listStyleType: 'none', margin: 0, paddingLeft: 0 }}>
                <li>{wordsCap.recipient}: {recipientName}</li>
                <li>{wordsCap.amount}: {amount} {denomination}</li>
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
    // array of input names to be disabled
    disabledFields: PropTypes.array,
    values: PropTypes.shape({
        amount: PropTypes.number,
        from: PropTypes.string,
        to: PropTypes.string,
    })
}
Transfer.defaultProps = {
    disabledFields: ['from']
}