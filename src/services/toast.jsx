/*
 * Toast service displays toast messages/notifications
 */
import React from 'react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import uuid from 'uuid'
import { isObj, newMessage, objCopy } from '../utils/utils'
const DURATION = 5000
const toasts = new Map()
// Use Bond as a way to trigger update to the ToastService component
const trigger = new Bond()
// store timeout IDs so that they can be cancelled if needed
const timeoutIds = new Map()

export default class ToastService extends ReactiveComponent {
    constructor(props) {
        super(props, { trigger })
    }
    render() {
        const { hidden, style } = this.props
        const s = { ...styles.toastService, ...style }
        return !hidden && (
            <div className="toast-service" style={s}>
                {Array.from(toasts).map(item => item[1])}
            </div>
        )
    }
}

// get existing toast message object by id
export const getById = id => toasts.get(id)

// remove existing toast message
export const removeToast = id => toasts.delete(id) | trigger.trigger(uuid.v1())

// add/update toast message
export const setToast = (message, duration, id) => {
    if (!isObj(message) || (!message.header && !message.content)) return;
    const autoClose = duration !== 0
    const timeoutId = timeoutIds.get(id)
    id = id || uuid.v1()
    if (timeoutId) {
        // clear existing timeout
        clearTimeout(timeoutId)
    }
    const handleClose = () => removeToast(id)
    const messageEl = newMessage({
        ...message,
        key: id,
        onDismiss: handleClose,
        style: { margin: 5, ...message.style },
    })
    toasts.set(id, messageEl)
    trigger.trigger(uuid.v1())
    autoClose && timeoutIds.set(id, setTimeout(handleClose, duration || DURATION))
    return id
}

const styles = {
    message: {
        margin: 5,
        transition: 'all 0.5s ease',
        WebkitTransition: 'all 0.5s ease',
    },
    toastService: {
        left: window.innerWidth - 420,
        maxHeight: 'calc(100% - 71px)',
        overflowX: 'hidden',
        overflowY: 'auto',
        paddingRight: 10,
        position: 'fixed',
        right: 10, // TODO: user 15 when scrollbar visible
        transition: 'all 0.5s ease',
        WebkitTransition: 'all 0.5s ease',
        top: 61,
        zIndex: 1001
    }
}