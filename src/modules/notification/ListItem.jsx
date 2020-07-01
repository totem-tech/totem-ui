import React from 'react'
// components
import { ButtonAcceptOrReject, UserID } from '../../components/buttons'
import TimeSince from '../../components/TimeSince'
import Message from '../../components/Message'
// forms
import IdentityShareForm from '../../forms/IdentityShare'
import PartnerForm from '../../forms/Partner'
// services
import identityService from '../../services/identity'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { handleTKInvitation, remove, toggleRead } from './notification'

const [words, wordsCap] = translated({
    activity: 'activity',
    ignore: 'ignore',
    share: 'share',
    reason: 'reason',
    timekeeping: 'timekeeping'
}, true)
const [texts] = translated({
    addPartner: 'Add partner',
    acceptInvitation: 'accept invitation',
    acceptedInvitation: 'accepted invitation to activity',
    indentityIntroduceMsg: 'recommended you to share your identity with the following user: ',
    identityRequestMsg: 'requested an identity',
    identityShareMsg: 'Identity received from:',
    rejectInvitation: 'reject invitation',
    rejectedInvitation: 'rejected invitation to activity',
    tkInvitationMsg: 'invited you to start booking time.',
    tkInviteAcceptMsg: 'accepted your invitation to the following activity',
    tkInviteRejectMsg: 'rejected your invitation to the following activity',
    yourIdentity: 'Your identity',
})


export default function NotificationItem({ id, notification }) {
    const { from, type, childType, message, data, tsCreated, read } = notification
    const senderId = from || notification.senderId // (previously used)
    const userIdBtn = <UserID userId={senderId} />
    const typeSpaced = type.replace('_', ' ')
    const msg = {
        // attached: true,
        icon: { name: 'bell outline' },
        content: <span>{userIdBtn}: {message}</span>,
        header: `${typeSpaced} ${childType}`,
        key: id,
        onClick: () => toggleRead(id),
        onDismiss: e => e.stopPropagation() | remove(id),
        status: read ? undefined : 'info',
        style: {
            margin: 0,
            textAlign: 'left',
        },
    }

    switch (type + ':' + childType) {
        case 'identity:introduce': // data => {userId}
        case 'identity:request': // data => {reason}
            const isIntroduce = childType === 'introduce'
            msg.header = undefined
            msg.icon.name = isIntroduce ? 'handshake' : 'user'
            const recipientId = isIntroduce ? data.userId : senderId
            msg.content = (
                <div>
                    <div>
                        <b>{userIdBtn} {!isIntroduce ? texts.identityRequestMsg : texts.indentityIntroduceMsg}</b>
                        {isIntroduce ? <UserID userId={recipientId} /> : (
                            <div><b>{wordsCap.reason} :</b> {data.reason}</div>
                        )}
                    </div>
                    <ButtonAcceptOrReject
                        acceptColor='blue'
                        acceptText={wordsCap.share}
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
            msg.header = undefined
            msg.icon.name = 'user plus'
            msg.content = (
                <div>
                    <div><b>{texts.identityShareMsg} {userIdBtn}</b></div>
                    <ButtonAcceptOrReject
                        acceptColor='blue'
                        acceptText={texts.addPartner}
                        onClick={accepted => !accepted ? remove(id) : showForm(
                            PartnerForm,
                            {
                                onSubmit: success => success && remove(id),
                                values: { ...data, userId: data.introducedBy || senderId },
                            }
                        )}
                        rejectText={wordsCap.ignore}
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
            msg.header = undefined
            msg.icon.name = 'clock outline'
            msg.content = (
                <div>
                    {userIdBtn} {texts.tkInvitationMsg}<br />
                    {texts.yourIdentity}: <b>{identity.name}</b><br />
                    {wordsCap.activity}: <b>{data.projectName}</b><br />
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
            msg.header = undefined
            msg.icon.name = 'clock outline'
            msg.content = (
                <div>
                    {userIdBtn} {data.accepted ? texts.tkInviteAcceptMsg : texts.tkInviteRejectMsg}:
                    <b> {data.projectName}</b>
                </div>
            )
            break
    }

    msg.content = (
        <div style={styles.messageContent}>
            {msg.content}
            <TimeSince {...{
                style: {
                    bottom: 0,
                    color: 'grey',
                    fontSize: 11,
                    fontStyle: 'italic',
                    left: 5,
                    position: 'absolute',
                },
                time: tsCreated
            }} />
        </div>
    )
    msg.header = <div className="header" style={styles.messageHeader}>{msg.header} {id}</div>
    return <Message {...msg} />
}

const styles = {
    messageContent: {
        whiteSpace: 'pre-wrap',
        // padding: '0 12px 0 55px',
    },
    messageHeader: { textTransform: 'capitalize' },
}