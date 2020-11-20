import { showForm } from './modal'
import SettingsForm from '../forms/Settings'
import { rxVisible as rxChatVisible } from '../modules/chat/chat'
import NewInboxForm from '../modules/chat/NewInboxForm'
import { rxVisible as rxNotifVisible } from '../modules/notification/notification'


setTimeout(() => {
    const shift = {
        C: NewInboxForm,
        S: SettingsForm,
    }
    const ctrl = {
        C: rxChatVisible,
        N: rxNotifVisible,
    }

    window.addEventListener("keypress", e => {
        if (['INPUT', 'TEXTAREA'].includes(e.target.nodeName)) return
        if (e.shiftKey && e.ctrlKey && ctrl[e.key]) return ctrl[e.key].next(!ctrl[e.key].value)

        if (e.shiftKey && shift[e.key]) return showForm(
            shift[e.key],
            {
                closeOnEscape: true,
                closeOnDimmerClick: true,
            },
            e.key,
        )
    })
})