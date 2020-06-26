import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import Currency from '../../components/Currency'
import { arrSort, deferred, isObj } from '../../utils/utils'
// services
import { getConnection } from '../../services/blockchain'
import {
    convertTo,
    currencyDefault,
    getCurrencies,
    getSelected as getSelectedCurrency
} from '../../services/currency'
import { bond, getSelected } from '../../services/identity'
import { translated } from '../../services/language'
import partners from '../../services/partner'
import { BLOCK_DURATION_SECONDS } from '../../utils/time'
import { createTaskOrder, updateTaskOrder, PRODUCT_HASH_LABOUR } from './task'
import { addToQueue } from '../../services/queue'

const [texts, textsCap] = translated({
    addedToQueue: 'request added to queue',
    advancedLabel: 'advanced options',
    amountRequired: 'amount required',
    assignee: 'select a partner to assign task',
    assigneePlaceholder: 'select from partner list',
    assignToPartner: 'assign to a partner',
    balance: 'balance',
    bountyLabel: 'bounty amount',
    bountyPlaceholder: 'enter bounty amount',
    conversionErrorHeader: 'currency conversion failed',
    currency: 'currency',
    deadlineLabel: 'deadline',
    deadlineMinErrorMsg: 'deadline must be at least 48 hours from now',
    dueDateLabel: 'due date',
    dueDateMinErrorMsg: 'due date must be equal or after deadline',
    description: 'detailed description',
    descriptionPlaceholder: 'enter more details about the task',
    featureNotImplemented: 'This feature is yet to be implemented. Please stay tuned.',
    formHeader: 'create a new task',
    formHeaderUpdate: 'update task',
    goods: 'goods',
    insufficientBalance: 'insufficient balance',
    inventory: 'inventory',
    marketplace: 'marketplace',
    myself: 'myself',
    publishToMarketPlace: 'publish to marketplace',
    services: 'services',
    submitFailed: 'submission failed',
    tags: 'categorise with tags',
    tagsNoResultMsg: 'type tag and press ENTER to add',
    title: 'task title',
    titlePlaceholder: 'enter a very short task description',
    orderTypeLabel: 'order type',
}, true)
const estimatedTxFee = 140
const deadlineMinMS = 48 * 60 * 60 * 1000

export default class TaskForm extends Component {
    constructor(props) {
        super(props)

        const { values } = this.props
        // list of input names
        this.names = Object.freeze({
            advancedGroup: 'advancedGroup',
            assignee: 'assignee',
            bounty: 'bounty',
            bountyGroup: 'bountyGroup',
            currency: 'currency',
            deadline: 'deadline',
            dueDate: 'dueDate',
            description: 'description',
            orderType: 'orderType',
            publish: 'publish',
            isSell: 'isSell',
            tags: 'tags',
            title: 'title',
        })

        this.state = {
            header: !values || !values.hash ? textsCap.formHeader : textsCap.formHeaderUpdate,
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
                            style: {
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
                    // remove validation once implemented
                    validate: (_, { value }) => value === 'yes' && textsCap.featureNotImplemented,
                    value: 'no',
                },
                {
                    bond: new Bond(),
                    hidden: values => values[this.names.publish] === 'yes',
                    label: textsCap.assignee,
                    name: this.names.assignee,
                    options: [],
                    placeholder: textsCap.assigneePlaceholder,
                    required: true,
                    selection: true,
                    search: true,
                    type: 'dropdown',
                },
                {
                    // Advanced section (Form type "group" with accordion)
                    accordion: {
                        collapsed: true,
                        styled: true,
                    },
                    icon: 'pen',
                    inline: false,
                    label: textsCap.advancedLabel,
                    name: this.names.advancedGroup,
                    type: 'group',
                    // styleContainer: {width: '100%'},
                    grouped: true,
                    inputs: [
                        {
                            name: this.names.isSell,
                            type: 'hidden',
                            value: 0,// buy order
                        },
                        {
                            hidden: true, // only show if this is a purchase order
                            inline: true,
                            label: textsCap.orderTypeLabel,
                            name: this.names.orderType,
                            options: [
                                { label: textsCap.services, value: 0 },
                                { label: textsCap.inventory, value: 1 },
                                { label: textsCap.goods, value: 2 }, // assets
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
                                const { inputs } = this.state
                                const tagsIn = findInput(inputs, this.names.tags)
                                value = value.toLowerCase()
                                // option already exists
                                if (tagsIn.options.find(x => x.value === value)) return
                                tagsIn.options = arrSort([...tagsIn.options, {
                                    key: value,
                                    text: value,
                                    value,
                                }], 'text')
                                this.setState({ inputs })
                            },
                            options: [],
                            selection: true,
                            search: true,
                            type: 'dropdown',
                        },
                    ],
                },
                {
                    label: textsCap.deadlineLabel,
                    name: this.names.deadline,
                    onChange: (_, values) => {
                        const dueDate = values[this.names.dueDate]
                        if (!dueDate) return
                        const deadline = values[this.names.deadline]
                        const diffMS = new Date(dueDate) - new Date(deadline)
                        if (diffMS >= 0) return
                        const { inputs } = this.state
                        // due date is before deadline => reset as change is required
                        const dueDateIn = findInput(inputs, this.names.dueDate)
                        dueDateIn.bond.changed('')
                    },
                    type: 'datetime-local',
                    validate: (_, { value: deadline }) => {
                        if (!deadline) return
                        const diffMS = new Date(deadline) - new Date()
                        return diffMS < deadlineMinMS && textsCap.deadlineMinErrorMsg
                    },
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: textsCap.dueDateLabel,
                    name: this.names.dueDate,
                    type: 'datetime-local',
                    validate: (_, { value: dueDate }) => {
                        if (!dueDate) return
                        const { values } = this.state
                        const deadline = values[this.names.deadline]
                        const diffMS = new Date(dueDate) - new Date(deadline)
                        return diffMS < 0 && textsCap.dueDateMinErrorMsg
                    },
                    value: '',
                },
            ]
        }

        isObj(values) && fillValues(inputs, values)

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        this.bond = Bond.all([bond, partners.bond])
        this.tieId = this.bond.tie(() => {
            const { inputs } = this.state
            const assigneeIn = findInput(inputs, this.names.assignee)
            const selected = getSelected()
            const options = Array.from(partners.getAll())
                .map(([address, { name, userId }]) => !userId ? null : {
                    description: userId,
                    key: address,
                    text: name,
                    value: address,
                })
                .filter(Boolean)
            if (!options.find(x => x.address === selected.address)) {
                options.push(({
                    description: texts.myself,
                    key: selected.address,
                    text: selected.name,
                    value: selected.address,
                }))
            }

            assigneeIn.options = arrSort(options, 'text')
            this.setState({ inputs })
        })

        const { inputs } = this.state
        const currencyIn = findInput(inputs, this.names.currency)
        getCurrencies().then(currencies => {
            currencyIn.options = currencies.map(({ currency, nameInLanguage, ISO }) => ({
                key: ISO,
                text: currency,
                value: ISO,
                name: nameInLanguage,
            }))
            currencyIn.deburr = true // ???
            currencyIn.search = ['text', 'name']
            this.setState({ inputs })
        })

    }

    componentWillUnmount() {
        this._mounted = false
    }

    handleBountyChange = deferred(async (_, values) => {
        const { inputs } = this.state
        const bountyGrpIn = findInput(inputs, this.names.bountyGroup)
        const bountyIn = findInput(inputs, this.names.bounty)
        const bounty = values[this.names.bounty]
        if (!bounty) {
            bountyIn.invalid = false
            bountyGrpIn.message = null
            return this.setState({ inputs, submitDisabled: false })
        }
        const currency = values[this.names.currency]
        const currencySelected = getSelectedCurrency()
        const { address } = getSelected()
        bountyIn.loading = true
        this.setState({ inputs, submitDisabled: true })
        const getCurrencyEl = (prefix, suffix, value, unit, unitDisplayed) => (
            <Currency {... { decimalPlaces: 4, prefix, suffix, value, unit, unitDisplayed }} />
        )

        try {
            this.amountXTX = Math.ceil(await convertTo(bounty, currency, currencyDefault))
            const { api } = await getConnection()
            const balanceXTX = parseInt(await api.query.balances.freeBalance(address))
            const amountTotalXTX = this.amountXTX + estimatedTxFee
            const gotBalance = balanceXTX - estimatedTxFee - this.amountXTX >= 0
            bountyIn.invalid = !gotBalance
            bountyGrpIn.message = {
                content: (
                    <div>
                        <div title={`${textsCap.amountRequired}: ${amountTotalXTX} ${currencyDefault}`}>
                            {getCurrencyEl(
                                `${textsCap.amountRequired}: `,
                                null,
                                amountTotalXTX,
                                currencyDefault,
                                currencySelected,
                            )}
                        </div>
                        <div title={`${textsCap.balance}: ${balanceXTX} ${currencyDefault}`}>
                            {getCurrencyEl(
                                `${textsCap.balance}: `,
                                null,
                                balanceXTX,
                                currencyDefault,
                                currencySelected,
                            )}
                        </div>
                    </div>
                ),
                header: !gotBalance ? textsCap.insufficientBalance : undefined,
                status: gotBalance ? 'success' : 'error',
            }
        } catch (e) {
            bountyIn.invalid = true
            bountyGrpIn.message = {
                content: e,
                header: textsCap.conversionErrorHeader,
                status: 'error'
            }
        }
        bountyIn.loading = false
        this.setState({ inputs, submitDisabled: false })
    }, 300)

    handlePublishChange = (_, values) => {
        const { inputs } = this.state
        const assigneeIn = findInput(inputs, this.names.assignee)
        const publish = values[this.names.publish] === 'yes'
        assigneeIn.hidden = publish
        this.setState({ inputs })
    }

    handleSubmit = (_, values) => {
        const { values: valuesOrg = {} } = this.props
        const { address } = getSelected()
        const deadlineBlocks = Math.ceil(values[this.names.deadline] / BLOCK_DURATION_SECONDS)
        const dueDateBlocks = Math.ceil(values[this.names.dueDate] / BLOCK_DURATION_SECONDS)
        const assignee = values[this.names.assignee]
        const orderClosed = !!assignee ? 1 : 0
        const create = !valuesOrg.hash
        const fn = !create ? updateTaskOrder : createTaskOrder
        const description = values[this.names.title]
        const title = create ? textsCap.formHeader : textsCap.formHeaderUpdate
        const args = [
            address,
            address,
            assignee || address,
            values[this.names.isSell],
            this.amountXTX,
            orderClosed,
            values[this.names.orderType],
            deadlineBlocks,
            dueDateBlocks,
            [[PRODUCT_HASH_LABOUR, this.amountXTX, 1]], // single item order
        ]
        const then = (success, [errMsg]) => this.setState({
            message: !errMsg ? null : {
                content: `${errMsg}`,
                header: textsCap.submitFailed,
                showIcon: true,
                status: 'error',
            },
            submitDisabled: false,
            success,
        })
        this.setState({
            submitDisabled: true,
            message: {
                header: textsCap.addedToQueue,
                showIcon: true,
                status: 'loading',
            },
        })
        addToQueue(fn.apply(null, [...args, { description, then, title }]))
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
TaskForm.propTypes = {
    values: PropTypes.object,
}