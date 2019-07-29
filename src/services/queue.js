/*
 * Queue service to queue processes to be run and resurrected (if needed) in the background
 */
import uuid from 'uuid'
import client from'./ChatClient'
import blockchain from './blockchain'
import storageService from './storage'
import { setToast, removeToast } from './toast'
import { isArr } from '../components/utils'

const queue = new Map()

export const addToQueue = (type, func, args, title, description, next) => {
    const id = uuid.v1()
    const queueItem = {
        args,       // arguments supplied to func
        func,       // @func must return an instance of Bond if tx
        next,       // next operation in this series of queue
        status: '', // loading, error, success
        type,       // blockchain, websocket
        title,      // operation title. Eg: 'Create project'
        description // short description about the operation. Eg: project name etc...
    }
    queue.set(id, queueItem)
    _save()
    setTimeout(()=> _processItem(queueItem, id))
    return id
}

// save to localStorage
const _save = ()=> storageService.queue(queue)

const _processItem = (queueItem, id, msgId) => {
    if (!queueItem || queueItem.status === 'failed') return queue.delete(id) | _save();
    if ('success' === queueItem.status) {
        if (!isObj(next)) {
            // success or faild => remove item from queue
            return queue.delete(id) | _save()
        }
        // Go to next operation
        next.title = next.title || queueItem.title
        next.description = next.description || queueItem.description
    }

    const args = isArr(queueItem.args) ? queueItem.args : [queueItem.args]
    const { title, description } = queueItem

    // Execute current operation
    switch(queueItem.type) {
        case 'blockchain':
            const func = blockchain[queueItem.func]
            if (!func) return queue.delete(id) | _save();
            // initiate transactional request
            bond = func.apply({}, args)
            queueItem.status = 'loading'
            setTimeout(() => _save())

            bond.tie((result, tieId) => {
                if(!isObj(result)) return;
                const { failed, finalized, sending, signing } = result
                const done = failed || finalized
                const status = !done ? 'loading' : (finalized ? 'success' : 'error')
                const statusText = finalized ? 'Transaction successful' : (
                    signing ? 'Signing transaction' : (
                        sending ? 'Sending transaction' : 'Transaction failed'
                    )
                )
                msgId = setToastMsg( title, description, statusText, status,  msgId )
                if (done) {
                    queue.delete(id)
                    _save()
                } else {
                    return _processItem(next, id, msgId)
                }
            })
            break;
        case 'websocket':
            break;
        default: 
            queue.delete(id)
            break;
    }
}

const setToastMsg = (title, description, statusText, status, msgId) => {
    return setToast({
        header: !title ? statusText : `${title}: ${statusText}`,
        content: description,
        status
    }, 0, msgId)
}