import { deferred } from '../utils/utils'
import { closeModal, get, showForm } from './modal'
import { toggleSidebarState } from './sidebar'
import SettingsForm from '../forms/Settings'
import { rxIdentityListVisible } from '../components/PageHeader'
import NewInboxForm from '../modules/chat/NewInboxForm'
import { rxVisible as rxChatVisible } from '../modules/chat/chat'
import { rxVisible as rxNotifVisible } from '../modules/notification/notification'
import TimekeepingForm from '../modules/timekeeping/TimekeepingForm'

const keys = new Set()
const handlers = {
    SHIFT_C: {
        handler: NewInboxForm,
        type: 'form',
    },
    SHIFT_S: {
        handler: SettingsForm,
        props: { closeText: null },
        type: 'form',
    },
    SHIFT_T: {
        handler: TimekeepingForm,
        type: 'form',
    },
    C: { 
        handler: rxChatVisible,
        type: 'subject-toggle'
    },
    I: {
        handler: rxIdentityListVisible,
        type: 'subject-toggle'
    },
    N: { 
        handler: rxNotifVisible,
        type: 'subject-toggle'
    },
    S: {
        handler: toggleSidebarState,
        type: 'func'
    }
}
const handleKeypress = deferred(shiftKey => {
    let activeKeys = (shiftKey ? 'SHIFT_' : '') + [...keys].sort()
    keys.clear()
    const { handler, props, type } = handlers[activeKeys] || {}
    if (!handler) return

    switch (type) {
        case 'subject-toggle':
            // handler is a subject
            handler.next(!handler.value)
            break
        case 'func':
            // handler is a function
            handler()
            break
        case 'form':
            // handler is a form
            const modalId = `shortcutKey-${activeKeys}`
            // close modal form if already open
            if (get(modalId)) return closeModal(modalId)
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
    // ignore if user is typing
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.nodeName)) return
    const key = e.code.replace('Key', '')
    keys.add(key)
    handleKeypress(e.shiftKey)
})