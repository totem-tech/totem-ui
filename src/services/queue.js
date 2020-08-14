/*
 * Queue service to queue requests and transactions to be re-/executed in the background
 */
import React from 'react'
import uuid from 'uuid'
import DataStorage from '../utils/DataStorage'
import { transfer, signAndSend, setDefaultConfig } from '../utils/polkadotHelper'
import { isArr, isFn, isObj, isStr, objClean, isValidNumber } from '../utils/utils'
// services
import { getClient } from './chatClient'
import { currencyDefault } from './currency'
import { getConnection, query, getCurrentBlock } from './blockchain'
import { save as addToHistory } from './history'
import { find as findIdentity, getSelected } from './identity'
import { getAddressName } from './partner'
import { translated } from './language'
import { setToast } from './toast'
import { rxOnline } from './window'
import PromisE from '../utils/PromisE'
import { BLOCK_DURATION_SECONDS } from '../utils/time'

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
    suspended: 'suspended',
    transaction: 'transaction',
    transactions: 'transactions',
}, true)
const textsCap = translated({
    addedToQueue: 'added to queue',
    insufficientBalance: 'insufficient balance',
    invalidFunc: 'invalid function name supplied.',
    processArgsFailed: 'failed to process dynamic task argument',
    txFailed: 'transaction failed',
    txForeignIdentity: 'cannot create a transaction from an identity that does not belong to you!',
    txInvalidSender: 'invalid or no sender address supplied',
    txTransferTitle: 'transfer funds',
    txTransferMissingArgs: `one or more of the following arguments is missing or invalid: 
        sender identity, recipient identity and amount`,
}, true)[1]
export const statusTitles = {
    error: words.error,
    loading: words.inProgress,
    success: words.successful,
    suspended: words.suspended,
}
const queue = new DataStorage('totem_queue-data', false)
export const QUEUE_TYPES = Object.freeze({
    CHATCLIENT: 'chatclient',
    BLOCKCHAIN: 'blockchain', // deprecated
    // transaction to transfer funds
    TX_TRANSFER: 'tx_transfer', // deprecated
    // transaction to create/update storage data
    TX_STORAGE: 'tx_storage',
})
/* Queue statuses */
// indicates task failed
const ERROR = 'error'
// indicates task has been successful
const SUCCESS = 'success'
// indicates task execution started
const LOADING = 'loading'
const SUSPENDED = 'suspended'
// Minimum balance required to make a transaction.
// This is a guesstimated transaction fee. PolkadotJS V2 required to pre-calculate fee.
const MIN_BALANCE = 140
// stores the ids of inprogress queue items, to determine and alert user when leaving the page
const inProgressIds = []
// list of queue root task ids of which execution is suspended due to browser being offline
// will reattempt when back online.
const suspendedIds = []
// Properties accepted in a queue item. Items not marked as optional or internal should be supplied for task execution.
const VALID_KEYS = Object.freeze([
    // @address         string: (optional) address/identity to initiate a transaction with.
    //                          Required for transaction types.
    //                          Also used to check if user has minimum required balance to execute the TX
    'address',

    // @amountXTX       number: minimum required amount in addition to transactin fee
    'amountXTX',

    // @args            array: arguments to be supplied to @func function.
    //                      Dynamic @args: (not supported with QUEUE_TYPES.TX_TRANSFER for obvious reasons)
    //                      If any of the @args require a value from the result of one of the preious tasks in the  
    //                      queue chain format the args item as an object with the following properties:
    //
    //                          @__taskName         string: (required) name of the previous task in the queue chain
    //                          @__resultSelector   string: (required) 
    //
    //                          Example 1:
    //                          args[index] = {
    //                              __taskName: '@name of the previous task',
    //                              __resultSelector: 'result[1][0]',
    //                          }
    //
    //                          Example 2:
    //                          args[index] = {
    //                              __taskName: '@name of the previous task',
    //                              __resultSelector: `function(result, rootTask) { 
    //                                      const { data } = result || {}
    //                                      return parseInt(data.num) || 0
    //                                }`,
    //                          }
    //
    //                          
    'args',

    // @description     string: short description about the task to very briefly describle what this task is about/for. /                           Eg: project name.
    //                          If a child task's description not supplied will use the root task's description. 
    //                          Root task is the very first task in a queue chain.
    'description',

    // @func            string  : name of the function to be excuted. Depends on the @type of the task.
    //                          1. TX_TRANSER: 
    //                          2. TX_STORAGE: path to the PolkadotJS API function as string. 
    //                              Eg: 'api.tx.timekeeping.authoriseTime'
    //                          3. CHATCLIENT: chat client instances method property name
    'func',

    // @name            string: (optional) a name for the queue item. Should be unique in the queue chain. 
    //                          The name is used to pass through the data (eg: TX event data) to the @next queue items.
    'name',

    // @next            object: (optional) next task in this queue. Same keys as @VALID_KEYS
    //                          Will only be executed if the parent task was successful.
    'next',

    // @silent          bool: (optional) If true, enables silent mode and no toast messages will be displayed.
    //                          This is particularly usefull when executing tasks that user didn't initiate or should //                            not be bothered with.
    'silent',

    // @title           string: short title for the task. Eg: 'Create project'
    'title',

    // @then            function: Callback to be executed once task execution is done (status: 'success' or 'error').
    //                          Not preserved on page reload
    //                          Arguments:
    //                          @success    boolean: indicates success/failure of the task
    //                          @args       array: arguments returned by invoking @func
    'then',

    // @toastDuration   number: (optional) duration in milliseconds before toast message disappears automatically.
    //                          Special values:
    //                          - 0 (zero): disable auto-close
    //                          - undefined/falsy : will use default value set in the Toast service
    'toastDuration',

    // @toastId         string: (optional) if a valid existing toast ID is supplied will replace/re-use the toast //                            message instead of creating a new toast.
    //                          If not supplied, a new ID will be generated.
    //                          Only root task's toast ID will be used. Child tasks will inherit the root's toast ID.
    'toastId',

    // @txId            string: (optional) for supported Blockchain translations, include a "Transaction ID" (hex of 
    //                          an UUID after stripping off the dashes). The @txId will be used to verify the status of 
    //                          the transaction, in case, user leaves the page befor the transaction is completed.
    'txId',

    // @type            string: name of the service. Currently supported: blockchain, chatclient
    'type',
])
/* ###
 * ### Internal props generated/used by the queue service. For reference only
 * ###
 * 
 * @balacne         object: (internal) stores account balances in XTX for transaction related tasks.
 *                      Props:
 *                      @before     integer: account balance before the transaction
 *                      @after      integer: account balance after the successful transaction
 *
 * @data            any: (internal) data returned by @func after successful execution of the task
 * 
 * @errorMessage    string: (internal) if an error occured during execution or task failed with an error message.
 *
 * @status          string: (internal) indicates the status of the queue item.
 *                          Uses the same status strings as toast messages to display relevant background color.
 *                          Typically, status will be set by the queue service.
 *                          However, by resetting status to undefined/falsy will force the queue service to attempt
 *                          to execute this task again.
 *                          Please read bellow to understand the implications of setting a status manually.
 *
 *                          Statuses used:
 *                          - 'error'  : task execution failed. User can force execute
 *                          - 'loading': task is currently being executed. If page is reloaded with this state, 
 *                                      it will be executed again on page reload
 *                          - 'success': task completed successfully.
 *                          - undefined/falsy: task execution was never attempted. Typically the inital status.
 */

export const addToQueue = (queueItem, id = uuid.v1(), toastId = uuid.v1()) => {
    // prevent adding the same task again
    if (queue.get(id)) return

    queueItem = objClean(queueItem, VALID_KEYS)
    queue.set(id, queueItem)
    _processTask(queueItem, id, toastId)
    return id
}

export const resumeQueue = () => queue.map(([id, task]) => {
    if (!navigator.onLine) return suspendedIds.push(id)
    _processTask(task, id, task.toastId, true)
})

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
        case SUSPENDED:
            // ignore task if allowRepeat is not truthy
            if (!allowRepeat) return
            // reset status to attempt to execute again
            currentTask.status = undefined
            // continue with processing the task
            break
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
            alert('deprecated queue type used: ', QUEUE_TYPES.TX_TRANSFER)
            // handleTxTransfer(id, rootTask, currentTask, toastId)
            break
        case QUEUE_TYPES.TX_STORAGE:
            handleTx(id, rootTask, currentTask, toastId)
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

const attachKey = (ar = []) => !isArr(ar) ? ar : (
    <div>
        {ar.filter(Boolean).map((x, i) => (
            <div key={i} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{x}</div>
        ))}
    </div>
)
const setMessage = (task, msg = {}, duration, id, silent = false) => {
    if (silent) return
    const statusText = task.status !== SUSPENDED ? statusTitles[task.status] : textsCap.addedToQueue
    const header = `${msg.header || task.title}: 
        ${task.type.startsWith('tx_') ? words.transaction : ''} ${statusText}`
    setToast({
        ...msg,
        content: msg.content ? attachKey(msg.content) : task.description,
        header,
        status: task.status === SUSPENDED ? 'basic' : task.status,
    }, duration, id)
}

const setToastNSaveCb = (id, rootTask, task, status, msg = {}, toastId, silent, duration, resultOrError, balance) => {
    const errMsg = status === ERROR ? resultOrError : null
    const done = [SUCCESS, ERROR].includes(status)
    const success = status === SUCCESS
    task.status = status
    task.errorMessage = isStr(errMsg) ? errMsg : (
        errMsg instanceof Error ? `${errMsg}` : null
    )
    const hasError = status === ERROR && task.errorMessage
    hasError && msg.content.unshift(task.errorMessage)
    task.toastId = setMessage(task, msg, duration, toastId, silent)
    if (balance) {
        // store account balance before and after TX
        task.balance = { ...task.balance, ...balance }
    }

    switch (status) {
        case LOADING:
            // add to inProgressIds list
            !inProgressIds.includes(id) && inProgressIds.push(id)
            break
        case SUCCESS:
            // save the result so that @next task can access it if needed
            task.result = resultOrError
        case ERROR:
        default:
            // remove from inProgressIds list
            inProgressIds.splice(inProgressIds.indexOf(id), 1)

            break
    }

    // save progress
    queue.set(id, rootTask)
    const { args, argsProcessed, description, errorMessage, func, title, type } = task
    addToHistory(
        [QUEUE_TYPES.TX_STORAGE, QUEUE_TYPES.TX_TRANSFER].includes(type) ? task.address : getSelected().address,
        (type === QUEUE_TYPES.CHATCLIENT ? 'client.' : '') + func,
        argsProcessed || args,
        title,
        description,
        status,
        errorMessage,
        id,
        task.id,
        task.balance,
        task.result
    )

    if (!done) return

    try {
        isFn(task.then) && task.then(success, resultOrError)
    } catch (err) {
        // ignore any error occured by invoking the `then` function
        console.log('Unexpected error occured while executing queue .then()', { rootTask })
        console.error(err)
    }
    // execute next only if current task is successful
    if (success && isObj(task.next)) return _processTask(task.next, id, toastId)

    // delete root item if no error occured
    queue.delete(id)
}

const processArgs = (rootTask = {}, currentTask = {}) => {
    try {
        const args = currentTask.args || []
        const processedArgs = []
        const hasDynamicArg = args.find(arg => isObj(arg) && arg.__taskName && arg.__resultSelector)
        if (!hasDynamicArg) return []

        // throw 'test error 0'
        const getResultByName = (task, name) => {
            // throw 'test error 2'
            if (task.name === name) return task.result
            return !isObj(task.next) ? undefined : getResultByName(task.next, name)
        }
        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            const { __taskName, __resultSelector } = isObj(arg) ? arg : {}
            const isStatic = !__taskName || !__resultSelector
            if (isStatic) {
                processedArgs.push(arg)
                continue
            }
            // throw 'test error 1'
            const result = getResultByName(rootTask, __taskName)
            const argValue = eval(__resultSelector)
            const processedArg = !isFn(argValue) ? argValue : argValue(result, rootTask)
            processedArgs.push(processedArg)
        }

        return [null, processedArgs]
    } catch (err) {
        console.log({ err })
        // throw err
        return [err]
    }
}

const handleChatClient = async (id, rootTask, task, toastId) => {
    const { args, description, title, silent, toastDuration } = task
    const msg = {
        content: [description],
        header: title,
    }
    const _save = (status, resultOrErr) => setToastNSaveCb(
        id, rootTask, task, status, msg, toastId, silent, toastDuration, resultOrErr
    )

    try {
        if (!navigator.onLine) {
            suspendedIds.push(id)
            _save(SUSPENDED)
            console.log('Queue task execution suspended due to being offline. ID:', id)
            return
        }
        const client = getClient() // keep the client variable as it will be used the `eval(func)`
        eval(client) // just make sure client variable isn't removed by accident
        let func = task.func
        func = (func.startsWith('client.') ? '' : 'client.') + func
        func = eval(func)
        if (!isFn(func)) throw textsCap.invalidFunc

        // process any dynamic arguments
        const [err, processedArgs] = processArgs(rootTask, task)
        task.processedArgs = processedArgs
        if (err) throw `${textsCap.processArgsFailed}. ${err}`
        _save(LOADING)

        // initiate request
        const result = await func.promise.apply(null, task.processedArgs || args)
        _save(SUCCESS, result)
    } catch (err) {
        _save(ERROR, err)
    }
}

const handleTx = async (id, rootTask, task, toastId) => {
    if (!isValidNumber(task.amountXTX)) {
        task.amountXTX = 0
    }
    const { address, amountXTX, args, description, func, silent, title, toastDuration, txId } = task
    const identity = findIdentity(address)
    const msg = {
        content: [description],
        header: title,
    }
    const _save = (status, resultOrError, balance) => setToastNSaveCb(
        id, rootTask, task, status, msg, toastId, silent, toastDuration, resultOrError, balance
    )

    // make sure identity is owned by user and a transaction can be created
    if (!identity) return _save(ERROR, textsCap.txForeignIdentity)
    if (!isStr(func) || !func.startsWith('api.tx.')) return _save(ERROR, textsCap.invalidFunc)

    // if browser is offline suspend execution of the task and auto-resume when back online
    if (!navigator.onLine) {
        suspendedIds.push(id)
        _save(SUSPENDED)
        console.log('Queue task execution suspended due to being offline. ID:', id)
        return
    }
    let api
    try {
        _save(LOADING)
        const { api: apiX, keyring } = await getConnection()
        api = apiX
        // add idenitity to keyring on demand
        !keyring.contains(address) && keyring.add([identity.uri])
    } catch (err) {
        console.log('handleTxStorage: connectcion error', err)
        // attempt to execute again on page reload or manual resume
        return
    }

    try {
        // check if supplied is a valid ApiPromise function
        const txFunc = eval(func)
        if (!isFn(txFunc)) throw textsCap.invalidFunc

        // process dynamic arguments, if required
        const [err, processedArgs] = processArgs(rootTask, task)
        task.processedArgs = processedArgs
        if (err) throw `${textsCap.processArgsFailed}. ${err}`

        if (txId) {
            let done = false
            let blockNum = 0
            let diff = 0
            do {
                const [isStarted = 0, isSuccessful = 0] = await query(
                    api.queryMulti,
                    [[
                        [api.query.bonsai.isStarted, txId],
                        [api.query.bonsai.isSuccessful, txId],
                    ]],
                )
                if (isSuccessful) {
                    // tx was already successfully completed
                    // transaction and event data is unknown 
                    return _save(SUCCESS, [])
                } else if (isStarted) {
                    // tx is already being executed
                    // retreive current block number to check if transaction has failed
                    blockNum = await getCurrentBlock()
                    diff = blockNum - isStarted
                    if (diff > 10) {
                        // sufficient amount has passed but the transaction was still not in the isSuccess list
                        // assume tx has failed
                        return _save(ERROR, textsCap.txFailed)
                    }
                    // wait for up to 10 blocks and check again if tx becomes succesful
                    await PromisE.delay(diff * BLOCK_DURATION_SECONDS * 1000)
                } else {
                    // new transaction, continue with 
                    done = true
                }
            } while (!done)
        }

        // retrieve and store account balance before starting the transaction
        let balance = await query(api.query.balances.freeBalance, address)
        if (balance < (amountXTX + MIN_BALANCE)) throw textsCap.insufficientBalance
        _save(LOADING, null, { before: balance })

        // attempt to execute the transaction
        const tx = txFunc.apply(null, task.processedArgs || args)
        const result = await signAndSend(api, address, tx)

        // retrieve and store account balance after execution
        balance = await query(api.query.balances.freeBalance, address)
        _save(SUCCESS, result, { after: balance })
    } catch (err) {
        _save(ERROR, err)
    }
}

// Deprecated -> will be removed
// const handleTxTransfer = async (id, rootTask, task, toastId) => {
//     task.func = 'api.tx.balances.transfer'
//     const { address: senderAddress, args, silent, toastDuration } = task
//     const [recipientAddress, amount] = args
//     const identity = findIdentity(senderAddress)
//     const invalid = !senderAddress || !recipientAddress || !amount
//     const msg = {
//         content: [
//             `${wordsCap.sender}: ${identity.name}`,
//             `${wordsCap.recipient}: ${getAddressName(recipientAddress)}`,
//             `${wordsCap.amount}: ${amount} ${currencyDefault}`,
//         ],
//         header: textsCap.txTransferTitle
//     }
//     task.title = textsCap.txTransferTitle
//     task.description = msg.content.join('\n')
//     const _save = (status, resultOrErr, balances = {}) => setToastNSaveCb(
//         id, rootTask, task, status, msg, toastId, silent, toastDuration, resultOrErr, balances
//     )

//     _save(
//         !identity || invalid ? ERROR : LOADING,
//         !identity ? textsCap.txForeignIdentity : (invalid ? textsCap.txTransferMissingArgs : '')
//     )
//     if (!identity || invalid) return
//     let api
//     try {
//         const { api: apiX, keyring } = await getConnection()
//         api = apiX
//         // add idenitity to keyring on demand
//         !keyring.contains(senderAddress) && keyring.add([identity.uri])
//     } catch (err) {
//         console.log('handleTxTransfer: connectcion error', err)
//         _save(ERROR, err)
//         return
//     }

//     try {
//         _save(LOADING)
//         const config = setDefaultConfig()
//         let balance = await query(api.query.balances.freeBalance, senderAddress)

//         _save(LOADING, null, { before: balance }) // save balance
//         if (balance <= (amount + config.txFeeMin)) return _save(ERROR, textsCap.insufficientBalance)

//         console.log('Polkadot: transfer from ', { address: senderAddress, balance })
//         const result = await transfer(
//             recipientAddress,
//             amount,
//             senderAddress,
//             null,
//             api
//         )
//         balance = await query(api.query.balances.freeBalance, senderAddress)
//         _save(SUCCESS, result, { after: balance })
//     } catch (err) {
//         _save(ERROR, err)
//     }
// }

// if one or more tasks in progress, warn before user attempts to leave/reload page
window.addEventListener('beforeunload', function (e) {
    if (inProgressIds.length === 0) return
    // Cancel the event
    e.preventDefault() // If you prevent default behavior in Mozilla Firefox prompt will always be shown
    // Chrome requires returnValue to be set
    e.returnValue = ''
})
// resume suspended tasks whenever browser is back online
rxOnline.subscribe(async (online) => {
    if (!online) return
    // attempt to reconnect to blockchain, in case, first it failed.
    await getConnection(true)
    while (navigator.onLine && suspendedIds.length) {
        const id = suspendedIds.pop()
        const task = queue.get(id)
        console.log('resuming task', id)
        // resume execution by checking each step starting from the top level task
        _processTask(task, id, task.toastId, true)
    }
})

export default {
    addToQueue,
    queue,
    QUEUE_TYPES,
    resumeQueue,
}