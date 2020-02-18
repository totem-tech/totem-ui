/*
 * Queue service to queue processes to be run and resurrected (if needed) in the background
 */
import React from 'react'
import uuid from 'uuid'
import { addressToStr } from '../utils/convert'
import DataStorage from '../utils/DataStorage'
import { transfer, signAndSend } from '../utils/polkadotHelper'
import { hasValue, isArr, isFn, isObj, isStr, objClean } from '../utils/utils'
// services
import { getClient } from './chatClient'
import { getConnection } from './blockchain'
import { save as addToHistory } from './history'
import { find as findIdentity, getSelected } from './identity'
import { getAddressName } from './partner'
import { translated } from './language'
import { setToast } from './toast'

const queue = new DataStorage('totem_queue-data')
// Minimum balance required to make a transaction
const MIN_BALANCE = 140
let txInProgress = false
const txQueue = []
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
    cancelRequest: 'cancel request',
    checkingBalance: 'checking balance',
    clickToContinue: 'click here to continue',
    insufficientBalance: 'Insufficient balance',
    insufficientBalanceMsg1: 'Insufficient balance in the following identity:',
    insufficientBalanceMsg2: 'Minimum required balance',
    insufficientBalanceMsg3: 'Once you have sufficient balance reload page',
    sendingTx: 'Sending transaction',
    signingTx: 'Signing transaction',
    txAborted: 'transaction aborted',
    txFailed: 'Transaction failed',
    txSuccessful: 'Transaction successful',
    txForeignIdentity: 'Cannot create a transaction from an identity that does not belong to you!',
    txInvalidSender: 'Invalid or no sender address supplied',


    invalidFunc: 'Invalid function name supplied.',

    txTransferTitle: 'Transfer funds',
    txTransferMissingArgs: 'One or more of the following arguments is missing or invalid: sender identity, recipient identity and amount',
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

// identityHasPendingTask checks if any unfinished task is queued with a given identity 
// export const identityHasPendingTask = address => {

// }

export const resumeQueue = () => queue.size > 0 && Array.from(queue).forEach((x, i) => setTimeout(() => _processTask(x[1], x[0])))

const _processNextTxItem = () => {
    txInProgress = false
    if (txQueue.length === 0) return;
    const { queueItem, id, toastId } = txQueue.shift()
    setTimeout(() => _processTask(queueItem, id, toastId))
}

const _processTask = (currentTask, id, toastId) => {
    if (!isObj(currentTask) || Object.keys(currentTask).length === 0 || currentTask.status === 'error') {
        return queue.delete(id)
    }
    const next = currentTask.next
    if ('success' === currentTask.status) {
        if (!isObj(next)) {
            // success or faild => remove item from queue
            return queue.delete(id)
        }
        // Go to next task
        return _processTask(next, id, toastId)
    }

    // Execute current task
    const rootTask = queue.get(id)
    let { args, description, silent, title, toastDuration } = currentTask
    currentTask.args = isArr(args) ? args : [args]
    currentTask.description = description || rootTask.description
    currentTask.silent = currentTask.silent || rootTask.silent
    currentTask.title = title || rootTask.title
    switch ((currentTask.type || '').toLowerCase()) {
        case QUEUE_TYPES.TX_TRANSFER:
            handleTxTransfer(id, rootTask, currentTask, toastId)
            break
        case QUEUE_TYPES.TX_STORAGE:
            handleTxStorage(id, rootTask, currentTask, toastId)
            break
        case QUEUE_TYPES.BLOCKCHAIN:
            alert('deprecated queue type used')
            break;
        case QUEUE_TYPES.CHATCLIENT:
            handleChatClient(id, rootTask, currentTask, toastId)
            break;
        default:
            // invalid queue type
            queue.delete(id)
            break;
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
            <p key={i} style={{ margin: 0 }}>{x}</p>
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
    task.status = status
    task.errorMessage = !isStr(errMsg) ? undefined : (
        `${errMsg.startsWith(wordsCap.error) ? '' : wordsCap.error + ': '}${errMsg}`
    )
    const hasError = status === ERROR && task.errorMessage

    hasError && msg.content.unshift(task.errorMessage)
    task.toastId = setMessage(task, msg, duration, toastId, silent)
    queue.set(id, rootTask)

    if (!done) return

    try {
        isFn(task.then) && task.then(status === SUCCESS, cbArgs)
    } catch (_) {
        // ignore any error occured by invoking the `then` function
    }

    const { args, description, errorMessage, func, title, type } = task
    addToHistory(
        [QUEUE_TYPES.TX_STORAGE, QUEUE_TYPES.TX_TRANSFER].includes(type) ? task.address : getSelected().address,
        func,
        args,
        title,
        description,
        status,
        errorMessage,
        id,
    )

    if (isObj(task.next)) return _processTask(task.next, id, toastId)
    // delete root item if no error occured
    queue.delete(id)
    _processNextTxItem()
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
        if (!func || !isFn(func)) return _save(ERROR)(texts.invalidFunc)
        let cbIndex = args.length === 0 ? 0 : args.length - 1
        if (hasValue(args[cbIndex]) && !isFn(args[cbIndex])) {
            cbIndex++
        }
        if (!isFn(args[cbIndex])) {
            // add a placeholder callback if not supplied, otherwise, messaging service will ignore the request
            args[cbIndex] = () => { }
        }
        _save(LOADING)()
        const t = resolve => err => {
            console.log({ resolve, err })
        }
        // initiate request
        func.promise.apply(null, args).then(_save(SUCCESS), _save(ERROR))//.then(t(true), t(false))
    } catch (err) {
        _save(ERROR)(err)
    }
}

const handleTxTransfer = (id, rootTask, task, toastId) => {
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
            `${wordsCap.amount}: ${amount}`,
        ],
        header: texts.txTransferTitle
    }
    const _save = status => arg0 => setToastNSaveCb(
        id, rootTask, task, status, msg, toastId, silent, toastDuration
    )(arg0)

    try {
        _save(!sender || invalid ? ERROR : LOADING)(
            !sender ? texts.txForeignIdentity : (invalid ? texts.txTransferMissingArgs : '')
        )
        if (!sender || invalid) return

        getConnection().then(({ api }) =>
            transfer(
                recipientAddress,
                amount,
                senderAddress,
                null,
                api
            ).then(_save(SUCCESS), _save(ERROR)),
            _save(ERROR)
        )

    } catch (err) {
        _save(ERROR)(err)
    }
}
const handleTxStorage = (id, rootTask, task, toastId) => {
    // convert address to string. if invalid will be empty string.
    task.address = addressToStr(task.address)
    const { address, args, description, func, silent, title, toastDuration } = task
    const msg = {
        content: [description],
        header: title,
    }
    const _save = status => arg0 => setToastNSaveCb(
        id, rootTask, task, status, msg, toastId, silent, toastDuration
    )(arg0)

    try {
        if (!isStr(func) || !func.startsWith('api.tx.')) return _save(ERROR)(texts.invalidFunc)

        _save(LOADING)()
        getConnection().then(({ api }) => {
            const txFunc = eval(func)
            if (!isFn(txFunc)) _save(ERROR)(texts.invalidFunc)

            api.query.balances.freeBalance(address).then(balance => {
                if (parseInt(balance) < MIN_BALANCE) return _save(ERROR)(texts.insufficientBalance)
                const tx = txFunc.apply(null, args)
                signAndSend(api, address, tx).then(_save(SUCCESS), _save(ERROR))
            })
        }, _save(ERROR))
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