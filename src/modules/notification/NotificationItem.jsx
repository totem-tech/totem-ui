import React from 'react'
// components
import { ButtonAcceptOrReject, UserID } from '../../components/buttons'
import TimeSince from '../../components/TimeSince'
import { Message } from '../../components/Message'
// forms
import IdentityShareForm from '../identity/IdentityShareForm'
import PartnerForm from '../partner/PartnerForm'
// services
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { itemViewHandlers, remove, toggleRead } from './notification'
import { isFn } from '../../utils/utils'

const textsCap = translated({
    activity: 'activity',
    ignore: 'ignore',
    share: 'share',
    reason: 'reason',
    addPartner: 'add partner',
    indentityIntroduceMsg: 'recommended you to share your identity with the following user:',
    identityRequestMsg: 'requested an identity',
    identityShareMsg: 'identity received from:',
    tkInvitationMsg: 'invited you to start booking time.',
    tkInviteAcceptMsg: 'accepted your invitation to the following activity',
    tkInviteRejectMsg: 'rejected your invitation to the following activity',
    yourIdentity: 'your identity',
}, true)[1]

export default React.memo(({ id, notification }) => {
    const { from, type, childType, message, data, tsCreated, read, status } = notification || {}
    const key = `${type}:${childType}`
    const handler = itemViewHandlers[key]
    const senderId = from || notification.senderId // (previously used)
    const senderIdBtn = <UserID userId={senderId} />
    const isCustom = isFn(handler)
    let msg = {
        ...(!isFn(handler) ? {} : handler(
            id,
            notification,
            {
                senderId,
                senderIdBtn,
            }))
    }
    msg.icon = msg.icon || { name: 'bell outline' }

    if (!isCustom) {
        switch (key) {
            case 'identity:introduce': // data => {userId}
            case 'identity:request': // data => {reason}
                const isIntroduce = childType === 'introduce'
                msg.icon.name = isIntroduce ? 'handshake' : 'user'
                const recipientId = isIntroduce ? data.userId : senderId
                msg.content = (
                    <div>
                        <div>
                            <b>{senderIdBtn} {!isIntroduce ? textsCap.identityRequestMsg : textsCap.indentityIntroduceMsg}</b>
                            {isIntroduce ? <UserID userId={recipientId} prefix=' ' /> : (
                                <div><b>{textsCap.reason} :</b> {data.reason}</div>
                            )}
                        </div>
                        <ButtonAcceptOrReject
                            acceptColor='blue'
                            acceptText={textsCap.share}
                            onClick={accepted => !accepted ? remove(id) : showForm(IdentityShareForm, {
                                inputsDisabled: ['userIds'],
                                onSubmit: success => success && remove(id),
                                values: {
                                    introducedBy: isIntroduce ? senderId : null,
                                    userIds: [recipientId],
                                },
                            })}
                        />
                    </div>
                )
                break
            case 'identity:share': // data => { address, introducedBy, name }
                msg.icon.name = 'user plus'
                msg.content = (
                    <div>
                        <div><b>{textsCap.identityShareMsg} {senderIdBtn}</b></div>
                        <ButtonAcceptOrReject
                            acceptColor='blue'
                            acceptText={textsCap.addPartner}
                            onClick={accepted => !accepted ? remove(id) : showForm(
                                PartnerForm,
                                {
                                    onSubmit: success => success && remove(id),
                                    values: { ...data, userId: data.introducedBy || senderId },
                                }
                            )}
                            rejectText={textsCap.ignore}
                        />
                        <div>{message}</div>
                    </div>
                )
                break
            default:
                msg.content = <span>{senderIdBtn}: {message}</span>
                msg.header = <div className='header'>{type.replace(/-|_/g, ' ')} {childType.replace(/-|_/g, ' ')}</div>
        }
    }

    msg.content = (
        <div className='details'>
            {msg.content}
            <TimeSince className='time-since' time={tsCreated} />
        </div>
    )
    return <Message  {...{
        ...msg,
        icon: status === 'loading' ? true : msg.icon || { name: 'bell outline' },
        className: 'list-item',
        // key: id + read,
        onClick: () => toggleRead(id),
        onDismiss: e => e.stopPropagation() | remove(id),
        status: status === 'loading' ? 'loading' : read ? 'basic' : 'info',
        style: {
            ...msg.style,
            cursor: 'pointer',
            textAlign: 'left',
        }
    }} />
})