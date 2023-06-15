/*
 * Toast service displays toast messages/notifications
 */
import React, { useEffect, useState } from 'react'
import { render } from 'react-dom'
import uuid from 'uuid'
import { deferred, isObj, isStr } from '../utils/utils'
import Message from '../components/Message'
import { rxModals } from './modal'
import { rxSidebarState } from './sidebar'
import { unsubscribe, useRxSubject } from '../utils/reactjs'
import { MOBILE, rxLayout } from './window'
import DataStorage from '../utils/DataStorage'

const DURATION = 5000
const toasts = new DataStorage()
const deferedCloseCbs = new Map()

export const ToastsContainer = () => {
    const [isMobile] = useRxSubject(rxLayout, layout => layout === MOBILE)
    const [isModalOpen] = useRxSubject(rxModals, modals => modals.size > 0)
    const [toastEls] = useRxSubject(toasts.rxData, map => Array.from(map).map(([_, el]) => el))
    const [[animationInProgress, sidebarVisible], setSidebarState] = useState([])
    const mcEl = document.getElementById('main-content')
    const hasScrollbar = mcEl && mcEl.clientHeight !== mcEl.scrollHeight
    const { left = 0, top = 0 } = !isModalOpen && mcEl && mcEl.getBoundingClientRect() || {}
    const hide = !mcEl || !toastEls.length || (isMobile && sidebarVisible)

    useEffect(() => {
        let mounted = true
        const subscription = rxSidebarState.subscribe(({ visible }) => {
            if (!mounted) return
            const animationInProgress = toasts.size > 0 && rxLayout.value !== MOBILE
            setSidebarState([animationInProgress, visible])
            if (!animationInProgress) return
            setTimeout(() => setSidebarState([false, visible]), 500)
        })
        return () => {
            mounted = false
            unsubscribe({ subscription })
        }
    }, [])

    return hide ? '' : (
        <div
            style={{
                ...styles.toastService,
                left: animationInProgress ? 250 : left + 15,
                top: top + 10,
                right: isModalOpen ? 0 : (hasScrollbar ? 15 : 5),
            }}>
            {toastEls}
        </div>
    )
}

// get existing toast message object by id
export const getById = id => toasts.get(id)

// remove existing toast message
export const removeToast = id => toasts.delete(id)

/**
 * @name    setToast
 * @summary add/update toast message
 * 
 * @param   {String|Object} message  toast message. For Object see: components/Message
 * @param   {Number}        duration (optional) duration in milliseconds to automatically close the toast.
 *                                   If `0`, auto-close will be disabled (displayed until manual close).
 *                                   Default: `5000`
 * @param   {String}        id       (optional) tpast ID
 * 
 * @returns {String}        id  
 */
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
        opacity: 1,
        paddingRight: 35,// prevents close button overlapping text content
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
        right: 0, // TODO: use 15 when scrollbar visible
        transition: 'all 0.5s ease',
        WebkitTransition: 'all 0.5s ease',
        top: 61,
        zIndex: 1001
    }
}


const el = document.getElementById('toasts-container')
el && render(<ToastsContainer />, el)

export default {
    getById,
    removeToast,
    setToast,
    ToastsContainer,
}