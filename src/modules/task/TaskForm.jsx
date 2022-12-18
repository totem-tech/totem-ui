import React, { Component } from 'react'
import uuid from 'uuid'
import { Button } from 'semantic-ui-react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
// utils
import PromisE from '../../utils/PromisE'
import { copyRxSubject, iUseReducer, iUseState, subjectAsPromise, useRxSubject } from '../../utils/reactHelper'
import {
    blockToDate,
    format,
    dateToBlock,
} from '../../utils/time'
import {
    arrUnique,
    deferred,
    generateHash,
    isArr,
    isBool,
    isFn,
    isHash,
    isObj,
    isValidNumber,
    objClean,
} from '../../utils/utils'
// components
import FormBuilder, { findInput, fillValues, getValues } from '../../components/FormBuilder'
// services
import {
    hashTypes,
    queueables as bcQueueables,
    rxBlockNumber,
} from '../../services/blockchain'
import { translated } from '../../services/language'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { confirmAsPromise, showForm } from '../../services/modal'
// modules
import {
    convertTo,
    currencyDefault,
    rxSelected as rxSelectedCurrency,
} from '../currency/currency'
import Currency from '../currency/Currency'
import { asInlineLabel } from '../currency/CurrencyDropdown'
import { getById } from '../history/history'
import { Balance, rxBalances } from '../identity/Balance'
import { find as findIdentity, getSelected } from '../identity/identity'
import getPartnerOptions from '../partner/getPartnerOptions'
import PartnerForm from '../partner/PartnerForm'
import { get as getPartner, rxPartners } from '../partner/partner'
import {
    PRODUCT_HASH_LABOUR,
    queueableApis,
    queueables,
} from './task'
import { rxUpdater } from './useTasks'
import { statuses } from '../../components/Message'
import RxSubject from '../../components/RxSubject'

let textsCap = {
    addPartner: 'add partner',
    advancedLabel: 'advanced options',
    assignee: 'select a partner to assign task',
    assigneePlaceholder: 'select from partner list',
    assignToPartner: 'assign to a partner',
    balance: 'available balance',
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
    descLabel: 'detailed description',
    descLabelDetails: 'maximum characters',
    descPlaceholder: 'write detailed information about the task',
    errAssigneeNotPartner: 'assignee is not a partner!',
    errAsigneeNoUserId: 'partner does not have an User ID associated.',
    errAssginToSelf: 'you cannot assign a task to your currently selected identity',
    errDeadline: 'updates are not allowed after the deadline has passed',
    errTagsMaxLen: 'maximum number of tags',
    errTagsMaxChars: 'maximum number of characters',
    featureNotImplemented: 'This feature is yet to be implemented. Please stay tuned.',
    formHeader: 'create a new task',
    formHeaderUpdate: 'update task',
    goods: 'goods',
    insufficientBalance: 'insufficient balance',
    invalidDate: 'invalid date',
    inventory: 'inventory',
    isClosedLabel: 'accepting applications',
    marketplace: 'marketplace',
    marketplaceDisclaimer: `
        Your task will be published to the marketplace.
        Anyone using Totem will be able to submit proposal to this Task.
        You will then be able to accept or reject any application you wish.
    `,
    minBalanceRequired: 'minimum balance required',
    myself: 'myself',
    nofityAssignee: 'notify assignee',
    orderTypeLabel: 'order type',
    proposalLabel: 'require applicants to submit a proposal',
    publishToMarketPlace: 'publish to marketplace',
    taskIdParseError: 'failed to parse Task ID from transaction event data',
    service: 'service',
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
    currency: 'currency',
    currencyWrapper: 'currencyWrapper',
    dates: 'dates',
    deadline: 'deadline',
    dueDate: 'dueDate',
    description: 'description',
    orderType: 'orderType',
    isMarket: 'isMarket',
    isClosed: 'isClosed',
    isSell: 'isSell',
    parentId: 'parentId',
    productId: 'productId',
    proposalRequired: 'proposalRequired',
    tags: 'tags',
    title: 'title',
})
// keys used to generate BONSAI token hash
// keep it in the same order as in the `VALID_KEYS` array in the messaging service
export const bonsaiKeys = [
    inputNames.amountXTX,
    inputNames.currency,
    inputNames.deadline,
    inputNames.description,
    inputNames.dueDate,
    inputNames.isClosed,
    inputNames.isMarket,
    inputNames.isSell,
    inputNames.orderType,
    inputNames.parentId,
    inputNames.productId,
    inputNames.proposalRequired,
    inputNames.tags,
    inputNames.title,
]
export const getBonsaiData = (values, ownerAddress) => {
    const dbValues = objClean(values, bonsaiKeys)
    const tokenData = hashTypes.taskHash
        + ownerAddress
        + JSON.stringify(dbValues)
    const token = generateHash(tokenData)
    return [dbValues, token]
}

export default function TaskForm(props) {
    const {
        taskId,
        values: {
            allowEdit = true,
            deadline,
        } = {},
    } = props
    const [state] = iUseState(getInitialState(props))
    const [deadlinePassed] = !taskId
        ? [false]
        : useRxSubject(rxBlockNumber,
            block => deadline > 0 && block >= deadline,
        )
    const formProps = { ...props, ...state }

    if (allowEdit === false || deadlinePassed) {
        formProps.submitDisabled = true
        formProps.message = {
            content: textsCap.errDeadline,
            icon: true,
            status: statuses.ERROR,
        }
        formProps.inputsDisabled = Object.values(inputNames)
    }

    return <FormBuilder {...formProps} />
}
TaskForm.propTypes = {
    // use `1` to indicate acceptance & assignement of a marketplace task
    purpose: PropTypes.number,
    taskId: PropTypes.string,
    values: PropTypes.object,
}
TaskForm.defaultProps = {
    size: 'tiny',
}

const getInitialState = props => rxState => {
    const {
        header,
        inputsDisabled = [],
        taskId,
        values,
    } = props
    const isUpdate = !!taskId
    const rxAssignee = new BehaviorSubject()
    const rxCurrency = copyRxSubject(rxSelectedCurrency)
    const rxCurrencies = new BehaviorSubject()
    const rxDescription = new BehaviorSubject('')
    const rxTags = new BehaviorSubject([])
    const rxTagOptions = new BehaviorSubject([])
    // forces assignee to be re-validated
    const triggerAssigneeUpdate = deferred((_, { address }) => {
        const assignee = rxAssignee.value
        if (address && assignee !== address) return
        rxAssignee.next('')
        setTimeout(() => rxAssignee.next(assignee))
    }, 300)

    const inputs = [
        {
            hidden: true,
            name: inputNames.parentId,
        },
        {
            rxValue: new BehaviorSubject(false),
            inline: true,
            label: textsCap.marketplace,
            multiple: false,
            name: inputNames.isMarket,
            options: [
                { label: textsCap.assignToPartner, value: false },
                { label: textsCap.publishToMarketPlace, value: true },
            ],
            radio: true,
            required: true,
            type: 'checkbox-group',
        },
        {
            falseValue: true, // value when unchecked
            hidden: values => !taskId || !values[inputNames.isMarket],
            label: textsCap.isClosedLabel,
            name: inputNames.isClosed,
            toggle: true,
            trueValue: false, // value when checked
            type: 'checkbox',
        },
        {
            rxValue: new BehaviorSubject(),
            hidden: values => !!values[inputNames.isMarket],
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
                { onSubmit: triggerAssigneeUpdate },
            ),
            rxValue: rxAssignee,
            selection: true,
            search: ['keywords'],
            type: 'dropdown',
            validate: (_, { value: assignee }) => {
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
                        onSubmit: triggerAssigneeUpdate
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
            },
        },
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
            ...asInlineLabel({
                disabled: isUpdate,
                onCurrencies: currencies => {
                    rxCurrencies.next(currencies)
                    const { loading } = state
                    loading.currencies = false
                    rxState.next({ loading })
                },
                rxValue: rxCurrency,
            }),
            label: textsCap.bountyLabel,
            maxLength: 18,
            min: 0, // allows bounty-free tasks
            name: inputNames.bounty,
            onChange: !taskId && handleBountyChange(props, rxState),
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
                const { inputs } = rxState.value
                const currency = values[inputNames.currency]
                const bounty = values[inputNames.bounty]
                const bountyIn = findInput(inputs, inputNames.bounty)
                const currencies = await subjectAsPromise(rxCurrencies, isArr)[0]
                const { decimals = 0 } = currencies.find(x => x.currency === currency) || {}
                bountyIn.decimals = parseInt(decimals || '') || 0
                bountyIn.message = null
                rxState.next({ inputs })
                
                // trigger re-validation
                bountyIn.rxValue.next('')
                bountyIn.rxValue.next(bounty)
            },
            rxValue: rxCurrency,
        },
        {// hidden type to store bounty in XTX (regardless of display currency selected)
            hidden: true,
            name: inputNames.amountXTX,
            required: true,
            rxValue: new BehaviorSubject(0),
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
                        const { taskId } = props
                        const { inputs } = rxState.value
                        let dueDate = values[inputNames.dueDate]
                        const deadline = values[inputNames.deadline]
                        const dueDateIn = findInput(inputs, inputNames.dueDate)
                        if (!dueDate || !taskId) {
                            // reset 1 day after deadline if not already set or creating new task
                            const date = strToDate(deadline)
                            date.setSeconds(date.getSeconds() + dueDateMinMS / 1000 + 1)
                            dueDate = format(date).substring(0, 10)
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
                    name: inputNames.productId,
                    type: 'hidden',
                    value: PRODUCT_HASH_LABOUR,
                },
                {
                    hidden: values => !values[inputNames.isMarket],
                        label: textsCap.proposalLabel,
                    name: inputNames.proposalRequired,
                    toggle: true,
                    type: 'checkbox',
                },
                {
                    disabled: true,
                    hidden: values => !values[inputNames.isMarket], 
                    inline: true,
                    label: textsCap.orderTypeLabel,
                    name: inputNames.orderType,
                    options: [
                        { label: textsCap.service, value: 0 },
                        { label: textsCap.inventory, value: 1 },
                        { label: textsCap.goods, value: 2 },
                    ],
                    radio: true,
                    type: 'checkbox-group',
                    value: 0, // default: service
                },
                {
                    customMessages: {
                        lengthMin: true,
                    },
                    label: textsCap.descLabel,
                    labelDetails: (
                        <RxSubject {...{
                            subject: rxDescription,
                            valueModifier: (desc = '') => (
                                <div style={{
                                    bottom: 0,
                                    color: !desc || (desc.length < 1800 && desc.length >= 50)
                                        ? 'grey'
                                        : desc.length >= 1800 && desc.length < 2000
                                            ? 'orange'
                                            : 'red',
                                    fontWeight: 'bold',
                                    position: 'absolute',
                                    right: 18,
                                }}>
                                    {desc.length}/2000
                                </div>
                            ),
                        }} />
                    ),
                    maxLength: 2000,
                    minLength: 50,
                    name: inputNames.description,
                    placeholder: `${textsCap.descPlaceholder} (50-2000)`,
                    required: false,
                    rxValue: rxDescription,
                    style: { minHeight: 150 },
                    styleContainer: { position: 'relative' },
                    type: 'textarea',
                },
                {
                    allowAdditions: true,
                    customMessages: {
                        lengthMax: textsCap.errTagsMaxLen,
                    },
                    label: textsCap.tags,
                    maxLength: 6,
                    multiple: true,
                    name: inputNames.tags,
                    noResultsMessage: textsCap.tagsNoResultMsg,
                    onAddItem: (_, { value = '' }) => {
                        const newTag = [...value.match(/[a-z0-9]/ig)]
                            .filter(Boolean)
                            .join('')
                            .toLowerCase()
                        
                        newTag !== value && rxTags.next(
                            rxTags
                                .value
                                .concat(newTag)
                                .filter(x => !!x && x !== value)
                        )
                        const tags = arrUnique([
                            ...rxTagOptions.value,
                            newTag,
                        ])
                            .filter(Boolean)
                            .sort()
                        rxTagOptions.next(tags)
                    },
                    options: [],
                    rxOptions: rxTagOptions,
                    rxOptionsModifier: tags => arrUnique(tags)
                        .map(value => ({
                            key: value,
                            text: value,
                            value,
                        })),
                    rxValue: rxTags,
                    placeholder: textsCap.tagsPlaceholder,
                    selection: true,
                    search: true,
                    type: 'dropdown',
                    validate: (_, { value = '' }) => {
                        const invalid = value
                            .join('')
                            .length > 64
                        return invalid && `${textsCap.errTagsMaxChars}: 32`
                    }
                },
            ],
        },
    ]
    const state = {
        bountyDeferred: PromisE.deferred(),
        disabled: true,
        header: header || (
            isObj(values) && !!taskId
                ? textsCap.formHeaderUpdate
                : textsCap.formHeader
        ),
        isUpdate,
        loading: {
            currencies: true,
            onMount: true,
        },
        submitDisabled: {
            isClosed: (values || {}).isClosed,
            unchanged: !!taskId,
        },
        onSubmit: handleSubmit(props, rxState),
        inputs,
    }

    if (!!taskId) {
        // disables submit button if values unchanged
        // ToDo: not working due to isClose value change somewhere!!!!
        state.onChange = deferred((_, newValues) => {
            const { oldValues, submitDisabled } = rxState.value
            if (!oldValues) return
            newValues = objClean(newValues, Object.values(inputNames))
            submitDisabled.unchanged = JSON.stringify(oldValues) === JSON.stringify(newValues)
            rxState.next({ submitDisabled })
        }, 300)
    }

    const init = async () => {
        const { loading } = state
        const bountyIn = findInput(inputs, inputNames.bounty)
        if (!isObj(values) || !Object.keys(values).length) {
            loading.onMount = false
            return rxState.next({ inputs, loading })
        }

        values[inputNames.currency] = values[inputNames.currency]
            || rxSelectedCurrency.value
        const currentBlock = await subjectAsPromise(rxBlockNumber)[0]
        const amountXTX = values[inputNames.amountXTX]
        const currency = values[inputNames.currency]
        const deadline = values[inputNames.deadline]
        const dueDate = values[inputNames.dueDate]
        const tags = values[inputNames.tags] || []
        values[inputNames.tags] = tags
        // convert duedate and deadline block numbers to date format yyyy-mm-dd
        if (deadline) values.deadline = blockToDate(deadline, currentBlock, true, 10)
        if (dueDate) values.dueDate = blockToDate(dueDate, currentBlock, true, 10)

        tags.length && rxTagOptions.next(tags)

        loading.onMount = false
        // state = { inputs, loading }
        state.inputsDisabled = isUpdate
            ? arrUnique([
                ...inputsDisabled,
                inputNames.isMarket,
                inputNames.assignee,
                inputNames.bounty,
                inputNames.deadline,
                inputNames.dueDate,
            ])
            : inputsDisabled

        if (!values.bounty && currency === currencyDefault) {
            values.bounty = amountXTX
        } else {
            // convert bounty amount from default currency to task currency
            const [bounty, bountyStr] = await convertTo(
                amountXTX,
                currencyDefault,
                currency,
            )
            bounty && bountyIn
                .rxValue
                .next(Number(bountyStr))
        }

        state.oldValues = objClean(
            getValues(inputs, values),
            Object.values(inputNames),
        )
        fillValues(inputs, state.oldValues, true)
        rxState.next({...state})
    }

    // timeout required to reduce lag on startup
    setTimeout(() => init().catch(console.error))
    return state
}

// check if user has enough balance for the transaction including pre-funding amount (bounty)
// Two different deferred mechanims used here:
// 1. deferred: to delay currency conversion while user is typing
// 2. PromisE.deferred: makes sure even if deferred (1) resolves multiple times, only last execution is applied
//          Eg: user types slowly and / or network is slow
const handleBountyChange = (props, rxState) => deferred((_, values) => {
    const { taskId, values: valuesOrg } = props
    const { amountXTX: bountyOriginal } = valuesOrg || {}
    const bounty = values[inputNames.bounty]     
    const {
        bountyDeferred,
        inputs,
        submitDisabled,
    } = rxState.value
    const amountXTXIn = findInput(inputs, inputNames.amountXTX)
    const bountyIn = findInput(inputs, inputNames.bounty)
    const valid = isValidNumber(bounty)
    const currency = values[inputNames.currency]
    const { address } = getSelected()
    bountyIn.loading = valid
    bountyIn.invalid = false
    bountyIn.message = null
    submitDisabled.bounty = valid
    rxState.next({ inputs, submitDisabled })
    if (taskId && bounty === bountyOriginal) return
    if (!valid) return bountyDeferred(Promise.reject(null))

    const promise = new Promise(async (resolve, reject) => {
        try {
            // wait until balance is retrieved
            const balances = await subjectAsPromise(
                rxBalances,
                balances => isValidNumber(balances.get(address)),
            )[0]
            // user account balance
            const freeBalance = balances.get(address)
            // no need to convert currency if amount is zero or XTX is the selected currency
            const requireConversion = bounty && currency !== currencyDefault
            // amount in TOTEM
            const amount = !requireConversion
                ? [bounty, bounty]
                : await convertTo(
                    bounty,
                    currency,
                    currencyDefault,
                )
            resolve([parseInt(amount[0]), freeBalance])
        } catch (e) { reject(e) }
    })
    const handleBountyResult = result => {
        const [bountyAmount, freeBalance] = result || []
        const bountyAmountWithFees = bountyAmount
            + estimatedTxFee
            + minBalanceAterTx
        const gotBalance = (freeBalance - bountyAmountWithFees) >= 0
        amountXTXIn.rxValue.next(bountyAmount)
        bountyIn.invalid = !gotBalance
        bountyIn.message = {
            content: (
                <div>
                    <div title={`${textsCap.balance}: ${freeBalance} ${currencyDefault} `}>
                        <Balance {...{
                            address,
                            prefix: `${textsCap.balance}: `,
                            unit: currencyDefault,
                            unitDisplayed: currency,
                        }} />
                    </div>
                    <div title={`${textsCap.minBalanceRequired}: ${bountyAmountWithFees} ${currencyDefault}`}>
                        <Currency {... {
                            prefix: `${textsCap.minBalanceRequired}: `,
                            value: bountyAmountWithFees,
                            unit: currencyDefault,
                            unitDisplayed: currency,
                        }} />
                    </div>
                </div>
            ),
            header: !gotBalance
                ? textsCap.insufficientBalance
                : undefined,
            status: gotBalance
                ? 'success'
                : 'error',
        }
        bountyIn.loading = false

        submitDisabled.bounty = false
        rxState.next({ inputs, loading: false, submitDisabled })
    }
    const handleErr = err => {
        bountyIn.invalid = !!err
        bountyIn.message = err && {
            content: `${err} `,
            header: textsCap.conversionErrorHeader,
            status: 'error'
        }
        submitDisabled.bounty = false
        rxState.next({
            inputs,
            loading: false,
            submitDisabled,
        })
    }
    bountyDeferred(promise)
        .then(handleBountyResult, handleErr)
}, 300)

const handleSubmit = (props = {}, rxState) => async (_, values) => {
    let {
        onSubmit,
        purpose,
        taskId,
        values: {
            owner = getSelected().address,
        } = {},
    } = props || {}
    const { isUpdate } = rxState.value
    // convert deadline & dueDate string date to block number
    const currentBlock = await subjectAsPromise(rxBlockNumber)[0]
    const deadlineN = inputNames.deadline
    const dueDateN = inputNames.dueDate
    values = objClean(values, Object.keys(values).sort())
    values[deadlineN] = dateToBlock(
        values[deadlineN] + 'T00:00', // use local time instead of UTC
        currentBlock,
    )
    values[dueDateN] = dateToBlock(
        values[dueDateN] + 'T00:00', // use local time instead of UTC
        currentBlock,
    )
    const ownerAddress = owner
    const amountXTX = values[inputNames.amountXTX]
    const deadline = values[deadlineN]
    const dueDate = values[dueDateN]
    const description = values[inputNames.title]
    const isMarket = values[inputNames.isMarket]
    const fulfiller = isMarket
        ? ownerAddress
        : values[inputNames.assignee]
    const isSell = values[inputNames.isSell]
    const title = values[inputNames.title]
    const parentId = values[inputNames.parentId]
    const [dbValues, token] = getBonsaiData(values, ownerAddress)
    const nameCreateTask = 'createTask'
    const nameSaveTask = 'saveTask'
    const queueId = uuid.v1()
    const orderType = values[inputNames.orderType]
    const handleResult = isLastInQueue => (success, err) => {
        if (!isLastInQueue && success) return
        rxState.next({
            closeText: success
                ? textsCap.close
                : undefined,
            loading: false,
            message: {
                content: !success && `${err} `, // error can be string or Error object.
                header: success
                    ? isUpdate 
                        ? textsCap.updateSuccess
                        : textsCap.createSuccess
                    : isUpdate 
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

        // force `useTask` hook to update the off-chain data for this task only
        taskId = taskId || (getById(queueId) || { data: [] }).data[0]
        isHash(taskId) && rxUpdater.next([taskId])
        isFn(onSubmit) && onSubmit(success, values, taskId)
    }
    const fn = !isUpdate
        ? queueables.saveSpfso
        : bcQueueables.bonsaiSaveToken
    const extraProps = {
        description,
        name: nameCreateTask,
        title: !isUpdate
            ? textsCap.formHeader
            : textsCap.formHeaderUpdate,
        then: handleResult(false),
    }
    const queueProps = fn.apply(null, !isUpdate
        ? [
            ownerAddress,
            ownerAddress,
            fulfiller,
            isSell,
            isMarket
                ? 1 // set the minimum amount for the advert
                : amountXTX,
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
        func: queueableApis.updateDetails,
        name: nameSaveTask,
        recordId: taskId,
        then: handleResult(true),
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

    if (!isUpdate && !!parentId) {
        // assigning marketplace task to an applicant
        queueProps.recordId = parentId
        queueProps.recordId = parentId
    }

    // notify assignee on creation only
    if (!taskId && !findIdentity(fulfiller)) {
        const { userId } = getPartner(fulfiller) || {}
        queueProps.next.next = userId && {
            args: [
                [userId],
                'task',
                'assignment',
                null,
                {
                    __taskName: nameSaveTask,
                    // grab the taskId from the save previous item in the queue chain
                    __resultSelector: `(r, rt, offchainTask) => ({
                        fulfillerAddress: "${fulfiller}",
                        purpose: ${purpose},
                        taskId: offchainTask.argsProcessed[0],
                    })`,
                },
            ],
            description: title,
            func: 'notify',
            title: textsCap.nofityAssignee,
            type: QUEUE_TYPES.CHATCLIENT,
        }
    }
    const confirmed = !!taskId || !isMarket || await confirmAsPromise({
        content: textsCap.marketplaceDisclaimer,
        header: textsCap.publishToMarketPlace,
        size: 'mini',
    })
    if (!confirmed) return

    rxState.next({
        closeText: textsCap.close,
        loading: true,
        submitInProgress: true,
    })
    // add requests to the queue
    addToQueue(queueProps)
}