/*
 * Toast service displays toast messages/notifications
 */
import React from 'react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import uuid from 'uuid'
import { isObj, newMessage, objCopy } from '../components/utils'
const DURATION = 5000
const toasts = new Map()
// Use Bond as a way to trigger update to the ToastService component
const trigger = new Bond()
// store timeout IDs so that they can be cancelled if needed
const timeoutIds = new Map()

class ToastService extends ReactiveComponent {
    constructor(props) {
        super(props, {trigger})
    }
    render() {
        const { hidden, fullWidth } = this.props
        let style = styles.toastService
        if (fullWidth) {
            style = objCopy({maxWidth: '100%', width: '100%'}, style, true)
        }
        return !hidden && (
            <div className="toast-service" style={style}>
                {Array.from(toasts).map(item => item[1])}
            </div>
        )
    }
}
export default ToastService


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
    const messageEl = newMessage(objCopy(
        {
            key: id,
            onDismiss: handleClose,
            style: objCopy({margin: 5}, message.style)
        },
        message,
        true
    ))
    toasts.set( id, messageEl )
    trigger.trigger(uuid.v1())
    if (autoClose) {
        timeoutIds.set(id, setTimeout( () => removeToast(id), duration || DURATION))        
    }
    return id
}

const styles = {
    message: {
        margin: 5,
        transition: 'all 0.5s ease',
        WebkitTransition: 'all 0.5s ease',
    },
    toastService: {
        maxHeight: 'calc(100% - 71px)',
        maxWidth: 400,
        overflowX: 'hidden',
        overflowY: 'auto',
        paddingRight: 10,
        position: 'fixed',
            right: 0,
            transition: 'all 0.5s ease',
            WebkitTransition: 'all 0.5s ease',
        top: 61,
        zIndex: 1001
    }
}