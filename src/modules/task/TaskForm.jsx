import React, { Component } from 'react'
import uuid from 'uuid'
import { Button } from 'semantic-ui-react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
// utils
import PromisE from '../../utils/PromisE'
import { copyRxSubject, subjectAsPromise } from '../../utils/reactHelper'
import {
    BLOCK_DURATION_SECONDS,
    blockNumberToTS,
    format,
} from '../../utils/time'
import {
    arrSort,
    deferred,
    generateHash,
    isArr,
    isFn,
    isHash,
    isObj,
    isValidNumber,
    objClean,
} from '../../utils/utils'
// components
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
// services
import {
    getCurrentBlock,
    hashTypes,
    query,
    queueables as bcQueueables,
} from '../../services/blockchain'
import { translated } from '../../services/language'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { showForm } from '../../services/modal'
// modules
import {
    convertTo,
    currencyDefault,
    rxSelected as rxSelectedCurrency,
} from '../currency/currency'
import Currency from '../currency/Currency'
import { asInlineLabel } from '../currency/CurrencyDropdown'
import { getById } from '../history/history'
import { Balance } from '../identity/Balance'
import { find as findIdentity, getSelected } from '../identity/identity'
import PartnerForm from '../partner/PartnerForm'
import PartnerIcon from '../partner/PartnerIcon'
import { get as getPartner, rxPartners } from '../partner/partner'
import { queueables } from './task'
import { rxUpdater } from './useTasks'
import getPartnerOptions from '../partner/getPartnerOptions'

let textsCap = {
    addedToQueue: 'request added to queue',
    addPartner: 'add partner',
    advancedLabel: 'advanced options',
    assignee: 'select a partner to assign task',
    assigneePlaceholder: 'select from partner list',
    assignToPartner: 'assign to a partner',
    balance: 'balance',
    bountyLabel: 'bounty amount',
    bountyPlaceholder: 'enter bounty amount',
    close: 'close',
    conversionErrorHeader: 'currency conversion failed',
    createFailed: 'failed to create task',
    createSuccess: 'task created successfully',
    currency: 'currency',
    deadlineLabel: 'deadline to accept task',
    deadlineMinErrorMsg: 'deadline must be at least 48 hours from now',
    dueDateLabel: 'due date',
    dueDateMinErrorMsg: 'due date must be at least 24 hours after deadline',
    description: 'detailed description',
    descriptionPlaceholder: 'enter more details about the task',
    errAssigneeNotPartner: 'assignee is not a partner!',
    errAsigneeNoUserId: 'partner does not have an User ID associated.',
    errAssginToSelf: 'you cannot assign a task to your currently selected identity',
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
    saveOffChainData: 'save off-chain data',
    tags: 'categorise with tags',
    tagsNoResultMsg: 'type tag and press ENTER to add',
    tagsPlaceholder: 'enter tags',
    title: 'task title',
    titlePlaceholder: 'enter a very short task description',
    updateFailed: 'failed to create task',
    updatePartner: 'update partner',
    updateSuccess: 'task created successfully',
}
textsCap = translated(textsCap, true)[1]
const estimatedTxFee = 340
const minBalanceAterTx = 1618
// deadline must be minimum 48 hours from now
const deadlineMinMS = 48 * 60 * 60 * 1000
// due date must be 24 hours after deadline
const dueDateMinMS = 24 * 60 * 60 * 1000
const strToDate = ymd => new Date(`${ymd}T23:59:59`)
export const inputNames = Object.freeze({
    advancedGroup: 'advancedGroup',
    amountXTX: 'amountXTX',
    assignee: 'fulfiller',
    bounty: 'bounty',
    bountyGroup: 'bountyGroup',
    currency: 'currency',
    currencyWrapper: 'currencyWrapper',
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
export default class TaskForm extends Component {
    constructor(props) {
        super(props)

        const { taskId, values } = this.props
        this.doUpdate = !!taskId
        this.rxCurrency = copyRxSubject(rxSelectedCurrency)
        this.rxCurrencies = new BehaviorSubject()
        this.rxAssignee = new BehaviorSubject()
        // keys used to generate BONSAI token hash
        // keep it in the same order as in the `VALID_KEYS` array in the messaging service
        this.bonsaiKeys = [
            inputNames.amountXTX,
            inputNames.currency,
            inputNames.deadline,
            inputNames.description,
            inputNames.dueDate,
            inputNames.isMarket,
            inputNames.isSell,
            inputNames.parentId,
            inputNames.tags,
            inputNames.title,
        ]

        this.state = {
            disabled: true,
            header: isObj(values) && !!taskId
                ? textsCap.formHeaderUpdate
                : textsCap.formHeader,
            loading: {
                currencies: true,
                onMount: true,
            },
            submitDisabled: {
                unchanged: !!taskId,
            },
            onChange: !taskId
                ? undefined
                : this.handleChange,
            onSubmit: this.handleSubmit,
            inputs: [
                {
                    rxValue: new BehaviorSubject(),
                    label: textsCap.title,
                    maxLength: 80,
                    minLength: 3,
                    name: inputNames.title,
                    placeholder: textsCap.titlePlaceholder,
                    required: true,
                    type: 'text',
                },
                {
                    // hidden: true, //delete
                    name: inputNames.bountyGroup,
                    type: 'group',
                    unstackable: true,
                    inputs: [
                        {
                            ...asInlineLabel({
                                disabled: this.doUpdate,
                                onCurrencies: currencies => {
                                    this.rxCurrencies.next(currencies)
                                    const { loading } = this.state
                                    loading.currencies = false
                                    this.setState({ loading })
                                },
                                rxValue: this.rxCurrency,
                            }),
                            label: textsCap.bountyLabel,
                            maxLength: 18,
                            min: 0, // allows bounty-free tasks
                            name: inputNames.bounty,
                            onChange: !taskId
                                ? this.handleBountyChange
                                : undefined,
                            onInvalid: !taskId
                                ? this.handleBountyInvalid
                                : undefined,
                            placeholder: textsCap.bountyPlaceholder,
                            rxValue: new BehaviorSubject(),
                            required: true,
                            type: 'number',
                            useInput: true,
                            // width: 10,
                        },
                        {
                            hidden: true,
                            name: inputNames.currency,
                            onChange: async (...args) => { 
                                const [_, values] = args
                                const { inputs } = this.state
                                const currency = values[inputNames.currency]
                                const bounty = values[inputNames.bounty]
                                const bountyIn = findInput(inputs, inputNames.bounty)
                                const currencies = await subjectAsPromise(this.rxCurrencies, x => isArr(x) && x)[0]
                                const { decimals = 0 } = currencies.find(x => x.currency === currency) || {}
                                bountyIn.decimals = parseInt(decimals || '') || 0
                                bountyIn.message = null
                                this.setState({ inputs })
                                
                                // trigger re-validation
                                bountyIn.rxValue.next('')
                                bountyIn.rxValue.next(bounty)
                            },
                            rxValue: this.rxCurrency,
                        },
                        {// hidden type to store bounty in XTX (regardless of display currency selected)
                            hidden: true,
                            name: inputNames.amountXTX,
                            required: true,
                            rxValue: new BehaviorSubject(0),
                        },
                    ]
                },
                {
                    // hidden: true,//delete
                    rxValue: new BehaviorSubject(false),
                    inline: true,
                    label: textsCap.marketplace,
                    multiple: false,
                    name: inputNames.isMarket,
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
                    // hidden: true,//delete
                    rxValue: new BehaviorSubject(),
                    hidden: values => !values[inputNames.isMarket],
                    label: textsCap.assignee,
                    name: inputNames.assignee,
                    options: [],
                    placeholder: textsCap.assigneePlaceholder,
                    required: true,
                    rxOptions: rxPartners,
                    rxOptionsModifier: partners => getPartnerOptions(
                        partners,
                        // whenever a partner is updated by clicking on the pencil icon,
                        // this will trigger re-validation of assignee
                        { onSubmit: this.triggerAssigneeUpdate },
                    ),
                    rxValue: this.rxAssignee,
                    selection: true,
                    search: ['keywords'],
                    type: 'dropdown',
                    validate: this.validateAssignee,
                },
                {
                    // hidden: true,//delete
                    name: inputNames.dates,
                    title: 'YYYY-MM-DD',
                    type: 'group',
                    inputs: [
                        {
                            rxValue: new BehaviorSubject(),
                            label: textsCap.deadlineLabel,
                            name: inputNames.deadline,
                            onChange: (_, values) => {
                                const { taskId } = this.props
                                let dueDate = values[inputNames.dueDate]
                                const deadline = values[inputNames.deadline]
                                const dueDateIn = findInput(this.state.inputs, inputNames.dueDate)
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
                            disabled: values => !values[inputNames.deadline],
                            // hidden: values => !values[inputNames.deadline], // hide if deadline is not selected
                            label: textsCap.dueDateLabel,
                            name: inputNames.dueDate,
                            required: true,
                            rxValue: new BehaviorSubject(),
                            type: 'date',
                            validate: (_, { value: dueDate }, values) => {
                                if (!dueDate) return
                                const deadline = values[inputNames.deadline]
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
                    name: inputNames.advancedGroup,
                    type: 'group',
                    // styleContainer: {width: '100%'},
                    grouped: true,
                    inputs: [
                        {
                            name: inputNames.isSell,
                            type: 'hidden',
                            value: 0, // 0 => buy order
                        },
                        {
                            hidden: true, // only show if this is a purchase order
                            inline: true,
                            label: textsCap.orderTypeLabel,
                            name: inputNames.orderType,
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
                            name: inputNames.description,
                            placeholder: textsCap.descriptionPlaceholder,
                            required: false,
                            type: 'textarea',
                        },
                        {
                            allowAdditions: true,
                            label: textsCap.tags,
                            multiple: true,
                            name: inputNames.tags,
                            noResultsMessage: textsCap.tagsNoResultMsg,
                            onAddItem: (_, { value }) => {
                                const { inputs } = this.state
                                const tagsIn = findInput(inputs, inputNames.tags)
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
        const { inputs, loading } = this.state
        const currencyIn = findInput(inputs, inputNames.currency)
        const tagsIn = findInput(inputs, inputNames.tags)
        if (!isObj(values)) {
            loading.onMount = false
            return this.setState({ inputs, loading })
        }

        values[inputNames.currency] = values[inputNames.currency]
            || rxSelectedCurrency.value
        const { number } = await query('api.rpc.chain.getHeader')
        const amountXTX = values[inputNames.amountXTX]
        const currency = values[inputNames.currency]
        const deadline = values[inputNames.deadline]
        const dueDate = values[inputNames.dueDate]
        const tags = values[inputNames.tags] || []
        values[inputNames.tags] = tags
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
        loading.onMount = false
        const state = { inputs, loading }
        if (taskId) {
            const editableFields = [
                inputNames.description,
                inputNames.title,
                inputNames.tags,
            ]
            state.inputsDisabled = Object.values(inputNames).filter(name => !editableFields.includes(name))
        }

        this.oldValues = objClean(values, Object.values(inputNames))
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
        const bounty = values[inputNames.bounty]     
        this.bountyDeferred = this.bountyDeferred || PromisE.deferred()
        const { inputs, submitDisabled } = this.state
        const amountXTXIn = findInput(inputs, inputNames.amountXTX)
        const bountyIn = findInput(inputs, inputNames.bounty)
        const valid = isValidNumber(bounty)
        const currency = values[inputNames.currency]
        const { address } = getSelected()
        bountyIn.loading = valid
        bountyIn.invalid = false
        bountyIn.message = null
        submitDisabled.bounty = valid
        this.setState({ inputs, submitDisabled })
        if (taskId && bounty === bountyOriginal) return
        if (!valid) return this.bountyDeferred(Promise.reject(null))

        const promise = new Promise(async (resolve, reject) => {
            try {
                // user account balance
                let balance = await query('api.query.balances.freeBalance', address)
                const locks = await query('api.query.balances.locks', address)
                const freeBalance = balance - locks.reduce((totalLocked, lock) => totalLocked + lock.amount, 0)
                // no need to convert currency if amount is zero or XTX is the selected currency
                const requireConversion = bounty && currency !== currencyDefault
                // amountXTX
                const amount = !requireConversion
                    ? [bounty, bounty]
                    : await convertTo(bounty, currency, currencyDefault)
                const amountXTX = parseInt(amount[0])
                resolve([amountXTX, freeBalance])
            } catch (e) { reject(e) }
        })
        const handleBountyResult = result => {
            const [amountXTX, balanceXTX] = result || []
            const amountTotalXTX = amountXTX + estimatedTxFee + minBalanceAterTx
            const gotBalance = balanceXTX - amountTotalXTX >= 0
            amountXTXIn.rxValue.next(amountXTX)
            bountyIn.invalid = !gotBalance
            bountyIn.message = {
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
            bountyIn.message = !err ? null : {
                content: `${err} `,
                header: textsCap.conversionErrorHeader,
                status: 'error'
            }
            submitDisabled.bounty = false
            this.setState({ inputs, loading: false, submitDisabled })
        }
        this.bountyDeferred(promise).then(handleBountyResult, handleErr)
    }, 300)

    handleBountyInvalid = () => {
        // clear message field
        const { inputs } = this.state
        findInput(inputs, inputNames.bounty).message = null
        this.setState({ inputs })
    }

    // disables submit button if values unchanged
    handleChange = deferred((_, newValues) => {
        const { submitDisabled } = this.state
        newValues = objClean(newValues, Object.values(inputNames))
        submitDisabled.unchanged = JSON.stringify(this.oldValues) === JSON.stringify(newValues)
        this.setState({ submitDisabled })
    }, 300)

    handleIsMarketChange = (_, values) => {
        const { inputs } = this.state
        const isMarketIn = findInput(inputs, inputNames.isMarket)
        const assigneeIn = findInput(inputs, inputNames.assignee)
        const isMarket = !!values[inputNames.isMarket]
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
        const deadlineN = inputNames.deadline
        const dueDateN = inputNames.dueDate
        values[deadlineN] = this.dateStrToBlockNum(values[deadlineN], currentBlock)
        values[dueDateN] = this.dateStrToBlockNum(values[dueDateN], currentBlock)

        let { onSubmit, taskId, values: valueP = {} } = this.props
        const ownerAddress = valueP.owner || getSelected().address
        const amountXTX = values[inputNames.amountXTX]
        const isMarket = values[inputNames.isMarket]
        const assignee = isMarket ? ownerAddress : values[inputNames.assignee]
        const deadline = values[deadlineN]
        const dueDate = values[dueDateN]
        const description = values[inputNames.title]
        const isSell = values[inputNames.isSell]
        const title = values[inputNames.title]
        const dbValues = objClean(values, this.bonsaiKeys)
        const tokenData = hashTypes.taskHash + ownerAddress + JSON.stringify(dbValues)
        const token = generateHash(tokenData)
        const nameCreateTask = 'createTask'
        const nameSaveTask = 'saveTask'
        const queueId = uuid.v1()
        const orderType = values[inputNames.orderType]
        const thenCb = isLastInQueue => (success, err) => {
            if (!isLastInQueue && success) return
            this.setState({
                closeText: success
                    ? textsCap.close
                    : undefined,
                loading: false,
                message: {
                    content: !success && `${err} `, // error can be string or Error object.
                    header: success
                        ? this.doUpdate 
                            ? textsCap.updateSuccess
                            : textsCap.createSuccess
                        : this.doUpdate 
                            ? textsCap.updateFailed
                            :textsCap.createFailed,
                    icon: true,
                    status: success
                        ? 'success'
                        : 'error',
                },
                submitInProgress: false,
                success,
            })

            // force `useTask` hook to update the off-chain task data for this task only
            taskId = taskId || (getById(queueId) || { data: [] }).data[0]
            isHash(taskId) && rxUpdater.next([taskId])
            isFn(onSubmit) && onSubmit(success, values, taskId)
        }
        const fn = !this.doUpdate
            ? queueables.save
            : bcQueueables.bonsaiSaveToken
        const extraProps = {
            description,
            name: nameCreateTask,
            title: !this.doUpdate
                ? textsCap.formHeader
                : textsCap.formHeaderUpdate,
            then: thenCb(false),
        }
        const queueProps = fn.apply(null, !this.doUpdate
            ? [
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
            : [
                ownerAddress,
                hashTypes.taskHash,
                taskId,
                token,
                extraProps,
            ]
        )

        // queue task to store off-chain data to messaging service
        queueProps.next = {
            description: title,
            id: queueId,
            func: 'task',
            name: nameSaveTask,
            recordId: taskId,
            then: thenCb(true),
            title: textsCap.saveOffChainData,
            type: QUEUE_TYPES.CHATCLIENT,
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

        // add requests to the queue
        this.setState({
            closeText: textsCap.close,
            loading: true,
            message: {
                header: textsCap.addedToQueue,
                icon: true,
                status: 'loading',
            },
            submitInProgress: true,
        })
        addToQueue(queueProps)
    }

    // forces assignee to be re-validated
    triggerAssigneeUpdate = deferred(() => {
        const assignee = this.rxAssignee.value
        this.rxAssignee.next('')
        setTimeout(() => this.rxAssignee.next(assignee))
    }, 300)

    validateAssignee = (_, { value: assignee }) => {
        if (!assignee) return

        const { address } = getSelected() || {}
        if (assignee === address) return textsCap.errAssginToSelf

        const partner = getPartner(assignee)
        const { userId } = partner || {}
        const userIdMissing = !!partner && !userId
        const handleClick = e => {
            e.preventDefault() // prevents form being submitted
            showForm(PartnerForm, {
                values: { address: assignee },
                onSubmit: this.triggerAssigneeUpdate
            })
        }
        
        return partner && userId
            ? null
            : (
                <div>
                    {userIdMissing
                        ? textsCap.errAsigneeNoUserId
                        : textsCap.errAssigneeNotPartner}
                    <div>
                        <Button {...{
                            content: userIdMissing
                                ? textsCap.updatePartner
                                : textsCap.addPartner,
                            onClick: handleClick,
                        }} />
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