import React from 'react'
import { ButtonGroupOr } from '../../components/buttons'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import IdentityShareForm, { inputNames } from '../identity/IdentityShareForm'
import { remove, rxVisible, setItemViewHandler } from '../notification/notification'
import { createInbox } from './chat'

const textsCap = translated({
    chat: 'chat',
    connectMsg: 'You can connect with the user by sharing your identity or chat to help them get onboard Totem!',
    referralSuccess: 'signed up using your referral code.',
    shareIdentity: 'share identity',
}, true)[1]

setTimeout(()=> [
    {
        childType: 'referralSuccess',
        handler: (id, notification, { senderId, senderIdBtn }) => {
            console.log({id, notification, senderId})
            const item = { icon: 'clock outline' }
            const removeAndClose = () => remove(id) | rxVisible.next(false)
            item.content = (
                <div>
                    {senderIdBtn} {textsCap.referralSuccess}
                    <div>{textsCap.connectMsg}</div>
                    <ButtonGroupOr {...{
                        fluid: true,
                        buttons: [
                            {
                                content: textsCap.shareIdentity,
                                icon: 'id badge',
                                onClick: () => {
                                    const values = {}
                                    values[inputNames.userIds] = [senderId]

                                    showForm(IdentityShareForm, {
                                        inputsDisabled: [inputNames.userIds],
                                        // remove notification on share success
                                        onSubmit: success => success && removeAndClose(),
                                        values,
                                    })
                                },
                            },
                            {
                                content: textsCap.chat,
                                icon: 'chat',
                                onClick: () => {
                                    createInbox([senderId], null, true)
                                    // remove notification
                                    removeAndClose()
                                },
                            },
                        ],
                    }} />
                </div>
            )
            return item
        },
        type: 'chat',
    }
].forEach(x => setItemViewHandler(x.type, x.childType, x.handler)))