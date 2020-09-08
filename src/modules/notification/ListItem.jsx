import React from 'react'
// components
import { ButtonAcceptOrReject, UserID } from '../../components/buttons'
import TimeSince from '../../components/TimeSince'
import { Message } from '../../components/Message'
// forms
import IdentityShareForm from '../../forms/IdentityShare'
import PartnerForm from '../../forms/Partner'
// services
import identityService from '../../services/identity'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { handleTKInvitation, remove, toggleRead } from './notification'

const textsCap = translated({
    // timekeeping: 'timekeeping'
    // acceptInvitation: 'accept invitation',
    // acceptedInvitation: 'accepted invitation to activity',
    // rejectInvitation: 'reject invitation',
    // rejectedInvitation: 'rejected invitation to activity',
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

export default React.memo(function NotificationItem({ id, notification }) {
    const { from, type, childType, message, data, tsCreated, read } = notification || {}
    const senderId = from || notification.senderId // (previously used)
    const userIdBtn = <UserID userId={senderId} />
    const typeSpaced = type.replace('_', ' ')
    const msg = {
        className: 'list-item',
        icon: { name: 'bell outline' },
        key: id,
        onClick: () => toggleRead(id),
        onDismiss: e => e.stopPropagation() | remove(id),
        status: read ? undefined : 'info',
        style: { cursor: 'pointer' }
    }

    switch (type + ':' + childType) {
        case 'identity:introduce': // data => {userId}
        case 'identity:request': // data => {reason}
            const isIntroduce = childType === 'introduce'
            msg.icon.name = isIntroduce ? 'handshake' : 'user'
            const recipientId = isIntroduce ? data.userId : senderId
            msg.content = (
                <div>
                    <div>
                        <b>{userIdBtn} {!isIntroduce ? textsCap.identityRequestMsg : textsCap.indentityIntroduceMsg}</b>
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
                    <div><b>{textsCap.identityShareMsg} {userIdBtn}</b></div>
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
        case 'time_keeping:invitation': // data => { projectHash, projectName, workerAddress }
            // wrong user id used to send invitation. address does not belong to user
            const identity = identityService.find(data.workerAddress)
            if (!identity) {
                remove(id)
                return ''
            }
            msg.icon.name = 'clock outline'
            msg.content = (
                <div>
                    {userIdBtn} {textsCap.tkInvitationMsg}<br />
                    {textsCap.yourIdentity}: <b>{identity.name}</b><br />
                    {textsCap.activity}: <b>{data.projectName}</b><br />
                    <ButtonAcceptOrReject
                        acceptColor='blue'
                        onClick={accepted => confirm({
                            onConfirm: () => handleTKInvitation(
                                data.projectHash,
                                data.workerAddress,
                                accepted,
                                senderId,
                                data.projectName,
                                id,
                            ),
                            size: 'mini',
                        }
                        )} />
                </div>
            )
            break
        case 'time_keeping:invitation_response': // data => { projectHash, projectName, workerAddress }
            msg.icon.name = 'clock outline'
            msg.content = (
                <div>
                    {userIdBtn} {data.accepted ? textsCap.tkInviteAcceptMsg : textsCap.tkInviteRejectMsg}:
                    <b> {data.projectName}</b>
                </div>
            )
            break
        default:
            msg.content = <span>{userIdBtn}: {message}</span>
            msg.header = <div className="header">{typeSpaced} {childType}</div>
    }

    msg.content = (
        <div className='details'>
            {msg.content}
            <TimeSince className='time-since' time={tsCreated} />
        </div>
    )
    return <Message  {...msg} key={id + read} />
})