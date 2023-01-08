import React from 'react'
import uuid from 'uuid'
import { Button } from 'semantic-ui-react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
// utils
import PromisE from '../../utils/PromisE'
import {
    copyRxSubject,
    iUseState,
    subjectAsPromise,
    useRxSubject,
} from '../../utils/reactHelper'
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
    isFn,
    isHash,
    isValidNumber,
    objClean,
    objWithoutKeys,
} from '../../utils/utils'
// components
import FormBuilder, {
    findInput,
    fillValues,
} from '../../components/FormBuilder'
import { statuses } from '../../components/Message'
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
    publishOrder: 'publish a new marketplace order',
    publishToMarketPlace: 'publish to marketplace',
    taskIdParseError: 'failed to parse Task ID from transaction event data',
    service: 'service',
    saveOffChainData: 'save off-chain data',
    tags: 'categorise with tags',
    tagsNoResultMsg: 'type tag and press ENTER to add',
    tagsPlaceholder: 'enter tags',
    title: 'title',
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
        values = {},
    } = props
    const { allowEdit = true, deadline } =  values
    const [state] = iUseState(getInitialState(props))
    const [deadlinePassed] = !taskId
        ? [false]
        : useRxSubject(
            rxBlockNumber,
            block => deadline > 0
                && block >= deadline,
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
        inputsReadOnly = [],
        taskId,
        values = {},
    } = props
    const isUpdate = !!taskId
    const rxAssignee = new BehaviorSubject()
    const rxCurrency = copyRxSubject(rxSelectedCurrency)
    const rxCurrencies = new BehaviorSubject()
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
            rxValue: new BehaviorSubject(false),
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
            validate: handleAssigneeValidate,
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
                disabled: isUpdate || [
                    ...inputsDisabled,
                    ...inputsReadOnly,
                ].includes(inputNames.bounty),
                // callback when currency list is loaded
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
            onChange: !taskId && handleBountyChangeCb(props, rxState),
            placeholder: textsCap.bountyPlaceholder,
            rxValue: new BehaviorSubject(),
            required: true,
            type: 'number',
            useInput: true,
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
                    onChange: handleDeadlineChangeCb(taskId, rxState),
                    required: true,
                    type: 'date',
                    validate: handleDeadlineValidate,
                },
                {
                    disabled: values => !values[inputNames.deadline],
                    // hidden: values => !values[inputNames.deadline], // hide if deadline is not selected
                    label: textsCap.dueDateLabel,
                    name: inputNames.dueDate,
                    required: true,
                    rxValue: new BehaviorSubject(),
                    type: 'date',
                    validate: handleDueDateValidate,
                },
            ],
        },
        {
            // Advanced section (Form type "group" with accordion)
            accordion: {
                collapsed: !values[inputNames.isMarket],
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
                    rxValue: new BehaviorSubject(true),
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
                    maxLength: 2000,
                    minLength: 50,
                    name: inputNames.description,
                    placeholder: `${textsCap.descPlaceholder} (50-2000)`,
                    required: false,
                    style: { minHeight: 150 },
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
                    onAddItem: handleTagsAddCb(rxTags, rxTagOptions),
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
                    validate: (_, { value = '' }) => value
                        .join('')
                        .length > 64
                        && `${textsCap.errTagsMaxChars}: 32`
                },
            ],
        },
    ]
    const state = {
        bountyDeferred: PromisE.deferred(),
        disabled: true,
        header: header || (
            !!taskId
                ? textsCap.formHeaderUpdate
                : values[inputNames.isMarket]
                    ? textsCap.publishOrder
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
        // disables submit button if values unchanged
        // ToDo: not working due to isClose value change somewhere!!!!
        onChange: !!taskId && deferred((_, newValues) => {
            const { oldValues, submitDisabled } = rxState.value
            if (!oldValues) return
            newValues = objClean(newValues, Object.values(inputNames))
            submitDisabled.unchanged = JSON.stringify(oldValues) === JSON.stringify(newValues)
            rxState.next({ submitDisabled })
        }, 300),
        onSubmit: handleSubmit(props, rxState),
        inputs: fillValues(
            inputs,
            objWithoutKeys(values, [
                // to be filled later (below)
                inputNames.bounty,
                inputNames.dueDate,
                inputNames.deadline,
            ]),
            true,
            true,
        ),
    }

    const init = async () => {
        const { loading } = state
        const bountyIn = findInput(inputs, inputNames.bounty)
        const deadlineIn = findInput(inputs, inputNames.deadline)
        const dueDateIn = findInput(inputs, inputNames.dueDate)
        values[inputNames.currency] = values[inputNames.currency]
            || rxSelectedCurrency.value
        const currentBlock = await subjectAsPromise(rxBlockNumber)[0]
        const amountXTX = values[inputNames.amountXTX]
        const currency = values[inputNames.currency]
        const deadline = values[inputNames.deadline]
        const dueDate = values[inputNames.dueDate]
        const tags = values[inputNames.tags] || []
        values[inputNames.tags] = tags
        tags.length && rxTagOptions.next(tags)
        // convert duedate and deadline block numbers to date format yyyy-mm-dd
        if (deadline) deadlineIn.rxValue.next(
            blockToDate(
                deadline,
                currentBlock,
                true,
                10,
            )
        )
        if (dueDate) dueDateIn.rxValue.next(
            blockToDate(
                dueDate,
                currentBlock,
                true,
                10,
            )
        )

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

        let bounty
        if (currency === currencyDefault) {
            bounty = amountXTX
        } else {
            // convert bounty amount from default currency to task currency
            const [bountyNum, bountyRounded] = await convertTo(
                amountXTX,
                currencyDefault,
                currency,
                undefined,
                undefined,
                0
            )
            bounty = !!values.amountXTX || bountyNum
                ? Number(bountyRounded) || bountyNum // if after conversion amount is too small use unrounded value
                : undefined
        }
        values[inputNames.bounty] = bounty
        setTimeout(() => {
            // without timeout, it can cause a race condition
            bounty && bountyIn.rxValue.next(bounty)
        }, 150)

        state.oldValues = objClean(
            values,
            Object.values(inputNames),
        )
        loading.onMount = false
        rxState.next({...state})
    }
    
    setTimeout(() => init().catch(console.error))
    return state
}

const handleAssigneeValidate = (_, { value: assignee }) => {
    if (!assignee) return

    const { address } = getSelected() || {}
    if (assignee === address) return textsCap.errAssginToSelf

    const partner = getPartner(assignee)
    const { userId } = partner || {}
    const userIdMissing = !!partner && !userId
    
    return (!partner || !userId) && (
        <div>
            {userIdMissing
                ? textsCap.errAsigneeNoUserId
                : textsCap.errAssigneeNotPartner}
            <div>
                <Button {...{
                    content: userIdMissing
                        ? textsCap.updatePartner
                        : textsCap.addPartner,
                    onClick: e => {
                        e.preventDefault() // prevents form being submitted
                        showForm(PartnerForm, {
                            values: { address: assignee },
                            onSubmit: triggerAssigneeUpdate
                        })
                    },
                }} />
            </div>
        </div>
    )
}

const handleDeadlineChangeCb = (taskId, rxState) => (_, values) => {
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
}

const handleDeadlineValidate = (_, { value: deadline }) => {
    if (!deadline) return

    const diffMS = strToDate(deadline) - new Date()
    return diffMS < deadlineMinMS && textsCap.deadlineMinErrorMsg
}

const handleDueDateValidate = (_, { value: dueDate }, values) => {
    if (!dueDate) return
    const deadline = values[inputNames.deadline]
    const diffMS = strToDate(dueDate) - strToDate(deadline)
    return diffMS < dueDateMinMS && textsCap.dueDateMinErrorMsg
}

// check if user has enough balance for the transaction including pre-funding amount (bounty)
// Two different deferred mechanims used here:
// 1. deferred: to delay currency conversion while user is typing
// 2. PromisE.deferred: makes sure even if deferred (1) resolves multiple times, only last execution is applied
//          Eg: user types slowly and / or network is slow
const handleBountyChangeCb = (props, rxState) => deferred((_, values) => {
    const {
        bountyDeferred,
        inputs,
        submitDisabled,
    } = rxState.value
    const { address } = getSelected()
    const amountXTXIn = findInput(inputs, inputNames.amountXTX)
    const bountyIn = findInput(inputs, inputNames.bounty)
    const { taskId, values: valuesOrg } = props
    const { amountXTX: bountyOriginal } = valuesOrg || {}
    const isMarket = values[inputNames.isMarket]
    const bounty = values[inputNames.bounty]     
    const currency = values[inputNames.currency]
    const valid = isValidNumber(bounty)
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
        const bountyAmountWithFees = (isMarket ? 1 : bountyAmount)
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
}, 100)

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
            // set the minimum amount for the advert
            isMarket
                ? 1
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
                        purpose: ${purpose || 0},
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

const handleTagsAddCb = (rxValue, rxOptions) => (_, { value = '' }) => {
    const newTag = [...value.match(/[a-z0-9]/ig)]
        .filter(Boolean)
        .join('')
        .toLowerCase()
    
    newTag !== value && rxValue.next(
        rxValue
            .value
            .concat(newTag)
            .filter(x => !!x && x !== value)
    )
    const tags = arrUnique([
        ...rxOptions.value,
        newTag,
    ])
        .filter(Boolean)
        .sort()
    rxOptions.next(tags)
}
