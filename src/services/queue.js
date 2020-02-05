/*
 * Queue service to queue processes to be run and resurrected (if needed) in the background
 */
import React from 'react'
import uuid from 'uuid'
import { runtime } from 'oo7-substrate'
import client from './chatClient'
import blockchain from './blockchain'
import { find as findIdentity } from './identity'
import { translated } from './language'
import { removeToast, setToast } from './toast'
import { isArr, isFn, isObj, objClean, isBond } from '../utils/utils'
import DataStorage from '../utils/DataStorage'

const queue = new DataStorage('totem_queue-data')
// Minimum balance required to make a transaction
const MIN_BALANCE = 2
let txInProgress = false
const txQueue = []
const [words, wordsCap] = translated({
    error: 'error',
    failed: 'failed',
    or: 'or',
    otherwise: 'otherwise',
    transactions: 'transactions',
    success: 'success',
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
    unknownIdentity: 'Cannot create a transaction from an address that does not belong to you! Supplied address:',
})

export const QUEUE_TYPES = Object.freeze({
    CHATCLIENT: 'chatclient',
    BLOCKCHAIN: 'blockchain',
    TRANSACTION: 'transaction', // todo use polkadot for tx
})

export const addToQueue = (queueItem, id, toastId) => {
    // prevent adding the same task again
    if (queue.get(id)) return;
    id = id || uuid.v1()
    const validKeys = [
        'type',         // @type        string : name of the service. Currently supported: blockchain, chatclient
        'args',         // @args        array  : arguments supplied to func
        'func',         // @func        string : name of the function within the service.
        'then',         // @func        function: variable arguments depending on the type of task. 
        //                                      For type 'blockchain': boolean value indicating success/failure
        //                      - For blockchain service, must return an instance of Bond returned by substrate package's post() function
        //                      - For ChatClient, the callback must be the last item in the @args array
        //                              AND the first argument to the callback must be:
        //                                  - a string with error message to indicate request failure.
        //                                  - OR, falsy to indicate request success
        'address',      // @address     string/bond: optionally for blockchain @type, include source address to check balance before making blockchain call
        'title',        // @title       string : operation title. Eg: 'Create project'
        'description',  // @description string : short description about the operation. Eg: project name etc...
        'keepToast',    // @keepToast   bool   : if falsy, will autohide toast
        'silent',       // @silent      bool   : If true, enables silent mode and no toasts will be displayed.
        //                      This is particularly usefull when executing tasks that user didn't initiate or should not be bothered with.
        'next',         // @next        object : next operation in this series of queue. Same keys as @validKeys
    ]

    queueItem = objClean(queueItem, validKeys)
    queue.set(id, queueItem)
    setTimeout(() => _processItem(queueItem, id, toastId))
    return id
}

export const resumeQueue = () => queue.size > 0 && Array.from(queue).forEach((x, i) => setTimeout(() => _processItem(x[1], x[0])))

const _processNextTxItem = () => {
    txInProgress = false
    if (txQueue.length === 0) return;
    const { queueItem, id, toastId } = txQueue.shift()
    setTimeout(() => _processItem(queueItem, id, toastId))
}

const _processItem = (queueItem, id, toastId) => {
    if (!isObj(queueItem) || Object.keys(queueItem).length === 0 || queueItem.status === 'error') {
        return queue.delete(id)
    }
    const next = queueItem.next
    if ('success' === queueItem.status) {
        if (!isObj(next)) {
            // success or faild => remove item from queue
            return queue.delete(id)
        }
        // Go to next task
        return _processItem(next, id, toastId)
    }

    // Execute current task
    const rootItem = queue.get(id)
    queueItem.title = queueItem.title || rootItem.title
    queueItem.description = queueItem.description || rootItem.description
    const args = isArr(queueItem.args) ? queueItem.args : [queueItem.args]
    const { title, description } = queueItem
    let func = null
    const msgDuration = rootItem.keepToast ? 0 : null
    const silent = queueItem.silent || rootItem.silent
    switch ((queueItem.type || '').toLowerCase()) {
        case QUEUE_TYPES.BLOCKCHAIN:
            // defer tx task to avoid errors
            if (txInProgress) return txQueue.push({ queueItem, id, toastId });
            const handlePost = () => {
                txInProgress = true
                func = blockchain[queueItem.func]
                if (!func) return queue.delete(id)
                // initiate transactional request
                const bond = func.apply({}, args)
                if (!isBond(bond)) return
                queueItem.status = 'loading'
                queue.set(id, rootItem)

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
                    queueItem.error = failed

                    if (!silent) {
                        toastId = setToast({ header, content, status }, msgDuration, toastId)
                    }
                    queueItem.status = status
                    queue.set(id, rootItem)
                    if (!done) return;
                    isFn(queueItem.then) && queueItem.then(!failed)
                    _processNextTxItem()
                    bond.untie(tieId)
                    if (finalized) next ? _processItem(next, id, toastId) : queue.delete(id)
                })
            }
            const { address } = queueItem
            if (!address) return handlePost();
            const wallet = findIdentity(address)
            if (!wallet && !silent) {
                setToast({
                    content: `${texts.unknownIdentity} ${address}`,
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
                }, msgDuration, toastId)
            }

            txInProgress = true
            runtime.balances.balance(address).then(balance => {
                const hasEnough = balance >= MIN_BALANCE
                if (hasEnough) return handlePost();
                const continueBtn = (
                    <button
                        className="ui button basic mini"
                        onClick={() => _processItem(queueItem, id, toastId)}
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
                    queueItem.error = texts.insufficientBalance
                }
                _processNextTxItem()
            })
            break;
        case QUEUE_TYPES.CHATCLIENT:
            func = client[queueItem.func]
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
                queueItem.error = err

                if (!silent) {
                    toastId = setToast({ header, content, status }, msgDuration, toastId)
                }
                isFn(callbackOriginal) && setTimeout(() => callbackOriginal(...args))
                queueItem.status = status
                queue.set(id, rootItem)
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

export default {
    addToQueue,
    queue,
    QUEUE_TYPES,
    resumeQueue,
}