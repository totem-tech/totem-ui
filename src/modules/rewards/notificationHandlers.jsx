import React from 'react'
import { ButtonGroupOr } from '../../components/buttons'
import { translated } from '../../utils/languageHelper'
import { showForm } from '../../services/modal'
import { createInbox } from '../chat/chat'
import IdentityShareForm, { inputNames } from '../identity/IdentityShareForm'
import { remove, rxVisible, setItemViewHandler } from '../notification/notification'

const textsCap = {
    chat: 'chat',
    connectMsg: 'You can connect with the user by sharing your identity or chat to help them get onboard Totem!',
    referralSuccess: 'joined Totem using your referral code.',
    shareIdentity: 'share identity',
    signupRewardMsg: `
        Some funds to get you started will arrive shortly.
        Keep in eye on the identities module.
        Have fun using Totem Live and don't forget to join us on our social media channels! :)
    `,
}
const texts = translated(textsCap, true)[0]

// rewards notifications
const handleRewards = (id, notification, { senderId, senderIdBtn }) => {
    const { data = {}, message } = notification
    const { status } = data
    // translate message sent by backend
    const { msg } = translated({ msg: message })[0]

    return {
        icon: { name: 'gift' },
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
    const item = { icon: 'user plus' }
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

// rewards notifications
const handleSignupReward = (id, notification, { senderId, senderIdBtn }) => {
    const { data = {}, message } = notification
    const { status } = data
    // translate message sent by backend
    const { msg } = translated({ msg: message })[0]

    return {
        icon: { name: 'gift' },
        status: !status || status === 'success'
            ? 'info'
            : 'error',
        content: (
            <div>
                <div >
                    {msg || textsCap.signupRewardMsg}
                </div>
            </div>
        )
    }
}

// register notification view handlers
setTimeout(() => [
    {
        handler: handleRewards,
        type: 'rewards',
    },
    {
        childType: 'signupReward',
        handler: handleSignupReward,
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