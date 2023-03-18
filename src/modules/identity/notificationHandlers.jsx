import React from 'react'
import { ButtonAcceptOrReject, UserID } from '../../components/buttons'
import { translated } from '../../utils/languageHelper'
import { showForm } from '../../services/modal'
import IdentityShareForm from '../identity/IdentityShareForm'
import { remove, setItemViewHandler } from '../notification/notification'
import { remove as removeLocation, set as saveLocation } from '../location/location'

const textsCap = translated({
    ignore: 'ignore',
    share: 'share',
    reason: 'reason',
    indentityIntroduceMsg: 'recommended you to share your identity with the following user:',
    identityRequestMsg: 'requested an identity',
    introducedBy: 'introduced by',
}, true)[1]

/**
 * @name    handleIdentityRequest
 * @summary handle notifications with requests to share identity
 * 
 * @param {String} id notification ID 
 * @param {Object} notification
 * @param {Object} shortcuts
 * 
 * @returns {Object} a message object to be used with Message component
 */
const handleIdentityRequest = (id, notification, { senderId, senderIdBtn }) => {
    if (!notification) return
    const { data, childType } = notification
    const {
        location,
        reason,
        userId,
    } = data || {}
    const isIntroduce = childType === 'introduce'
    // user who is to receive an identity
    const recipientId = isIntroduce
        ? userId
        : senderId
    const msg = {
        icon: {
            name: isIntroduce
                ? 'handshake'
                : 'user circle',
            style: {
                fontSize: isIntroduce
                    ? 32
                    : undefined,
            }
        },
    }
    const { reason: reasonTranslated } = translated({ reason }, true)[1]
    msg.content = (
        <div>
            <div>
                <b>
                    {senderIdBtn}{' '}
                    {(!isIntroduce
                        ? textsCap.identityRequestMsg || ''
                        : textsCap.indentityIntroduceMsg || ''
                    ).toLowerCase()}
                </b>
                {isIntroduce && <UserID userId={recipientId} prefix=' ' />}
                {!isIntroduce && (
                    <div>
                        <b>{textsCap.reason}:</b> {reasonTranslated || reason}
                    </div>
                )}
            </div>
            <ButtonAcceptOrReject
                acceptColor='blue'
                acceptText={textsCap.share}
                rejectText={textsCap.ignore}
                onAction={(_, accepted) => {
                    if (!accepted) return remove(id)
                    
                    const locationId = !location
                        ? undefined
                        : saveLocation(location)
                    
                    showForm(IdentityShareForm, {
                        inputsDisabled: ['userIds'],
                        onSubmit: success => success
                            ? remove(id)
                            : removeLocation(locationId),
                        values: {
                            introducedBy: isIntroduce
                                ? senderId
                                : null,
                            locationId,
                            userIds: [recipientId],
                        },
                    })
                }}
            />
        </div>
    )

    return msg
}

// register notification view handlers
setTimeout(() => [
    { // a request to share identity with a third-party user
        childType: 'introduce',
        handler: handleIdentityRequest,
        type: 'identity',
    },
    {
        childType: 'request',
        handler: handleIdentityRequest,
        type: 'identity',
    },
].forEach(x => setItemViewHandler(x.type, x.childType, x.handler)))