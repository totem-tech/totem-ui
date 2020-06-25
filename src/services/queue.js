/*
 * Queue service to queue processes to be run and resurrected (if needed) in the background
 */
import React from 'react'
import uuid from 'uuid'
import { addressToStr } from '../utils/convert'
import DataStorage from '../utils/DataStorage'
import { transfer, signAndSend } from '../utils/polkadotHelper'
import { hasValue, isArr, isFn, isObj, isStr, objClean, isValidNumber } from '../utils/utils'
// services
import { getClient } from './chatClient'
import { currencyDefault } from './currency'
import { getConnection } from './blockchain'
import { save as addToHistory } from './history'
import { find as findIdentity, getSelected } from './identity'
import { getAddressName } from './partner'
import { translated } from './language'
import { setToast } from './toast'

const queue = new DataStorage('totem_queue-data')
// Minimum balance required to make a transaction
const MIN_BALANCE = 140 // an guesstimated transaction fee. PolkadotJS V2 required to pre-calculate fee.
const inprogressIds = {}
const [words, wordsCap] = translated({
    amount: 'amount',
    error: 'error',
    failed: 'failed',
    inProgress: 'in-progress',
    or: 'or',
    otherwise: 'otherwise',
    sender: 'sender',
    recipient: 'recipient',
    success: 'success',
    successful: 'successful',
    transaction: 'transaction',
    transactions: 'transactions',
}, true)
const [texts] = translated({
    insufficientBalance: 'Insufficient balance',
    txForeignIdentity: 'Cannot create a transaction from an identity that does not belong to you!',
    txInvalidSender: 'Invalid or no sender address supplied',
    invalidFunc: 'Invalid function name supplied.',
    txTransferTitle: 'Transfer funds',
    txTransferMissingArgs: 'One or more of the following arguments is missing or invalid: sender identity, recipient identity and amount',
})

// if one or more tasks in progress, warn before user attempts to leave/reload page
window.addEventListener('beforeunload', function (e) {
    if (Object.keys(inprogressIds).length === 0) return
    // Cancel the event
    e.preventDefault() // If you prevent default behavior in Mozilla Firefox prompt will always be shown
    // Chrome requires returnValue to be set
    e.returnValue = ''
})

export const QUEUE_TYPES = Object.freeze({
    CHATCLIENT: 'chatclient',
    BLOCKCHAIN: 'blockchain', // deprecated
    // transaction to transfer funds
    TX_TRANSFER: 'tx_transfer', // todo use polkadot for tx
    // transaction to create/update storage data
    TX_STORAGE: 'tx_storage',
})

export const addToQueue = (queueItem, id, toastId) => {
    // prevent adding the same task again
    if (queue.get(id)) return;
    id = id || uuid.v1()
    toastId = toastId || uuid.v1()
    const validKeys = [
        // @type            string: name of the service. Currently supported: blockchain, chatclient
        'type',
        // @args            array: arguments to be supplied to func
        'args',
        // @func            string  : name of the function to be excuted. Depends on the @type of the task.
        //                          1. TX_TRANSER: 
        //                          2. TX_STORAGE: path to the PolkadotJS API function as string. Eg: 'api.tx.timekeeping.authoriseTime'
        //                          3. CHATCLIENT: chat client instances method property name
        'func',
        // @then            function: Callback to be executed once task execution is done (status: 'success' or 'error').
        //                          Not preserved on page reload
        //                          Arguments:
        //                          @success    boolean: indicates success/failure of the task
        //                          @args       array: arguments returned by invoking @func
        'then',
        // @address         string: address to initiate a transaction with.
        //                          Required for transaction types. 
        'address',
        // @amountXTX       number: minimum required amount in addition to transactin fee
        'amountXTX',
        // @title           string: short title for the task. Eg: 'Create project'
        'title',
        // @description     string: short description about the task to very briefly describle what this task is about/for. Eg: project name etc.
        //                          if a child task and title not supplied will use the root task's title and description. 
        //                          Root task is the very first task in a queue item.
        'description',
        // @toastId         string: (optional) if a valid existing toast ID is supplied will replace/re-use the toast message instead of creating a new toast.
        //                          If not supplied, a new ID will be generated.
        //                          Only root task's toast ID will be used. Child tasks will inherit the root task's toast ID.
        'toastId',
        // @toastDuration   number: (optional) duration, in milliseconds, of toast message visibility.
        //                          - 0 (zero) : implies no auto close. User has to manually close by clicking on the close (x) icon.
        //                          - undefined/falsy : will use default value set in the Toast service
        'toastDuration',
        // @silent          bool: (optional) If true, enables silent mode and no toast messages will be displayed.
        //                          This is particularly usefull when executing tasks that user didn't initiate or should not be bothered with.
        'silent',
        // @status          string: (internal) indicates the status of the queue item.
        //                          Uses the same status strings as toast messages to display relevant background color.
        //                          Typically, status will be set by the queue service.
        //                          However, by resetting status to undefined will force the queue service to attempt to execute this task again.
        //                          Please read the `statuses used` bellow to understand the implications of setting a status manually.
        //
        //                          Statuses used:
        //                          - 'error'  : task execution failed. User can force execute
        //                          - 'loading': task is currently being executed. If page is reloaded with this state, it will be executed again on page reload
        //                          - 'success': task completed successfully.
        //                          - undefined/falsy: task execution was never attempted. This is typically the inital status.
        'status',
        // @errorMessage   string: (internal) if an error occured during execution or task failed with an error message will be stored here.
        'errorMessage',
        // @next            object: (optional) next task in this queue. Same keys as @validKeys
        //                          Will only be executed if the parent task was successful.
        'next',
    ]

    queueItem = objClean(queueItem, validKeys)
    queue.set(id, queueItem)
    setTimeout(() => _processTask(queueItem, id, toastId))
    return id
}

export const resumeQueue = () => {
    const queueItems = queue.getAll()
    if (!queueItems.size) return
    Array.from(queueItems)
        .forEach((x, i) =>
            setTimeout(() => _processTask(x[1], x[0], null, true))
        )
}

const _processTask = (currentTask, id, toastId, allowRepeat) => {
    toastId = toastId || uuid.v1()
    if (!isObj(currentTask)) return queue.delete(id)

    const next = currentTask.next
    switch (currentTask.status) {
        case SUCCESS:
            // execute `next` or delete queue item
            if (isObj(next)) return _processTask(next, id, toastId, allowRepeat)
        case ERROR:
            return queue.delete(id)
        case LOADING:
            currentTask.status = allowRepeat ? undefined : LOADING
            // repeat current task (ie: on page reload) or ignore and assume it's currently running
            return allowRepeat && _processTask(currentTask, id, toastId, allowRepeat)
    }

    // Execute current task
    const rootTask = queue.get(id)
    let { args, description, id: cid, title } = currentTask
    currentTask.args = isArr(args) ? args : [args]
    currentTask.description = description || rootTask.description
    currentTask.silent = currentTask.silent || rootTask.silent
    currentTask.title = title || rootTask.title
    currentTask.id = cid || uuid.v1()
    switch ((currentTask.type || '').toLowerCase()) {
        case QUEUE_TYPES.TX_TRANSFER:
            handleTxTransfer(id, rootTask, currentTask, toastId)
            break
        case QUEUE_TYPES.TX_STORAGE:
            handleTxStorage(id, rootTask, currentTask, toastId)
            break
        case QUEUE_TYPES.CHATCLIENT:
            handleChatClient(id, rootTask, currentTask, toastId)
            break
        case QUEUE_TYPES.BLOCKCHAIN:
            alert('deprecated queue type used')
        default:
            // invalid queue type
            queue.delete(id)
            break
    }
}

const statusTitles = {
    loading: words.inProgress,
    success: words.successful,
    error: words.error,
}
const ERROR = 'error'
const SUCCESS = 'success'
const LOADING = 'loading'
const attachKey = (ar = []) => !isArr(ar) ? ar : (
    <div>
        {ar.filter(Boolean).map((x, i) => (
            <div key={i} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{x}</div>
        ))}
    </div>
)
const setMessage = (task, msg = {}, duration, id, silent = false) => silent ? null : setToast({
    ...msg,
    content: msg.content ? attachKey(msg.content) : task.description,
    header: `${msg.header || task.title}: ${task.type.startsWith('tx_') ? words.transaction : ''} ${statusTitles[task.status]}`,
    status: task.status,
}, duration, id)

const setToastNSaveCb = (id, rootTask, task, status, msg = {}, toastId, silent, duration) => function () {
    const cbArgs = arguments
    const errMsg = status === ERROR ? cbArgs[0] : ''
    const done = [SUCCESS, ERROR].includes(status)
    const success = status === SUCCESS
    task.status = status
    task.errorMessage = !isStr(errMsg) ? undefined : errMsg
    const hasError = status === ERROR && task.errorMessage

    hasError && msg.content.unshift(task.errorMessage)
    task.toastId = setMessage(task, msg, duration, toastId, silent)

    // save progress
    queue.set(id, rootTask)

    if (!status === LOADING) {
        inprogressIds[id] = true
    }

    const { args, description, errorMessage, func, title, type } = task
    addToHistory(
        [QUEUE_TYPES.TX_STORAGE, QUEUE_TYPES.TX_TRANSFER].includes(type) ? task.address : getSelected().address,
        (type === QUEUE_TYPES.CHATCLIENT ? 'client.' : '') + func,
        args,
        title,
        description,
        status,
        errorMessage,
        id,
        task.id,
    )

    if (!done) return
    delete inprogressIds[id]

    try {
        isFn(task.then) && task.then(success, cbArgs)
    } catch (err) {
        // ignore any error occured by invoking the `then` function
        console.log('Unexpected error occured while executing queue .then()', { rootTask, err })
    }

    // execute next only if current task is successful
    success && isObj(task.next) && _processTask(task.next, id, toastId)

    // delete root item if no error occured
    queue.delete(id)
}


const handleChatClient = (id, rootTask, task, toastId) => {
    const { args, description, title, silent, toastDuration } = task
    const client = getClient()
    const msg = {
        content: [description],
        header: title,
    }
    const _save = status => arg0 => setToastNSaveCb(
        id, rootTask, task, status, msg, toastId, silent, toastDuration
    )(arg0)

    try {
        let func = task.func
        func = (func.startsWith('client.') ? '' : 'client.') + func
        func = eval(func)
        eval(client) // just make sure client variable isn't removed by accident
        if (!isFn(func)) return _save(ERROR)(texts.invalidFunc)
        _save(LOADING)()
        // initiate request
        func.promise.apply(null, args).then(_save(SUCCESS), _save(ERROR))
    } catch (err) {
        _save(ERROR)(err)
    }
}

const handleTxTransfer = async (id, rootTask, task, toastId) => {
    // convert addresses to string. if invalid will be empty string.
    // sender address
    task.address = addressToStr(task.address)
    // recipient address
    task.args[0] = addressToStr(task.args[0])

    const { address: senderAddress, args, silent, toastDuration } = task
    const [recipientAddress, amount] = args
    const sender = findIdentity(senderAddress)
    const invalid = !senderAddress || !recipientAddress || !amount
    const msg = {
        content: [
            `${wordsCap.sender}: ${sender.name}`,
            `${wordsCap.recipient}: ${getAddressName(recipientAddress)}`,
            `${wordsCap.amount}: ${amount} ${currencyDefault}`,
        ],
        header: texts.txTransferTitle
    }
    task.title = texts.txTransferTitle
    task.description = msg.content.join('\n')
    task.func = 'api.tx.balances.transfer'
    const _save = status => arg0 => setToastNSaveCb(
        id, rootTask, task, status, msg, toastId, silent, toastDuration
    )(arg0)

    _save(!sender || invalid ? ERROR : LOADING)(
        !sender ? texts.txForeignIdentity : (invalid ? texts.txTransferMissingArgs : '')
    )
    if (!sender || invalid) return
    let api
    try {
        api = (await getConnection()).api
    } catch (err) {
        console.log('handleTxTransfer: connectcion error', err)
        return
    }

    try {
        _save(LOADING)()
        const result = await transfer(
            recipientAddress,
            amount,
            senderAddress,
            null,
            api
        )
        _save(SUCCESS)(result)
    } catch (err) {
        _save(ERROR)(err)
    }
}
const handleTxStorage = async (id, rootTask, task, toastId) => {
    if (!isStr(task.address) || !task.address.startsWith('0x')) {
        // force convert to hex string
        task.address = addressToStr(task.address)
    }
    if (!isValidNumber(task.amountXTX)) {
        task.amountXTX = 0
    }
    const { address, amountXTX, args, description, func, silent, title, toastDuration } = task
    const msg = {
        content: [description],
        header: title,
    }
    const _save = status => arg0 => setToastNSaveCb(
        id, rootTask, task, status, msg, toastId, silent, toastDuration
    )(arg0)

    // make sure identity is owned by user and a transaction can be created
    if (!findIdentity(address)) return _save(ERROR)(texts.txForeignIdentity)
    if (!isStr(func) || !func.startsWith('api.tx.')) return _save(ERROR)(texts.invalidFunc)
    let api
    try {
        api = (await getConnection()).api
    } catch (err) {
        console.log('handleTxTransfer: connectcion error', err)
        return
    }

    try {
        _save(LOADING)()
        const txFunc = eval(func)
        if (!isFn(txFunc)) _save(ERROR)(texts.invalidFunc)

        const balance = await api.query.balances.freeBalance(address)
        if (parseInt(balance) < (amountXTX + MIN_BALANCE)) return _save(ERROR)(texts.insufficientBalance)
        const tx = txFunc.apply(null, args)
        const result = await signAndSend(api, address, tx)
        _save(SUCCESS)(result)
    } catch (err) {
        _save(ERROR)(err)
    }
}

export default {
    addToQueue,
    queue,
    QUEUE_TYPES,
    resumeQueue,
}