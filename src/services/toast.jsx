/*
 * Toast service displays toast messages/notifications
 */
import React, { Component } from 'react'
import { Bond } from 'oo7'
import uuid from 'uuid'
import { isObj, isStr } from '../utils/utils'
import Message from '../components/Message'
import { trigger as totalModalsBond } from './modal'
import { sidebarStateBond } from './sidebar'

const DURATION = 5000
const toasts = new Map()
// Use Bond as a way to trigger update to the ToastService component
const trigger = new Bond()
// store timeout IDs so that they can be cancelled if needed
const timeoutIds = new Map()

export class ToastsContainer extends Component {
    componentWillMount() {
        this.bond = Bond.all([totalModalsBond, sidebarStateBond, trigger])
        this.tieId = this.bond.tie(() => this.forceUpdate())

        // delay until sidebar animnation is complete
        sidebarStateBond.tie(({ visible }) => {
            const { isMobile } = this.props
            const sidebarWillAnimate = toasts.size > 0 && !isMobile
            this.setState({
                animationInProgress: sidebarWillAnimate,
                visible,
            })
            if (!sidebarWillAnimate) return
            setTimeout(() => this.setState({ animationInProgress: false }), 500)
        })
    }

    componentWillUnmount = () => this.bond.untie(this.tieId)

    render() {
        const { isMobile } = this.props
        const { animationInProgress, visible } = this.state || {}
        const mcEl = document.getElementById('main-content')
        if (!mcEl || toasts.size === 0) return ''
        const isModalOpen = totalModalsBond._value > 0
        const hasScrollbar = mcEl.clientHeight !== mcEl.scrollHeight
        const { left, top } = isModalOpen ? { left: 0, top: 0 } : mcEl.getBoundingClientRect()
        return isMobile && visible ? '' : (
            <div
                className="toast-service"
                style={{
                    ...styles.toastService,
                    left: animationInProgress ? 250 : left + 15,
                    top: top + 10,
                    right: isModalOpen ? 0 : (hasScrollbar ? 15 : 5),
                }}>
                {Array.from(toasts).map(([_, el]) => el)}
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
    // if text supplied use it as message content, without header
    message = !isStr(message) ? message : { content: message }
    if (!isObj(message) || (!message.header && !message.content)) return;
    const autoClose = duration !== 0
    const timeoutId = timeoutIds.get(id)
    id = id || uuid.v1()
    if (timeoutId) {
        // clear existing timeout
        clearTimeout(timeoutId)
    }
    const handleClose = () => removeToast(id)
    const props = {
        ...message,
        key: id,
        onDismiss: handleClose,
        style: { ...styles.message, ...message.style },
    }
    toasts.set(id, <Message {...props} />)
    trigger.trigger(uuid.v1())
    autoClose && timeoutIds.set(id, setTimeout(handleClose, duration || DURATION))
    return id
}

const styles = {
    message: {
        margin: '5px 0',
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

export default {
    getById,
    removeToast,
    setToast,
    ToastsContainer,
}