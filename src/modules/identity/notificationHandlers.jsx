import React from 'react'
import { ButtonAcceptOrReject, UserID } from '../../components/buttons'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import IdentityShareForm from '../identity/IdentityShareForm'
import { remove, setItemViewHandler } from '../notification/notification'
import { remove as removeLocation, set as saveLocation } from '../location/location'

const textsCap = translated({
    ignore: 'ignore',
    share: 'share',
    reason: 'reason',
    addPartner: 'add partner',
    indentityIntroduceMsg: 'recommended you to share your identity with the following user:',
    identityRequestMsg: 'requested an identity',
    identityShareMsg: 'identity received from:',
    introducedBy: 'introduced by',
    yourIdentity: 'your identity',
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
    const { location, userId } = data || {}
    const isIntroduce = childType === 'introduce'
    // user who is to receive an identity
    const recipientId = isIntroduce ? userId : senderId
    const msg = {
        icon: {
            name: isIntroduce ? 'handshake' : 'user'
        }
    }
    msg.content = (
        <div>
            <div>
                <b>{senderIdBtn} {!isIntroduce ? textsCap.identityRequestMsg : textsCap.indentityIntroduceMsg}</b>
                {isIntroduce && <UserID userId={recipientId} prefix=' ' />}
                {!isIntroduce && (
                    <div>
                        <b>{textsCap.reason} :</b> {data.reason}
                    </div>
                )}
            </div>
            <ButtonAcceptOrReject
                acceptColor='blue'
                acceptText={textsCap.share}
                rejectText={textsCap.ignore}
                onClick={accepted => {
                    if (!accepted) return remove(id)
                    const locationId = !location ? undefined : saveLocation(location)
                    showForm(IdentityShareForm, {
                        inputsDisabled: ['userIds'],
                        onSubmit: success => success ? remove(id) : removeLocation(locationId),
                        values: {
                            introducedBy: isIntroduce ? senderId : null,
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