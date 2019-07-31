/*
 * Queue service to queue processes to be run and resurrected (if needed) in the background
 */
import React from 'react'
import uuid from 'uuid'
import client from'./ChatClient'
import blockchain from './blockchain'
import storageService from './storage'
import { setToast } from './toast'
import { isArr, isFn, isObj, objClean } from '../components/utils'

const queue = storageService.queue()

export const addToQueue = (queueItem) => {
    const id = uuid.v1()
    const validKeys = [
        'type',         // @type        string : name of the service. Currently supported: blockchain, chatclient
        'args',         // @args        array  : arguments supplied to func
        'func',         // @func        string : name of the function within the service.
                        //                      - For blockchain service, must return an instance of Bond returned by substrate package's post() function
                        //                      - For ChatClient, the callback must be the last item in the @args array
                        //                              AND the first argument to the callback must be:
                        //                                  - a string with error message to indicate request failure.
                        //                                  - OR, falsy to indicate request success
        'title',        // @title       string : operation title. Eg: 'Create project'
        'description',  // @description string : short description about the operation. Eg: project name etc...
        'keepToast',    // @keepToast   bool   : if falsy, will autohide toast
        'next',         // @next        object : next operation in this series of queue. Same keys as @validKeys
    ]

    queueItem = objClean(queueItem, validKeys)
    queue.set(id, queueItem)
    _save()
    setTimeout(()=> _processItem(queueItem, id))
    return id
}

// save to localStorage
const _save = ()=> storageService.queue(queue)
export const resumeQueue = ()=> queue.size > 0 && Array.from(queue).forEach(x => _processItem(x[1], x[0])) | console.log('Resuming', queue.size, 'queue items')

const _processItem = (queueItem, id, msgId) => {
    if (!isObj(queueItem) || queueItem.status === 'error') return queue.delete(id) | _save();
    const next = queueItem.next
    if ('success' === queueItem.status) {
        if (!isObj(next)) {
            // success or faild => remove item from queue
            return queue.delete(id) | _save()
        }

        return _processItem(next, id, msgId)
    }

    // Go to next operation
    queueItem.title = queueItem.title || queue.get(id).title
    queueItem.description = queueItem.description || queue.get(id).description
    const args = isArr(queueItem.args) ? queueItem.args : [queueItem.args]
    const { title, description } = queueItem
    let func = null
    const msgDuration = queue.get(id).keepToast ? 0 : null
    // Execute current operation
    switch((queueItem.type || '').toLowerCase()) {
        case 'blockchain':
            func = blockchain[queueItem.func]
            if (!func) return queue.delete(id) | _save();
            // initiate transactional request
            const bond = func.apply({}, args)
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
                const content = (failed ? <p>Error {failed.code}: {failed.message} <br /></p> : description)
                const header = !title ? statusText : `${title}: ${statusText}`
                msgId = setToast( {header, content, status}, msgDuration, msgId )
                queueItem.status = status
                if (done) _save() | bond.untie(tieId);

                if (finalized) return next ? _processItem(next, id, msgId) : queue.delete(id)
            })
            break;
        case 'chatclient':
            func = client[queueItem.func]
            if (!func) return queue.delete(id) | _save();
            // assume last item is the callback
            const callbackOriginal = args[args.length - 1]
            // Intercept callback to determine whether request has been successful or not
            const interceptCb = function(err, a, b, c, d, e, f, g, h) {
                const content = (!err ? description : <p>Error: {err} <br /></p>)
                const status = !err ? 'success' : 'error'
                const statusText = !err ? 'success' : 'failed'
                const header = !title ? statusText : `${title}: ${statusText}`
                msgId = setToast( {header, content, status}, msgDuration, msgId )
                setTimeout(() => isFn(callbackOriginal) && callbackOriginal(err, a, b, c, d, e, f, g, h))
                queueItem.status = status
                // save progress
                _save()
                if (err || !isObj(next)) return queue.delete(id)
                return _processItem(next, id, msgId)
            }
            args[args.length === 0 ? 0 : args.length-1] = interceptCb
            // initiate request
            func.apply({}, args)
            break;
        default: 
            queue.delete(id)
            break;
    }
}