import { rxIdentityListVisible } from '../components/PageHeader'
import SettingsForm, { showKeyboardShortcuts } from '../forms/Settings'
import { rxVisible as rxChatVisible } from '../modules/chat/chat'
import NewInboxForm from '../modules/chat/NewInboxForm'
import { rxVisible as rxNotifVisible } from '../modules/notification/notification'
import TimekeepingForm from '../modules/timekeeping/TimekeepingForm'
import { deferred } from '../utils/utils'
import { rxInverted } from '../utils/window'
import { closeModal, get, showForm } from './modal'
import { toggleSidebarState } from './sidebar'

const keys = new Set()
const handlers = {
    SHIFT_C: {
        handler: NewInboxForm,
        modalId: 'NewInboxForm',
        type: 'form',
    },
    SHIFT_S: {
        handler: SettingsForm,
        modalId: 'SettingsForm',
        props: { closeText: null },
        type: 'form',
    },
    SHIFT_T: {
        handler: TimekeepingForm,
        modalId: 'TimekeepingForm',
        type: 'form',
    },
    C: {
        handler: () => rxChatVisible.next(!rxChatVisible.value),
        type: 'func'
    },
    D: {
        handler: () => rxInverted.next(!rxInverted.value),
        type: 'func',
    },
    I: {
        handler: () => rxIdentityListVisible.next(!rxIdentityListVisible.value),
        type: 'func',
    },
    K: {
        handler: showKeyboardShortcuts,
        type: 'func',
    },
    N: {
        handler: () => rxNotifVisible.next(!rxNotifVisible.value),
        type: 'func',
    },
    S: {
        handler: () => toggleSidebarState(),
        type: 'func',
    }
}
const getModalId = activeKeys => (handlers[activeKeys] || {}).modalId
    || `shortcutKey-${activeKeys}`
const handleKeypress = deferred(shiftKey => {
    let activeKeys = (shiftKey ? 'SHIFT_' : '') + [...keys].sort()
    keys.clear()
    const { handler, props, type } = handlers[activeKeys] || {}
    if (!handler) return

    const modalId = getModalId(activeKeys)
    // close modal form if already open
    if (get(modalId)) return closeModal(modalId)

    switch (type) {
        case 'func':
            // handler is a function
            handler()
            break
        case 'form':
            // handler is a form
            showForm(
                handler,
                {
                    ...props,
                    closeOnEscape: true,
                    closeOnDimmerClick: true,
                },
                modalId,
            )
            break
    }
}, 200)

window.addEventListener('keypress', e => {
    // ignore if user is typing into an input
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.nodeName)) return
    const key = e.code.replace('Key', '')
    keys.add(key)
    handleKeypress(e.shiftKey)
})