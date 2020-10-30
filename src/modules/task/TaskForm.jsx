import React, { Component } from 'react'
import uuid from 'uuid'
import { Button } from 'semantic-ui-react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { arrSort, deferred, generateHash, isFn, isHash, isObj, isValidNumber, objClean } from '../../utils/utils'
import PromisE from '../../utils/PromisE'
import { BLOCK_DURATION_SECONDS, blockNumberToTS, format } from '../../utils/time'
import { Balance } from '../../components/Balance'
import Currency from '../../components/Currency'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import { getCurrentBlock, hashTypes, query, queueables as bcQueueables } from '../../services/blockchain'
import { convertTo, currencyDefault, getCurrencies, getSelected as getSelectedCurrency } from '../../services/currency'
import { translated } from '../../services/language'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { showForm } from '../../services/modal'
import { getById } from '../history/history'
import { find as findIdentity, getSelected } from '../identity/identity'
import { get as getPartner, getAll as getPartners } from '../partner/partner'
import PartnerForm from '../partner/PartnerForm'
import { queueables } from './task'
import { rxUpdater } from './useTasks'

const textsCap = translated({
    addedToQueue: 'request added to queue',
    advancedLabel: 'advanced options',
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
    dateForamt: 'YYYY-MM-DD',
    deadlineLabel: 'deadline to accept task',
    deadlineMinErrorMsg: 'deadline must be at least 48 hours from now',
    dueDateLabel: 'due date',
    dueDateMinErrorMsg: 'due date must be at least 24 hours after deadline',
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
    marketplaceDisclaimer: `
        Your task will be published to the marketplace.
        Anyone using Totem will be able to submit proposal to this Task.
        You will then be able to accept or reject any proposal you wish.
    `,
    minBalanceRequired: 'minimum balance required',
    myself: 'myself',
    nofityAssignee: 'notify assignee',
    orderTypeLabel: 'order type',
    publishToMarketPlace: 'publish to marketplace',
    taskIdParseError: 'failed to parse Task ID from transaction event data',
    services: 'services',
    submitFailed: 'failed to create task',
    submitSuccess: 'task created successfully',
    saveOffChainData: 'save off-chain data',
    tags: 'categorise with tags',
    tagsNoResultMsg: 'type tag and press ENTER to add',
    tagsPlaceholder: 'enter tags',
    title: 'task title',
    titlePlaceholder: 'enter a very short task description',
    updatePartner: 'update partner',
}, true)[1]
const estimatedTxFee = 340
const minBalanceAterTx = 1618
// deadline must be minimum 48 hours from now
const deadlineMinMS = 48 * 60 * 60 * 1000
// due date must be 24 hours after deadline
const dueDateMinMS = 24 * 60 * 60 * 1000
const strToDate = ymd => new Date(`${ymd}T23:59:59`)

export default class TaskForm extends Component {
    constructor(props) {
        super(props)

        const { taskId, values } = this.props
        // list of input names
        this.names = Object.freeze({
            advancedGroup: 'advancedGroup',
            amountXTX: 'amountXTX',
            assignee: 'fulfiller',
            bounty: 'bounty',
            bountyGroup: 'bountyGroup',
            currency: 'currency',
            dates: 'dates',
            deadline: 'deadline',
            dueDate: 'dueDate',
            description: 'description',
            orderType: 'orderType',
            isMarket: 'isMarket',
            isSell: 'isSell',
            parentId: 'parentId',
            tags: 'tags',
            title: 'title',
        })
        // keys used to generate BONSAI token hash
        // keep it in the same order as in the `VALID_KEYS` array in the messaging service
        this.bonsaiKeys = [
            this.names.amountXTX,
            this.names.currency,
            this.names.deadline,
            this.names.description,
            this.names.dueDate,
            this.names.isMarket,
            this.names.isSell,
            this.names.parentId,
            this.names.tags,
            this.names.title,
        ]

        this.state = {
            disabled: true,
            header: isObj(values) && !!taskId ? textsCap.formHeaderUpdate : textsCap.formHeader,
            loading: true,
            submitDisabled: {
                oldVsNew: !!taskId,
            },
            onChange: !taskId ? undefined : this.handleChange,
            onSubmit: this.handleSubmit,
            inputs: [
                {
                    rxValue: new BehaviorSubject(),
                    label: textsCap.title,
                    maxLength: 160,
                    minLength: 3,
                    name: this.names.title,
                    placeholder: textsCap.titlePlaceholder,
                    required: true,
                    type: 'text',
                },
                {
                    name: this.names.bountyGroup,
                    type: 'group',
                    unstackable: true,
                    inputs: [
                        {
                            rxValue: new BehaviorSubject(),
                            label: textsCap.bountyLabel,
                            min: 0, // allows bounty-free tasks
                            name: this.names.bounty,
                            onChange: this.handleBountyChange,
                            placeholder: textsCap.bountyPlaceholder,
                            required: true,
                            type: 'number',
                            useInput: true,
                            width: 10,
                        },
                        {// hidden type to store bounty in XTX (regardless of display currency selected)
                            hidden: true,
                            name: this.names.amountXTX,
                            required: true,
                            rxValue: new BehaviorSubject(0),
                        },
                        { // display currency
                            rxValue: new BehaviorSubject(getSelectedCurrency()),
                            label: textsCap.currency,
                            maxLength: 18,
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
                            width: 6,
                            // value: getSelectedCurrency(),
                        },
                    ]
                },
                {
                    rxValue: new BehaviorSubject(false),
                    inline: true,
                    label: textsCap.marketplace,
                    multiple: false,
                    name: this.names.isMarket,
                    onChange: this.handleIsMarketChange,
                    options: [
                        { label: textsCap.assignToPartner, value: false },
                        { label: textsCap.publishToMarketPlace, value: true },
                    ],
                    radio: true,
                    required: true,
                    type: 'checkbox-group',
                },
                {
                    rxValue: new BehaviorSubject(),
                    hidden: values => !values[this.names.isMarket],
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
                    name: this.names.dates,
                    title: textsCap.dateForamt,
                    type: 'group',
                    inputs: [
                        {
                            rxValue: new BehaviorSubject(),
                            label: textsCap.deadlineLabel,
                            name: this.names.deadline,
                            onChange: (_, values) => {
                                const { taskId } = this.props
                                let dueDate = values[this.names.dueDate]
                                const deadline = values[this.names.deadline]
                                const dueDateIn = findInput(this.state.inputs, this.names.dueDate)
                                if (!dueDate || !taskId) {
                                    // reset 1 day after deadline if not already set or creating new task
                                    const date = strToDate(deadline)
                                    date.setSeconds(date.getSeconds() + dueDateMinMS / 1000 + 1)
                                    dueDate = format(date).substr(0, 10)
                                }
                                // reset and force re-evaluate due date
                                !!taskId && dueDateIn.rxValue.next('')
                                dueDateIn.rxValue.next(dueDate)
                            },
                            required: true,
                            type: 'date',
                            validate: (_, { value: deadline }) => {
                                if (!deadline) return

                                const diffMS = strToDate(deadline) - new Date()
                                return diffMS < deadlineMinMS && textsCap.deadlineMinErrorMsg
                            },
                        },
                        {
                            disabled: values => !values[this.names.deadline],
                            // hidden: values => !values[this.names.deadline], // hide if deadline is not selected
                            label: textsCap.dueDateLabel,
                            name: this.names.dueDate,
                            required: true,
                            rxValue: new BehaviorSubject(),
                            type: 'date',
                            validate: (_, { value: dueDate }, values) => {
                                if (!dueDate) return
                                const deadline = values[this.names.deadline]
                                const diffMS = strToDate(dueDate) - strToDate(deadline)
                                return diffMS < dueDateMinMS && textsCap.dueDateMinErrorMsg
                            },
                        },
                    ],
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
                            vaue: [],
                        },
                    ],
                },
            ]
        }

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    async componentWillMount() {
        this._mounted = true
        const { taskId, values } = this.props
        const { inputs } = this.state
        const assigneeIn = findInput(inputs, this.names.assignee)
        const currencyIn = findInput(inputs, this.names.currency)
        const tagsIn = findInput(inputs, this.names.tags)
        const assigneeOptions = Array.from(getPartners())
            .map(([address, { name, userId }]) => ({
                description: !userId ? '' : `@${userId}`,
                key: address,
                text: name,
                value: address,
            }))
        assigneeIn.options = arrSort(assigneeOptions, 'text')
        const currencyOptions = (await getCurrencies())
            .map(({ currency, ISO }) => ({
                key: ISO,
                text: currency,
                value: ISO,
            }))
        // currencyIn.deburr = true // ???
        currencyIn.options = arrSort(currencyOptions, 'text')
        currencyIn.search = ['text']
        if (!isObj(values)) return this.setState({ inputs, loading: false })
        const { number } = await query('api.rpc.chain.getHeader')
        const amountXTX = values[this.names.amountXTX]
        const currency = values[this.names.currency]
        const deadline = values[this.names.deadline]
        const dueDate = values[this.names.dueDate]
        const tags = values[this.names.tags] || []
        values[this.names.tags] = tags
        // convert duedate and deadline block numbers to date format yyyy-mm-dd
        if (deadline) values.deadline = this.blockToDateStr(deadline, number)
        if (dueDate) values.dueDate = this.blockToDateStr(dueDate, number)
        if (amountXTX) {
            values.bounty = amountXTX
            if (currency !== currencyDefault) {
                // temporarily set currency to default currency 
                values.currency = currencyDefault
                // after a delay set it to the currency of the task, to make sure currency conversion is done
                setTimeout(() => currencyIn.rxValue.next(currency), 100)
            }
        }
        if (tags.length) {
            tagsIn.options = tags.map(tag => ({
                key: tag,
                text: tag,
                value: tag,
            }))
        }
        fillValues(inputs, values, true)
        const state = { inputs, loading: false }
        if (taskId) {
            const editableFields = [
                this.names.description,
                this.names.title,
                this.names.tags,
            ]
            state.inputsDisabled = Object.values(this.names).filter(name => !editableFields.includes(name))
        }

        this.oldValues = objClean(values, Object.values(this.names))
        this.setState(state)
    }

    componentWillUnmount = () => this._mounted = false

    // converts a block number to date string formatted as yyyy-mm-dd
    blockToDateStr(blockNum, currentBlockNum) {
        if (!isValidNumber(blockNum)) return blockNum
        const ts = blockNumberToTS(blockNum, currentBlockNum, true)
        return ts.substr(0, 10) // Format as yyyy-dd-mm
    }

    dateStrToBlockNum = (dateStr, currentBlockNum) => {
        const dateMS = strToDate(dateStr) - new Date()
        const blockNum = Math.ceil(dateMS / 1000 / BLOCK_DURATION_SECONDS) + currentBlockNum
        return blockNum
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

    // check if user has enough balance for the transaction including pre-funding amount (bounty)
    // Two different deferred mechanims used here:
    // 1. deferred: to delay currency conversion while user is typing
    // 2. PromisE.deferred: makes sure even if deferred (1) resolves multiple times, only last execution is applied
    //          Eg: user types slowly and / or network is slow
    handleBountyChange = deferred((_, values) => {
        const { taskId, values: valuesOrg } = this.props
        const { amountXTX: bountyOriginal } = valuesOrg || {}
        const bounty = values[this.names.bounty]
        // bounty hasn't changed
        if (taskId && bounty === bountyOriginal) return

        this.bountyDeferred = this.bountyDeferred || PromisE.deferred()
        const { inputs, submitDisabled } = this.state
        const amountXTXIn = findInput(inputs, this.names.amountXTX)
        const bountyGrpIn = findInput(inputs, this.names.bountyGroup)
        const bountyIn = findInput(inputs, this.names.bounty)
        const valid = isValidNumber(bounty)
        const currency = values[this.names.currency]
        const { address } = getSelected()
        bountyIn.loading = valid
        bountyIn.invalid = false
        bountyGrpIn.message = null
        submitDisabled.bounty = valid
        this.setState({ inputs, submitDisabled })
        if (!valid) return this.bountyDeferred(Promise.reject(null))

        const promise = new Promise(async (resolve, reject) => {
            try {
                const result = []
                // no need to convert currency if amount is zero or XTX is the selected currency
                const requireConversion = bounty && currency !== currencyDefault
                // amountXTX
                result[0] = !requireConversion
                    ? [bounty, bounty]
                    : await convertTo(bounty, currency, currencyDefault)
                // user account balance
                result[1] = await query('api.query.balances.freeBalance', address)

                resolve(result)
            } catch (e) { reject(e) }
        })
        const handleBountyResult = result => {
            const amountXTX = Math.ceil((result[0] || [])[0] || 0)
            const balanceXTX = result[1]
            const amountTotalXTX = amountXTX + estimatedTxFee + minBalanceAterTx
            const gotBalance = balanceXTX - amountTotalXTX >= 0
            amountXTXIn.rxValue.next(amountXTX)
            bountyIn.invalid = !gotBalance
            bountyGrpIn.message = {
                content: (
                    <div>
                        <div title={`${textsCap.balance}: ${balanceXTX} ${currencyDefault} `}>
                            <Balance {...{
                                address,
                                prefix: textsCap.balance + ': ',
                                unit: currencyDefault,
                                unitDisplayed: currency,
                            }} />
                        </div>
                        <div title={`${textsCap.minBalanceRequired}: ${amountTotalXTX} ${currencyDefault}`}>
                            <Currency {... {
                                prefix: `${textsCap.minBalanceRequired}: `,
                                value: amountTotalXTX,
                                unit: currencyDefault,
                                unitDisplayed: currency,
                            }} />
                        </div>
                    </div>
                ),
                header: !gotBalance ? textsCap.insufficientBalance : undefined,
                status: gotBalance ? 'success' : 'error',
            }
            bountyIn.loading = false

            submitDisabled.bounty = false
            this.setState({ inputs, loading: false, submitDisabled })
        }
        const handleErr = err => {
            bountyIn.invalid = !!err
            bountyGrpIn.message = !err ? null : {
                content: `${err} `,
                header: textsCap.conversionErrorHeader,
                status: 'error'
            }
            submitDisabled.bounty = false
            this.setState({ inputs, loading: false, submitDisabled })
        }
        this.bountyDeferred(promise).then(handleBountyResult, handleErr)
    }, 300)

    // disables submit button if values unchanged
    handleChange = deferred((_, newValues) => {
        const { submitDisabled } = this.state
        newValues = objClean(newValues, Object.values(this.names))
        submitDisabled.oldVsNew = JSON.stringify(this.oldValues) === JSON.stringify(newValues)
        this.setState({ submitDisabled })
    }, 100)

    handleIsMarketChange = (_, values) => {
        const { inputs } = this.state
        const isMarketIn = findInput(inputs, this.names.isMarket)
        const assigneeIn = findInput(inputs, this.names.assignee)
        const isMarket = !!values[this.names.isMarket]
        assigneeIn.hidden = isMarket
        isMarketIn.invalid = isMarket
        isMarketIn.message = !isMarket ? null : {
            content: 'Not implemented yet', //textsCap.marketplaceDisclaimer,
            status: 'error',
            style: { textAlign: 'justify' },
        }
        this.setState({ inputs })
    }

    handleSubmit = async (_, values) => {
        // convert deadline & dueDate string date to block number
        const currentBlock = await getCurrentBlock()
        const deadlineN = this.names.deadline
        const dueDateN = this.names.dueDate
        values[deadlineN] = this.dateStrToBlockNum(values[deadlineN], currentBlock)
        values[dueDateN] = this.dateStrToBlockNum(values[dueDateN], currentBlock)

        let { onSubmit, taskId, values: valueP = {} } = this.props
        const { submitDisabled } = this.state
        const doUpdate = !!taskId
        const ownerAddress = valueP.owner || getSelected().address
        const amountXTX = values[this.names.amountXTX]
        const isMarket = values[this.names.isMarket]
        const assignee = isMarket ? ownerAddress : values[this.names.assignee]
        const deadline = values[deadlineN]
        const dueDate = values[dueDateN]
        const description = values[this.names.title]
        const isSell = values[this.names.isSell]
        const title = values[this.names.title]
        const dbValues = objClean(values, this.bonsaiKeys)
        const tokenData = hashTypes.taskHash + ownerAddress + JSON.stringify(dbValues)
        const token = generateHash(tokenData)
        const nameCreateTask = 'createTask'
        const nameSaveTask = 'saveTask'
        const queueId = uuid.v1()
        const orderType = values[this.names.orderType]
        const thenCb = isLastInQueue => (success, err) => {
            if (!isLastInQueue && success) return
            submitDisabled.submit = false
            this.setState({
                closeText: success ? textsCap.close : undefined,
                loading: false,
                message: {
                    content: !success && `${err} `, // error can be string or Error object.
                    header: success ? textsCap.submitSuccess : textsCap.submitFailed,
                    icon: true,
                    status: success ? 'success' : 'error',
                },
                submitDisabled,
                success,
            })

            // force `useTask` hook to update the off-chain task data for this task only
            taskId = taskId || (getById(queueId) || { data: [] }).data[0]
            isHash(taskId) && rxUpdater.next([taskId])
            isFn(onSubmit) && onSubmit(success, values, taskId)
        }
        const fn = !doUpdate ? queueables.save : bcQueueables.bonsaiSaveToken
        const extraProps = {
            description,
            name: nameCreateTask,
            title: !doUpdate ? textsCap.formHeader : textsCap.formHeaderUpdate,
            then: thenCb(false),
        }
        const queueProps = fn.apply(null,
            !doUpdate ? (
                [
                    ownerAddress,
                    ownerAddress,
                    assignee,
                    isSell,
                    amountXTX,
                    isMarket,
                    orderType,
                    deadline,
                    dueDate,
                    taskId,
                    token,
                    extraProps,
                ]
            ) : [
                    ownerAddress,
                    hashTypes.taskHash,
                    taskId,
                    token,
                    extraProps,
                ]
        )

        // queue task to store off-chain data to messaging service
        queueProps.next = {
            id: queueId,
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'task',
            then: thenCb(true),
            title: textsCap.saveOffChainData,
            description: title,
            name: nameSaveTask,
            args: [
                taskId || {
                    // need to process tx result (events' data) to get the taskId
                    __taskName: nameCreateTask,
                    __resultSelector: `result => {
                        const [txHash, eventsArr = []] = result || []
                        const txId = '${queueProps.txId}'
                        const method = 'OrderCreated'
                        const section = 'orders'
                        const event = eventsArr.find(event => {
                            if (
                                method !== event.method
                                || section !== event.section
                                || !(event.data || []).length
                            ) return
                            return event.data[0] === txId
                        })
                        const taskId = event && event.data[1] || ''
                        if (!event || !('' + taskId).startsWith('0x')) {
                            throw new Error('${textsCap.taskIdParseError}')
                        }
                        return taskId
                    }`
                },
                dbValues,
                ownerAddress,
            ]
        }

        // notify assignee on creation only
        if (!this.props.taskId && !findIdentity(assignee)) {
            const { userId } = getPartner(assignee) || {}
            queueProps.next.next = !userId ? undefined : {
                args: [
                    [userId],
                    'task',
                    'assignment',
                    null,
                    { // ToDo: test required
                        __taskName: nameSaveTask,
                        // grab the taskId from the save previous item in the queue chain
                        __resultSelector: `(r, rt, saveTask) => ({
                            fulfillerAddress: "${assignee}",
                            taskId: saveTask.argsProcessed[0],
                        })`,
                    },
                ],
                description: title,
                func: 'notify',
                title: textsCap.nofityAssignee,
                type: QUEUE_TYPES.CHATCLIENT,
            }
        }

        submitDisabled.submit = true
        // add requests to the queue
        this.setState({
            closeText: textsCap.close,
            loading: true,
            message: {
                header: textsCap.addedToQueue,
                icon: true,
                status: 'loading',
            },
            submitDisabled,
        })
        addToQueue(queueProps)
    }

    validateAssignee = (_, { value: assignee }) => {
        if (!assignee) return
        const { address } = getSelected() || {}
        if (assignee === address) return textsCap.assigneeErrOwnIdentitySelected

        const partner = getPartner(assignee) || {}
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
                    assigneeIn.rxValue.next('')
                    assigneeIn.rxValue.next(assignee)
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