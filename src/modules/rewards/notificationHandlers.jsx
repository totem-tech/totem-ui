import React from 'react'
import { ButtonGroupOr } from '../../components/buttons'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { createInbox } from '../chat/chat'
import IdentityShareForm, { inputNames } from '../identity/IdentityShareForm'
import { remove, rxVisible, setItemViewHandler } from '../notification/notification'

const [texts, textsCap] = translated({
    chat: 'chat',
    connectMsg: 'You can connect with the user by sharing your identity or chat to help them get onboard Totem!',
    referralSuccess: 'joined Totem using your referral code.',
    shareIdentity: 'share identity',
}, true)

// rewards notifications
const handleRewards = (id, notification, { senderId, senderIdBtn }) => {
    const { data = {}, message } = notification
    const { status } = data
    // translate message sent by backend
    const { msg } = translated({ msg: message })[0]

    return {
        icon: { name: 'user plus' },
        status: !status || status === 'success'
            ? 'info'
            : 'error',
        content: (
            <div>
                <div><b>{senderIdBtn}:</b> {msg}</div>
            </div>
        )
    }
}

const handleReferralReward = (id, notification, { senderId, senderIdBtn }) => {
    const item = { icon: 'clock outline' }
    const removeAndClose = () => remove(id) | rxVisible.next(false)
    item.content = (
        <div>
            {senderIdBtn} {texts.referralSuccess} {textsCap.connectMsg}
            {/* <div>{textsCap.connectMsg}</div> */}
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
}

// register notification view handlers
setTimeout(() => [
    {
        handler: handleRewards,
        type: 'rewards',
    },
    {
        childType: 'referralSuccess',
        handler: handleReferralReward,
        type: 'rewards',
    },
    { // for legacy referral notifications
        childType: 'referralSuccess',
        handler: handleReferralReward,
        type: 'chat',
    }
].forEach(x => setItemViewHandler(x.type, x.childType, x.handler)))