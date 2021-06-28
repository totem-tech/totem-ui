import React from 'react'
import { translated } from '../../services/language'
import { remove, rxVisible, setItemViewHandler } from '../notification/notification'

const textsCap = translated({
    ignore: 'ignore',
    share: 'share',
    reason: 'reason',
    addPartner: 'add partner',
    indentityIntroduceMsg: 'recommended you to share your identity with the following user:',
    identityRequestMsg: 'requested an identity',
    identityShareMsg: 'identity received from:',
    introducedBy: 'introduced by',
    updatePartner: 'update partner',
    yourIdentity: 'your identity',
}, true)[1]

// identity received from other user
const handleRewards = (id, notification, { senderId, senderIdBtn }) => {
    const { data = {}, message } = notification
    const { status } = data

    return {
        icon: { name: 'user plus' },
        status,
        content: (
            <div>
                <div><b>{senderIdBtn}</b> {message}</div>
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
].forEach(x => setItemViewHandler(x.type, x.childType, x.handler)))