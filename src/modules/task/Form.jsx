import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import FormBuilder, { findInput } from '../../components/FormBuilder'
// services
import { 
    convertTo,
    currencyDefault,
    getTickers,
    getSelected as getSelectedCurrency
} from '../../services/currency'
import { bond, get as getIdentity, getSelected } from '../../services/identity'
import { translated } from '../../services/language'
import partners from '../../services/partner'
import { arrSort, deferred } from '../../utils/utils'
import { getConnection } from '../../services/blockchain'

const [texts, textsCap] = translated({
    advancedLabel: 'advanced options',
    amountXTXMgs: 'amount to be changed',
    assignee: 'select a partner to assign task',
    assigneePlaceholder: 'select from partner list',
    assignToPartner: 'assign to a partner',
    assigneeTypeConflict: 'task relationship type and parter type must be the same',
    balance: 'balance',
    bountyLabel: 'bounty amount',
    bountyPlaceholder: 'enter bounty amount',
    business: 'business',
    buyLabel: 'task type',
    buyOptionLabelBuy: 'buying',
    buyOptionLabelSell: 'selling',
    conversionErrorHeader: 'currency conversion failed',
    currency: 'currency',
    description: 'detailed description',
    descriptionPlaceholder: 'enter more details about the task',
    formHeader: 'create a new task',
    goods: 'goods',
    insufficientBalance: 'insufficient balance',
    inventory: 'inventory',
    marketplace: 'marketplace',
    myself: 'myself',
    personal: 'personal',
    publishToMarketPlace: 'publish to marketplace',
    services:'services',
    tags: 'categorise with tags',
    tagsNoResultMsg: 'type tag and press ENTER to add',
    taskType: 'task relationship',
    title: 'task title',
    titlePlaceholder: 'enter a very short task description',
    orderTypeLabel: 'order type',
}, true)

export default class Form extends Component {
    constructor(props) {
        super(props)

        // list of input names
        this.names = Object.freeze({
            advancedGroup: 'advancedGroup',
            assignee: 'assignee',
            bounty: 'bounty',
            bountyGroup: 'bountyGroup',
            business: 'business',
            buy: 'buy',
            currency: 'currency',
            description: 'description',
            orderType: 'orderType',
            publish: 'publish',
            tags: 'tags',
            title: 'title',
        })

        this.state = {
            onChange: (_, values) => this.setState({ values }),
            onSubmit: this.handleSubmit,
            values: {},
            inputs: [
                {
                    label: textsCap.title,
                    max: 160,
                    min: 3,
                    name: this.names.title,
                    placeholder: textsCap.titlePlaceholder,
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    name: this.names.bountyGroup,
                    type: 'group',
                    unstackable: true,
                    inputs: [
                        {
                            bond: new Bond(),
                            label: textsCap.bountyLabel,
                            // inlineLabel: null,
                            // labelPosition: 'right',
                            min: 0, // allows bounty-free tasks
                            name: this.names.bounty,
                            onChange: this.handleBountyChange,
                            placeholder: textsCap.bountyPlaceholder,
                            required: true,
                            type: 'number',
                            useInput: true,
                            value: 0,
                            width: 12,
                        },
                        {
                            label: textsCap.currency,
                            name: this.names.currency,
                            onChange: this.handleBountyChange,
                            options: [],
                            search: true,
                            selection: true,
                            style:{
                                minWidth: 0, // fixes overflow issue
                                marginBottom: 0, // removes margin on popup open
                            },
                            type: 'dropdown',
                            width: 4,
                            value: getSelectedCurrency(),
                        },                        
                    ]
                },
                {
                    inline: true,
                    label: textsCap.marketplace,
                    multiple: false,
                    name: this.names.publish,
                    onChange: this.handlePublishChange,
                    options: [
                        { label: textsCap.assignToPartner, value: 'no' },
                        { label: textsCap.publishToMarketPlace, value: 'yes' },
                    ],
                    radio: true,
                    required: true,
                    type: 'checkbox-group',
                    value: 'no',
                },
                {
                    bond: new Bond(),
                    hidden:  (values, i) => values[this.names.publish] === 'yes',
                    label: textsCap.assignee,
                    name: this.names.assignee,
                    options: [],
                    placeholder: textsCap.assigneePlaceholder,
                    required: true,
                    selection: true,
                    search: true,
                    type: 'dropdown',
                    validate: (_, { value }) => {
                        if (getIdentity(value)) return
                        const { values } = this.state
                        const isBusiness = values[this.names.business] === 'yes'
                        const assigneeIsBusiness = partners.get(value).type === 'business'
                        return isBusiness === assigneeIsBusiness ? null : textsCap.assigneeTypeConflict
                    }
                },
                // Advanced section (Form type "group" with accordion)
                {
                    accordion: {
                        collapsed: true,
                        styled: true, // enable/disable the boxed layout
                    },
                    icon: 'pen',
                    inline: false,
                    label: textsCap.advancedLabel,
                    name: this.names.advancedGroup,
                    type: 'group',
                    styleContainer: {width: '100%'},
                    grouped: true,
                    inputs: [
                        // Everything is now assumed to be B2B for accounting purposes
                        // {
                        //     bond: new Bond(),
                        //     inline: true,
                        //     label: textsCap.taskType,
                        //     name: this.names.business,
                        //     options: [
                        //         { label: textsCap.business, value: 'yes' },
                        //         { label: textsCap.personal, value: 'no' },
                        //     ],
                        //     radio: true,
                        //     required: true,
                        //     type: 'checkbox-group',
                        // },
                        {
                            hidden: true,  // only show if this is a purchase order
                            inline: true,
                            label: textsCap.buyLabel,
                            name: this.names.buy,
                            options: [
                                { label: textsCap.buyOptionLabelBuy, value: 'yes' },
                                { label: textsCap.buyOptionLabelSell, value: 'no' },
                            ],
                            radio: true,
                            type: 'checkbox-group',
                            value: 'yes',
                        },
                        {
                            hidden: true, // only show if this is a purchase order
                            inline: true,
                            label: textsCap.orderTypeLabel,
                            name: this.names.orderType,
                            options: [
                                { label: textsCap.goods, value: 'goods' },
                                { label: textsCap.services, value: 'services' },
                                { label: textsCap.inventory, value: 'inventory' },
                            ],
                            radio: true,
                            type: 'checkbox-group',
                            value: 'services',
                        },
                        {
                            label: textsCap.description,
                            max: 500,
                            min: 3,
                            name: this.names.description,
                            placeholder: textsCap.descriptionPlaceholder,
                            required: false,
                            type: 'textarea',
                            value: '',
                        },
                        {
                            allowAdditions: true,
                            label: textsCap.tags,
                            multiple: true,
                            name: this.names.tags,
                            noResultsMessage: textsCap.tagsNoResultMsg,
                            onAddItem: (_, { value }) => {
                                const {inputs} = this.state
                                const tagsIn = findInput(inputs, this.names.tags)
                                value = value.toLowerCase()
                                // option already exists
                                if (tagsIn.options.find(x => x.value === value)) return
                                tagsIn.options = arrSort([...tagsIn.options, {
                                    key: value,
                                    text: value,
                                    value,
                                }], 'text')
                                this.setState({inputs})
                            },
                            options: [],
                            selection: true,
                            search: true,
                            type: 'dropdown',
                        },
                    ],
                },
            ]
        }
		this.originalSetState = this.setState
		this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        // connect to blockchain beforehand to speed up currency convertion
        getConnection().then(({api}) => this.api = api)

        this.bond = Bond.all([bond, partners.bond])
        this.tieId = this.bond.tie(() => {
            const {inputs} = this.state
            const assigneeIn = findInput(inputs, this.names.assignee)
            const selected = getSelected()
            const options = Array.from(partners.getAll())
                .map(([address, {name, userId}]) => !userId ? null : {
                    description: userId,
                    key: address,
                    text: name,
                    value: address,
                })
                .filter(Boolean)
            if (!options.find(x => x.address === selected.address )) {
                options.push(({
                    description: texts.myself,
                    key: selected.address,
                    text: selected.name,
                    value: selected.address,
                }))
            }

            assigneeIn.options = arrSort(options, 'text')
            this.setState({inputs})
        })

        const { inputs } = this.state
        const currencyIn = findInput(inputs, this.names.currency)
        getTickers().then(currencies => {
            currencyIn.options = arrSort(Object.keys(currencies).map(value => ({
                key: value,
                text: value,
                title: currencies[value],
                value,
            })), 'text')
            currencyIn.deburr = true
            this.setState({ inputs })
        })
    }
    
    componentWillUnmount() {
        this._mounted = false
    }

    handleBountyChange = deferred(async (_, values) => {
        const { inputs } = this.state
        const bounty = values[this.names.bounty]
        const currency = values[this.names.currency]
        const bountyGrpIn = findInput(inputs, this.names.bountyGroup)
        const bountyIn = findInput(inputs, this.names.bounty)
        const requireConversion = bounty > 0 && currency !== currencyDefault
        if (!requireConversion) {
            bountyGrpIn.message = null
            bountyIn.invalid = false
            return this.setState({ inputs, submitDisabled: false })
        }
        bountyIn.loading = true
        this.setState({ submitDisabled: requireConversion })

        try {
            this.amountXTX = Math.ceil(await convertTo(bounty, currency,  currencyDefault))
            const { address } = getSelected()
            const balance = parseInt(await this.api.query.balances.freeBalance(address))
            const estimatedTxFee = 160
            const gotBalance = balance - estimatedTxFee - this.amountXTX >= 0
            bountyIn.loading = false
            bountyIn.invalid = !gotBalance
            bountyGrpIn.message = {
                content: (
                    <div>
                        {textsCap.amountXTXMgs}: {this.amountXTX + estimatedTxFee} {currencyDefault} <br />
                        {textsCap.balance}: {balance} {currencyDefault}
                    </div>
                ),
                header: !gotBalance ? textsCap.insufficientBalance : undefined,
                status: gotBalance ? 'success' : 'error',
            }
        } catch (e) {
            bountyGrpIn.message = {
                content: e,
                header: textsCap.conversionErrorHeader,
                status: 'error'
            }
        }
        this.setState({ inputs, submitDisabled: false })
    }, 300)

    handlePublishChange = (_, values) => {
        const {inputs} = this.state
        const publish = values[this.names.publish] === 'yes'
        const assigneeIn = findInput(inputs, this.names.assignee)
        assigneeIn.hidden = publish
        this.setState({inputs})
    }

    handleSubmit = (_, values) => {
        console.log({values})
    }

    // updateAmountXTX = deferred(async () => {

    // })

    render = () => <FormBuilder {...{...this.props, ...this.state}} />
}
Form.propTypes = {
    values: PropTypes.object,
}
Form.defaultProps = {
    header: textsCap.formHeader,
    subheader: '',
}