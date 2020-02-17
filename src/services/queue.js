/*
 * Queue service to queue processes to be run and resurrected (if needed) in the background
 */
import React from 'react'
import uuid from 'uuid'
import { runtime } from 'oo7-substrate'
import { addressToStr, ss58Decode } from '../utils/convert'
import DataStorage from '../utils/DataStorage'
import { transfer, signAndSend } from '../utils/polkadotHelper'
import { isArr, isFn, isObj, isStr, objClean, isBond } from '../utils/utils'
// services
import client from './chatClient'
import blockchain, { getConnection } from './blockchain'
import { set as setHistory } from './history'
import { find as findIdentity } from './identity'
import { getAddressName } from './partner'
import { translated } from './language'
import { removeToast, setToast } from './toast'

const queue = new DataStorage('totem_queue-data')
// Minimum balance required to make a transaction
const MIN_BALANCE = 2
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


    txStorageInvalidFunc: 'Invalid function name supplied.',

    txTransferTitle: 'Transfer funds',
    txTransferMissingArgs: 'One or more of the following arguments is missing or invalid: sender identity, recipient identity and amount',
})

export const QUEUE_TYPES = Object.freeze({
    CHATCLIENT: 'chatclient',
    BLOCKCHAIN: 'blockchain',
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
    setTimeout(() => _processItem(queueItem, id, toastId))
    return id
}

// identityHasPendingTask checks if any unfinished task is queued with a given identity 
// export const identityHasPendingTask = address => {

// }

export const resumeQueue = () => queue.size > 0 && Array.from(queue).forEach((x, i) => setTimeout(() => _processItem(x[1], x[0])))

const _processNextTxItem = () => {
    txInProgress = false
    if (txQueue.length === 0) return;
    const { queueItem, id, toastId } = txQueue.shift()
    setTimeout(() => _processItem(queueItem, id, toastId))
}

const _processItem = (currentTask, id, toastId) => {
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
        return _processItem(next, id, toastId)
    }

    // Execute current task
    const rootTask = queue.get(id)
    // queueItem.title = queueItem.title || rootItem.title
    // queueItem.description = queueItem.description || rootItem.description
    let { args, description, silent, title, toastDuration } = currentTask
    currentTask.args = isArr(args) ? args : [args]
    currentTask.description = description || rootTask.description
    currentTask.silent = currentTask.silent || rootTask.silent
    currentTask.title = title || rootTask.title
    let func = null
    switch ((currentTask.type || '').toLowerCase()) {
        case QUEUE_TYPES.TX_TRANSFER:
            handleTxTransfer(id, rootTask, currentTask, toastId)
            break
        case QUEUE_TYPES.TX_STORAGE:
            handleTxStorage(id, rootTask, currentTask, toastId)
            break
        case QUEUE_TYPES.BLOCKCHAIN:
            // defer tx task to avoid errors
            if (txInProgress) return txQueue.push({ queueItem: currentTask, id, toastId });
            const handlePost = () => {
                txInProgress = true
                func = blockchain[currentTask.func]
                if (!func) return queue.delete(id)
                // initiate transactional request
                const bond = func.apply({}, args)
                if (!isBond(bond)) return
                currentTask.status = 'loading'
                queue.set(id, rootTask)

                const tieId = bond.tie(result => {
                    if (!isObj(result)) return;
                    const { failed, finalized, sending, signing } = result
                    const done = failed || finalized
                    const status = !done ? 'loading' : (finalized ? 'success' : 'error')
                    const statusText = finalized ? texts.txSuccessful : (
                        signing ? texts.signingTx : (sending ? texts.sendingTx : texts.txFailed)
                    )

                    const content = <p>{description}<br /> {failed && (`${wordsCap.error} ${failed.code}: ${failed.message}`)}</p>
                    const header = !title ? statusText : `${title}: ${statusText}`
                    // For debugging
                    currentTask.error = failed

                    if (!silent) {
                        toastId = setToast({ header, content, status }, toastDuration, toastId)
                    }
                    currentTask.status = status
                    queue.set(id, rootTask)
                    if (!done) return;
                    isFn(currentTask.then) && currentTask.then(!failed)
                    _processNextTxItem()
                    bond.untie(tieId)
                    if (finalized) next ? _processItem(next, id, toastId) : queue.delete(id)
                })
            }
            const { address } = currentTask
            if (!address) return handlePost();
            const wallet = findIdentity(address)
            if (!wallet && !silent) {
                setToast({
                    content: `${texts.txInvalidSender} : ${address}`,
                    header: `${title}: ${wordsCap.txAborted}`,
                    status: 'error'
                }, 0, toastId)
                queue.delete(id)
                return
            }
            if (!silent) {
                toastId = setToast({
                    header: `${title}: ${texts.checkingBalance}`,
                    content: description,
                    status: 'loading'
                }, toastDuration, toastId)
            }

            txInProgress = true
            runtime.balances.balance(address).then(balance => {
                const hasEnough = balance >= MIN_BALANCE
                if (hasEnough) return handlePost();
                const continueBtn = (
                    <button
                        className="ui button basic mini"
                        onClick={() => _processItem(currentTask, id, toastId)}
                    >
                        {texts.clickToContinue}
                    </button>
                )
                const cancelBtn = (
                    <button
                        className="ui button basic mini"
                        onClick={() => queue.delete(id) | removeToast(toastId)}
                    >
                        {texts.cancelRequest}
                    </button>
                )

                if (!silent) {
                    toastId = setToast({
                        content: (
                            <p>
                                {description} <br />
                                {texts.insufficientBalanceMsg1} "${wallet.name}".<br />
                                {texts.insufficientBalanceMsg2}: {MIN_BALANCE} {wordsCap.transactions}.<br />
                                {texts.insufficientBalanceMsg3} {words.or} {continueBtn} {words.otherwise} {cancelBtn}<br />
                            </p>
                        ),
                        header: `${title}: ${texts.insufficientBalance}`,
                        status: 'error',
                    }, 0, toastId)

                    // For debugging
                    currentTask.error = texts.insufficientBalance
                }
                _processNextTxItem()
            })
            break;
        case QUEUE_TYPES.CHATCLIENT:
            func = client[currentTask.func]
            if (!func) return queue.delete(id)
            // assume last item is the callback
            const callbackOriginal = args[args.length - 1]
            // Intercept callback to determine whether request has been successful or not
            const interceptCb = function () {
                const args = arguments
                const err = args[0]
                const content = (!err ? description : <p>{wordsCap.error}: {err} <br /></p>)
                const status = !err ? 'success' : 'error'
                const statusText = !err ? words.success : words.failed
                const header = !title ? statusText : `${title}: ${statusText}`
                // For debugging
                currentTask.error = err

                if (!silent) {
                    toastId = setToast({ header, content, status }, toastDuration, toastId)
                }
                isFn(callbackOriginal) && setTimeout(() => callbackOriginal(...args))
                currentTask.status = status
                queue.set(id, rootTask)
                if (err || !isObj(next)) return queue.delete(id)
                return _processItem(next, id, toastId)
            }
            args[args.length === 0 ? 0 : args.length - 1] = interceptCb
            // initiate request
            func.apply({}, args)
            break;
        default:
            // invalid queue type
            queue.delete(id)
            break;
    }
}

const statusTitles = {
    loading: words.inProgress,
    success: words.success,
    error: words.error,
}
const ERROR = 'error'
const SUCCESS = 'success'
const LOADING = 'loading'
const attachKey = (ar = []) => !isArr(ar) ? ar : <div>{ar.map((x, i) => <p key={i} style={{ margin: 0 }}>{x}</p>)}</div>
const setMessage = (task, msg = {}, duration, id, silent = false) => silent ? null : setToast({
    ...msg,
    content: msg.content ? attachKey(msg.content) : task.description,
    header: `${msg.header || task.title}: ${statusTitles[task.status]}`,
    status: task.status,
}, duration, id)

const setToastNSaveCb = (id, rootTask, task, status, msg = {}, toastId, silent, duration) => function (errMsg) {
    const args = arguments
    const hasError = status === ERROR
    const done = [SUCCESS, ERROR].includes(status)
    task.status = status
    task.errorMessage = !hasError ? undefined : (errMsg.startsWith(wordsCap.error) ? '' : wordsCap.error + ': ') + errMsg

    hasError && msg.content.unshift(`${task.errorMessage}`)
    task.toastId = setMessage(task, msg, duration, toastId, silent)
    queue.set(id, rootTask)
    if (!done) return
    isFn(task.then) && task.then(status === SUCCESS, args)
    _processNextTxItem()
}

const handleTxTransfer = (id, rootTask, task, toastId) => {
    // convert address to string. if invalid will be empty string.
    task.address = addressToStr(task.address)
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
    const _setToastNSaveCb = status => arg0 =>
        setToastNSaveCb(id, rootTask, task, status, msg, toastId, silent, toastDuration)(arg0)

    _setToastNSaveCb(!sender || invalid ? ERROR : LOADING)(
        !sender ? texts.txForeignIdentity : (invalid ? texts.txTransferMissingArgs : '')
    )
    if (!sender || invalid) return

    getConnection().then(({ api }) =>
        transfer(recipientAddress, amount, senderAddress, null, api)
            .then(_setToastNSaveCb(SUCCESS), _setToastNSaveCb(ERROR))
    )
}
const handleTxStorage = (id, rootTask, task, toastId) => {
    // convert address to string. if invalid will be empty string.
    task.address = addressToStr(task.address)
    const { address, args, description, func, silent, title, toastDuration } = task
    const msg = {
        content: [description],
        header: title,
    }
    const _setToastNSaveCb = status => arg0 =>
        setToastNSaveCb(id, rootTask, task, status, msg, toastId, silent, toastDuration)(arg0)

    _setToastNSaveCb(LOADING)()
    getConnection().then(({ api }) => {
        const txFunc = eval(func)
        if (!isStr(func) || !func.startsWith('api.tx.') || !isFn(txFunc)) {
            // invalid function name supplied
            return _setToastNSaveCb(ERROR)(texts.txStorageInvalidFunc)
        }
        const tx = txFunc.apply(null, args)
        signAndSend(api, address, tx)
            .then(_setToastNSaveCb(SUCCESS), _setToastNSaveCb(ERROR))
    })
}

export default {
    addToQueue,
    queue,
    QUEUE_TYPES,
    resumeQueue,
}