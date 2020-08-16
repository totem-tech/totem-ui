import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { arrSort, deferred, isObj, isValidNumber, objClean, generateHash } from '../../utils/utils'
import PromisE from '../../utils/PromisE'
import { BLOCK_DURATION_SECONDS, format } from '../../utils/time'
// components
import Currency from '../../components/Currency'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import PartnerForm from '../../forms/Partner'
// services
import { getConnection, getCurrentBlock, hashTypes, query } from '../../services/blockchain'
import {
    convertTo,
    currencyDefault,
    getCurrencies,
    getSelected as getSelectedCurrency
} from '../../services/currency'
import { bond, getSelected } from '../../services/identity'
import { translated } from '../../services/language'
import partners from '../../services/partner'
import { queueables, PRODUCT_HASH_LABOUR } from './task'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { showForm } from '../../services/modal'

const textsCap = translated({
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
    close: 'close',
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
    publishDisclaimer: `
        Your task will be published to the marketplace.
        Anyone using Totem will be able to submit proposal to this Task.
        You will then be able to accept or reject any proposal you wish.
    `,
    publishToMarketPlace: 'publish to marketplace',
    taskIdParseError: 'failed to parse Task ID from transaction event data',
    services: 'services',
    submitFailed: 'failed to create task',
    submitSuccess: 'task created successfully',
    saveOffChainData: 'save off-chain data using BONSAI',
    tags: 'categorise with tags',
    tagsNoResultMsg: 'type tag and press ENTER to add',
    tagsPlaceholder: 'enter tags',
    title: 'task title',
    titlePlaceholder: 'enter a very short task description',
    updatePartner: 'update partner',
}, true)[1]
const estimatedTxFee = 140
const deadlineMinMS = 48 * 60 * 60 * 1000
const strToDate = ymd => new Date(`${ymd}T23:59:59`)

export default class TaskForm extends Component {
    constructor(props) {
        super(props)

        const { taskId, values } = this.props
        this.amountXTX = 0
        // list of input names
        this.names = Object.freeze({
            advancedGroup: 'advancedGroup',
            assignee: 'fulfiller',
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
        // keys used to generate BONSAI token hash
        // keep it in the same order as in the `VALID_KEYS` array in the messaging service
        this.bonsaiKeys = [
            this.names.currency,
            this.names.publish,
            this.names.title,
            this.names.description,
            this.names.tags,
        ]

        this.state = {
            header: isObj(values) && !!taskId ? textsCap.formHeaderUpdate : textsCap.formHeader,
            loading: true,
            onChange: (_, values) => this.setState({ values }),
            onSubmit: this.handleSubmit,
            values: {},
            inputs: [
                {
                    bond: new Bond(),
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
                            bond: new Bond(),
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
                    bond: new Bond(),
                    inline: true,
                    label: textsCap.marketplace,
                    multiple: false,
                    name: this.names.publish,
                    onChange: this.handlePublishChange,
                    options: [
                        { label: textsCap.assignToPartner, value: 0 },
                        { label: textsCap.publishToMarketPlace, value: 1 },
                    ],
                    radio: true,
                    required: true,
                    type: 'checkbox-group',
                    // remove validation once implemented
                    // validate: (_, { value: publish }) => publish && textsCap.featureNotImplemented,
                    value: 0,
                },
                {
                    bond: new Bond(),
                    hidden: values => !!values[this.names.publish],
                    label: textsCap.assignee,
                    name: this.names.assignee,
                    options: [],
                    placeholder: textsCap.assigneePlaceholder,
                    required: true,
                    selection: true,
                    search: true,
                    type: 'dropdown',
                    validate: this.validateAssignee,
                },
                {
                    bond: new Bond(),
                    label: textsCap.deadlineLabel,
                    name: this.names.deadline,
                    onChange: (_, values) => {
                        const dueDate = values[this.names.dueDate]
                        const { taskId } = this.props
                        if (!dueDate) return
                        // reset due date
                        const dueDateIn = findInput(this.state.inputs, this.names.dueDate)
                        dueDateIn.bond.changed('')
                        // force re-evaluate the due date
                        taskId && dueDateIn.bond.changed(dueDate)
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
                            value: 0, // 0 => buy order
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
                            placeholder: textsCap.tagsPlaceholder,
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

    async componentWillMount() {
        const { values } = this.props
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
            this.setState({ inputs, values })
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

        if (!isObj(values)) return this.setState({ loading: false })
        const { amountXTX, deadline, dueDate, tags = [] } = values
        // convert duedate and deadline block numbers to date format yyyy-mm-dd
        const { number } = await query('api.rpc.chain.getHeader')

        values.deadline = this.blockToDateStr(deadline, number)
        values.dueDate = this.blockToDateStr(dueDate, number)
        values.bounty = amountXTX
        this.bountyOriginal = values.bounty
        if (tags.length) {
            findInput(inputs, this.names.tags).options = tags.map(tag => ({
                key: tag,
                text: tag,
                value: tag,
            }))
        }
        fillValues(inputs, values, true)
        this.setState({ inputs, loading: false })
    }

    componentWillUnmount() {
        this._mounted = false
    }

    // converts a block number to date string formatted as yyyy-mm-dd
    blockToDateStr(blockNum, currentBlockNum) {
        if (!isValidNumber(blockNum)) return blockNum
        const numSeconds = (blockNum - currentBlockNum) * BLOCK_DURATION_SECONDS
        const now = new Date()
        now.setSeconds(now.getSeconds() + numSeconds)
        return format(now).substr(0, 10)
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
        const { taskId } = this.props
        const bounty = values[this.names.bounty]
        // bounty hasn't changed
        if (taskId && bounty === this.bountyOriginal) return

        this.bountyPromise = this.bountyPromise || PromisE.deferred()
        const { inputs } = this.state
        const bountyGrpIn = findInput(inputs, this.names.bountyGroup)
        const bountyIn = findInput(inputs, this.names.bounty)
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
        const handleSuccess = result => {
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
                        <div title={`${textsCap.balance}: ${balanceXTX} ${currencyDefault} `}>
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
        const handleErr = err => {
            bountyIn.invalid = true
            bountyGrpIn.message = {
                content: `${err} `,
                header: textsCap.conversionErrorHeader,
                status: 'error'
            }
        }
        this.bountyPromise(promise).then(handleSuccess)
            .catch(handleErr)
            .finally(() => {
                bountyIn.loading = false
                this.setState({ inputs, submitDisabled: false })
            })
    }, 300)

    handlePublishChange = (_, values) => {
        const { inputs } = this.state
        const publishIn = findInput(inputs, this.names.publish)
        const assigneeIn = findInput(inputs, this.names.assignee)
        const publish = !!values[this.names.publish]
        assigneeIn.hidden = publish
        publishIn.message = !publish ? null : {
            content: textsCap.publishDisclaimer,
            style: { textAlign: 'justify' },
        }
        this.setState({ inputs })
    }

    handleSubmit = async (_, values) => {
        const { taskId } = this.props
        const { address: ownerAddress } = getSelected()
        const currentBlock = await getCurrentBlock()
        const deadlineMS = strToDate(values[this.names.deadline]) - new Date()
        const dueDateMS = strToDate(values[this.names.dueDate]) - new Date()
        const deadlineBlocks = Math.ceil(deadlineMS / 1000 / BLOCK_DURATION_SECONDS) + currentBlock
        const dueDateBlocks = Math.ceil(dueDateMS / 1000 / BLOCK_DURATION_SECONDS) + currentBlock
        const assignee = values[this.names.assignee]
        const orderClosed = !!assignee ? 1 : 0
        const description = values[this.names.title]
        const title = !taskId ? textsCap.formHeader : textsCap.formHeaderUpdate
        const dbValues = objClean(values, this.bonsaiKeys)
        const tokenData = hashTypes.taskHash + ownerAddress + JSON.stringify(dbValues)
        const token = generateHash(tokenData)
        const queueTaskName = 'createTask'
        const thenCb = last => (success, err) => {
            if (!last && success) return
            this.setState({
                closeText: success ? textsCap.close : undefined,
                message: {
                    content: !success && `${err} `, // error can be string or Error object.
                    header: success ? textsCap.submitSuccess : textsCap.submitFailed,
                    showIcon: true,
                    status: success ? 'success' : 'error',
                },
                submitDisabled: false,
                success,
            })
        }
        this.setState({
            closeText: textsCap.close,
            submitDisabled: true,
            message: {
                header: textsCap.addedToQueue,
                showIcon: true,
                status: 'loading',
            },
        })

        const queueProps = queueables.save.apply(null, [
            ownerAddress,
            ownerAddress,
            assignee,
            values[this.names.isSell],
            this.amountXTX,
            orderClosed,
            values[this.names.orderType],
            deadlineBlocks,
            dueDateBlocks,
            [[PRODUCT_HASH_LABOUR, this.amountXTX, 1, 1]], // single item order
            taskId,
            token,
            {
                description,
                name: queueTaskName,
                title,
                then: thenCb(false),
            },
        ])
        queueProps.next = {
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'task',
            then: thenCb(true),
            title: textsCap.saveOffChainData,
            args: [
                taskId || {
                    // need to process tx result (events' data) to get the taskId
                    __taskName: queueTaskName,
                    __resultSelector: `result => {
                        const [txHash, eventsArr = []] = result || []
                        const event = (eventsArr || []).find(({ data = [] }) => {
                            return data[0] === '${queueProps.txId}'
                        })
                        const taskId = event && event.data[1]
                        if (!event || !taskId.startsWith('0x')) throw new Error('${textsCap.taskIdParseError}')
                        return taskId
                    }`
                },
                dbValues,
                ownerAddress,
            ]
        }
        addToQueue(queueProps)
    }

    validateAssignee = (_, { value: assignee }) => {
        if (!assignee) return
        const { address } = getSelected() || {}
        if (assignee === address) return textsCap.assigneeErrOwnIdentitySelected

        const partner = partners.get(assignee) || {}
        const { inputs } = this.state
        const assigneeIn = findInput(inputs, this.names.assignee)
        const onClick = e => {
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
        }
        return partner.userId ? null : (
            <div>
                {textsCap.assigneeErrUserIdRequired}
                <div>
                    <Button {...{ content: textsCap.updatePartner, onClick }} />
                </div>
            </div>
        )
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
TaskForm.propTypes = {
    taskId: PropTypes.string,
    values: PropTypes.object,
}
TaskForm.defaultProps = {
    size: 'tiny',
}