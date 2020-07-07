import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import Currency from '../../components/Currency'
import { arrSort, deferred, isObj, isValidNumber, deferredPromise } from '../../utils/utils'
import PartnerForm from '../../forms/Partner'
// services
import { getConnection, getCurrentBlock } from '../../services/blockchain'
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
import { createOrUpdateTask, PRODUCT_HASH_LABOUR } from './task'
import { addToQueue } from '../../services/queue'
import { showForm } from '../../services/modal'

const [texts, textsCap] = translated({
    addedToQueue: 'request added to queue',
    advancedLabel: 'advanced options',
    amountRequired: 'amount required',
    assignee: 'select a partner to assign task',
    assigneeErrUserIdRequired: 'partner does not have an User ID associated.',
    assigneeErrOwnIdentitySelected: 'you cannot assign a task to your currently selected identity',
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
    invalidDate: 'invalid date',
    inventory: 'inventory',
    marketplace: 'marketplace',
    myself: 'myself',
    orderTypeLabel: 'order type',
    publishToMarketPlace: 'publish to marketplace',
    services: 'services',
    submitFailed: 'failed to create task',
    submitSuccess: 'task created successfully',
    tags: 'categorise with tags',
    tagsNoResultMsg: 'type tag and press ENTER to add',
    title: 'task title',
    titlePlaceholder: 'enter a very short task description',
    updatePartner: 'update partner',
}, true)
const estimatedTxFee = 140
const deadlineMinMS = 48 * 60 * 60 * 1000
const strToDate = ymd => new Date(`${ymd}T23:59:59`)

export default class TaskForm extends Component {
    constructor(props) {
        super(props)

        const { values } = this.props
        this.amountXTX = 0
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
            publish: 'published',
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
                            value: '',
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
                    validate: (_, { value: publish }) => publish === 'yes' && textsCap.featureNotImplemented,
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
                    validate: (_, { value: assignee }) => {
                        if (!assignee) return
                        const { address } = getSelected() || {}
                        if (assignee === address) return textsCap.assigneeErrOwnIdentitySelected

                        const partner = partners.get(assignee) || {}
                        const { inputs } = this.state
                        const assigneeIn = findInput(inputs, this.names.assignee)
                        return partner.userId ? null : (
                            <div>
                                {textsCap.assigneeErrUserIdRequired}
                                <div>
                                    <Button {...{
                                        content: textsCap.updatePartner,
                                        onClick: e => {
                                            e.preventDefault() // prevents form being submitted
                                            showForm(PartnerForm, {
                                                values: partner,
                                                onSubmit: (success, { userId }) => {
                                                    // partner wasn't updated with an user Id
                                                    if (!success || !userId) return
                                                    // force assignee to be re-validated
                                                    assigneeIn.bond.changed('')
                                                    assigneeIn.bond.changed(assignee)
                                                }
                                            })
                                        },
                                    }} />
                                </div>
                            </div>
                        )
                    },
                },
                {
                    label: textsCap.deadlineLabel,
                    name: this.names.deadline,
                    onChange: (_, values) => {
                        if (!values[this.names.dueDate]) return
                        // reset due date
                        findInput(this.state.inputs, this.names.dueDate).bond.changed('')
                    },
                    required: true,
                    type: 'date',
                    validate: (_, { value: deadline }) => {
                        if (!deadline) return textsCap.invalidDate
                        const diffMS = strToDate(deadline) - new Date()
                        return diffMS < deadlineMinMS && textsCap.deadlineMinErrorMsg
                    },
                    value: '',
                },
                {
                    bond: new Bond(),
                    hidden: values => !values[this.names.deadline], // hide if deadline is not selected
                    label: textsCap.dueDateLabel,
                    name: this.names.dueDate,
                    required: true,
                    type: 'date',
                    validate: (_, { value: dueDate }) => {
                        if (!dueDate) return textsCap.invalidDate
                        const { values } = this.state
                        const deadline = values[this.names.deadline]
                        const diffMS = strToDate(dueDate) - strToDate(deadline)
                        return diffMS < 0 && textsCap.dueDateMinErrorMsg
                    },
                    value: '',
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
                            value: 0, // default: service
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
            const options = Array.from(partners.getAll())
                .map(([address, { name, userId }]) => ({
                    description: userId,
                    key: address,
                    text: name,
                    value: address,
                }))

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

    getBalance = (() => {
        let promises = []
        const then = resolver => function () {
            const args = arguments
            promises.shift() // remove the first promise
            !promises.length && resolver.apply(null, args)
        }
        return address => new Promise((resolve, reject) => {
            const promise = api.query.balances.freeBalance(address)
            promise.then(then(resolve), then(reject))
            promises.push(promise)
        })
    })()

    // check if use has enough balance for the transaction including pre-funding amount (bounty)
    handleBountyChange = deferred((_, values) => {
        this.bountyPromise = this.bountyPromise || deferredPromise()
        // turn publish value into binary
        values[this.names.publish] = values[this.names.publish] === 'yes' ? 1 : 0
        const { inputs } = this.state
        const bountyGrpIn = findInput(inputs, this.names.bountyGroup)
        const bountyIn = findInput(inputs, this.names.bounty)
        const bounty = values[this.names.bounty]
        const valid = isValidNumber(bounty)
        const currency = values[this.names.currency]
        const currencySelected = getSelectedCurrency()
        const { address } = getSelected()
        const getCurrencyEl = (prefix, suffix, value, unit, unitDisplayed) => (
            <Currency {... { decimalPlaces: 4, prefix, suffix, value, unit, unitDisplayed }} />
        )
        bountyIn.loading = valid
        bountyIn.invalid = false
        bountyGrpIn.message = null
        this.setState({ inputs, submitDisabled: valid })
        if (!valid) return

        const promise = new Promise(async (resolve, reject) => {
            try {
                const result = []
                // no need to convert currency if amount is zero or XTX is the selected currency
                const requireConversion = bounty && currency !== currencyDefault
                const { api } = await getConnection()
                result[0] = Math.ceil(
                    !requireConversion ? bounty : await convertTo(bounty, currency, currencyDefault)
                )
                result[1] = parseInt(await api.query.balances.freeBalance(address))
                resolve(result)
            } catch (e) { reject(e) }
        })
        const thenOk = result => {
            this.amountXTX = result[0]
            const balanceXTX = result[1]
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
            bountyIn.loading = false
            this.setState({ inputs, submitDisabled: false })
        }
        const thenErr = err => {
            bountyIn.invalid = true
            bountyGrpIn.message = {
                content: `${err}`,
                header: textsCap.conversionErrorHeader,
                status: 'error'
            }
        }
        this.bountyPromise(promise).then(thenOk)
            .catch(thenErr)
            .finally(() => {
                bountyIn.loading = false
                this.setState({ inputs, submitDisabled: false })
            })
    }, 300)

    handlePublishChange = (_, values) => {
        const { inputs } = this.state
        const assigneeIn = findInput(inputs, this.names.assignee)
        const publish = values[this.names.publish] === 'yes'
        assigneeIn.hidden = publish
        this.setState({ inputs })
    }

    handleSubmit = async (_, values) => {
        const { hash } = this.props.values || {}
        const { address } = getSelected()
        const currentBlock = await getCurrentBlock()
        const deadlineMS = strToDate(values[this.names.deadline]) - new Date()
        const dueDateMS = strToDate(values[this.names.dueDate]) - new Date()
        const deadlineBlocks = Math.ceil(deadlineMS / 1000 / BLOCK_DURATION_SECONDS) + currentBlock
        const dueDateBlocks = Math.ceil(dueDateMS / 1000 / BLOCK_DURATION_SECONDS) + currentBlock
        const assignee = values[this.names.assignee]
        const orderClosed = !!assignee ? 1 : 0
        const description = values[this.names.title]
        const title = !hash ? textsCap.formHeader : textsCap.formHeaderUpdate
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
            [[PRODUCT_HASH_LABOUR, this.amountXTX, 1, 1]], // single item order
            hash,
        ]
        const then = (success, [err]) => this.setState({
            message: {
                content: !success && `${err}`, // error can be string or Error object.
                header: success ? textsCap.submitSuccess : textsCap.submitFailed,
                showIcon: true,
                status: success ? 'success' : 'error',
            },
            submitDisabled: false,
            success,
        })
        const queueProps = createOrUpdateTask.apply(null, [...args, { description, then, title }])
        addToQueue(queueProps)
        this.setState({
            submitDisabled: true,
            message: {
                header: textsCap.addedToQueue,
                showIcon: true,
                status: 'loading',
            },
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
TaskForm.propTypes = {
    values: PropTypes.object,
}