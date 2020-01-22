import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Dropdown } from 'semantic-ui-react'
import { Bond } from 'oo7'
import { runtime } from 'oo7-substrate'
import { Pretty } from '../Pretty'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import PartnerForm from '../forms/Partner'
import { config, denominations } from '../services/blockchain'
import identities from '../services/identity'
import { showForm } from '../services/modal'
import partners from '../services/partners'
import { arrSort, isStr, textCapitalize, textEllipsis } from '../utils/utils'
import { ss58Decode } from '../utils/convert'
import { transfer } from '../utils/polkadotHelper'

const words = {
    amount: 'amount',
    identity: 'identity',
    partner: 'partner',
    status: 'status',
}
const wordsCap = textCapitalize(words)
const texts = {
    amountPlaceholder: 'Enter a number',
    partnerEmptyMsg1: 'No partner available. Enter an address to add as partner.',
    partnerEmptyMsg2: 'No match found. Enter a valid address to add as partner.',
    partnerPlaceholder: 'Select partner',
    submitErrorHeader: 'Transaction error',
    submitInprogressHeader: 'Transaction in-progress',
    submitSuccessContent: 'Transfer complete',
    submitSuccessHeader: 'Transaction successful',
}

export default class Transfer extends Component {
    constructor(props) {
        super(props)

        this.state = {
            denomination: config.primary,
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
                    bond: new Bond(),
                    inlineLabel: (
                        <Dropdown
                            basic
                            className='no-margin'
                            defaultValue={config.primary}
                            onChange={(_, { value }) => this.setState({ denomination: value })}
                            options={Object.keys(denominations).map(key => ({ key, value: key, text: key }))}
                        />
                    ),
                    label: wordsCap.amount,
                    labelPosition: 'right', //inline label position
                    min: 0,
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
    }

    componentWillUnmount() {
        identities.bond.untie(this.tieIdIdentity)
        identities.selectedAddressBond.untie(this.tieIdSelected)
        partners.bond.untie(this.tieIdPartner)
    }

    handleSubmit = (_, { amount, from, to }) => {
        const { denomination } = this.state
        const { uri } = identities.get(from)
        amount = amount * Math.pow(10, denominations[denomination])

        this.setMessage()
        transfer(to, amount, uri).then(
            hash => this.setMessage(null, hash),
            err => this.setMessage(err),
        )
    }

    setMessage = (err, hash) => {
        const inProgress = !err && !hash
        const content = inProgress ? '' : (!err || isStr(err) ? err : err.message) || (
            <p> {texts.submitSuccessContent}</p>
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

    render() {
        return <FormBuilder {...{ ...this.props, ...this.state }} />
    }
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