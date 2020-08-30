/*
 * Toast service displays toast messages/notifications
 */
import React, { useEffect, useReducer } from 'react'
import uuid from 'uuid'
import { deferred, isObj, isStr, isFn } from '../utils/utils'
import Message from '../components/Message'
import { rxModals } from './modal'
import { sidebarStateBond } from './sidebar'
import { reducer } from './react'
import { layoutBond, MOBILE } from './window'
import DataStorage from '../utils/DataStorage'

const DURATION = 5000
const toasts = new DataStorage()
const deferedCloseCbs = new Map()

export const ToastsContainer = () => {
    const [state, setState] = useReducer(reducer, {})
    const { animationInProgress, isMobile, isModalOpen, sidebarVisible, toastsArr } = state
    const mcEl = document.getElementById('main-content')
    const hasScrollbar = mcEl && mcEl.clientHeight !== mcEl.scrollHeight
    const { left = 0, top = 0 } = !isModalOpen && mcEl && mcEl.getBoundingClientRect() || {}
    const hide = !mcEl || toasts.size === 0 || (isMobile && sidebarVisible)

    useEffect(() => {
        let mounted = true
        const unsubscribers = {}
        unsubscribers.toasts = toasts.rxData.subscribe(map =>
            mounted && setState({ toastsArr: Array.from(map) })
        ).unsubscribe
        unsubscribers.modals = rxModals.subscribe(map =>
            mounted && setState({ isModalOpen: map.size > 0 })
        ).unsubscribe
        const tieIdMobile = layoutBond.tie(layout => mounted && setState({ isMobile: layout === MOBILE }))
        // delay until sidebar animnation is complete
        const tieIdSidebar = sidebarStateBond.tie(({ visible }) => {
            const sidebarWillAnimate = toasts.size > 0 && !isMobile
            setState({
                animationInProgress: sidebarWillAnimate,
                sidebarVisible: visible,
            })
            if (!sidebarWillAnimate) return
            setTimeout(() => setState({ animationInProgress: false }), 500)
        })
        return () => {
            mounted = false
            layoutBond.untie(tieIdMobile)
            sidebarStateBond.untie(tieIdSidebar)
            Object.values(unsubscribers).forEach(fn => isFn(fn) && fn())
        }
    }, [])

    return hide ? '' : (
        <div
            className='toast-service'
            style={{
                ...styles.toastService,
                left: animationInProgress ? 250 : left + 15,
                top: top + 10,
                right: isModalOpen ? 0 : (hasScrollbar ? 15 : 5),
            }}>
            {toastsArr.map(([_, el]) => el)}
        </div>
    )
}

// get existing toast message object by id
export const getById = id => toasts.get(id)

// remove existing toast message
export const removeToast = id => toasts.delete(id)

// add/update toast message
export const setToast = (message, duration, id) => {
    // if text supplied use it as message content, without header
    message = !isStr(message) ? message : { content: message }
    if (!isObj(message) || (!message.header && !message.content)) return;
    id = id || uuid.v1()
    const autoClose = duration !== 0
    const handleClose = () => removeToast(id) | deferedCloseCbs.delete(id)
    const props = {
        ...message,
        key: id,
        onDismiss: handleClose,
        style: { ...styles.message, ...message.style },
    }
    toasts.set(id, <Message {...{ ...props, key: id }} />)
    if (autoClose) {
        const deferredClose = deferedCloseCbs.get(id) || deferedCloseCbs.set(
            id, deferred(handleClose, duration || DURATION)
        ).get(id)
        deferredClose()
    }
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