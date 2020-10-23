import React from 'react'
import { ButtonAcceptOrReject, UserID } from '../../components/buttons'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { generateHash, isObj } from '../../utils/utils'
import { remove as removeLocation, set as saveLocation } from '../location/location'
import { inputNames as locationKeys } from '../location/LocationForm'
import { remove, setItemViewHandler } from '../notification/notification'
import { get } from './partner'
import PartnerForm from './PartnerForm'

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

// identity received from other user
const handleIdentityReceived = (id, notification, { senderId, senderIdBtn }) => {
    const { data, message } = notification
    const { address, introducedBy, location } = data || {}
    const actionBtn = (
        <ButtonAcceptOrReject {...{
            acceptColor: 'blue',
            acceptText: textsCap.addPartner,
            rejectText: textsCap.ignore,
            onClick: accepted => {
                if (!accepted) return remove(id)

                const locationId = generateHash(address)
                const hasLocation = isObj(location)
                // remove the location if partner wasn't added
                const removeLocIfNoPartner = () => !get(address) && removeLocation(locationId)
                if (hasLocation) {
                    location[locationKeys.partnerIdentity] = address
                    saveLocation(location, locationId)
                }
                                        
                showForm(PartnerForm, {
                    values: { ...data, userId: senderId },
                    onClose: removeLocIfNoPartner,
                    onSubmit: success => {
                        // remove notification
                        if (success) return
                        // partner wasn't created
                        removeLocIfNoPartner()
                    },
                })
            }
        }} />
    )
    return {
        icon: { name: 'user plus' },
        content: (
            <div>
                <div><b>{textsCap.identityShareMsg} {senderIdBtn}</b></div>
                {introducedBy && (
                    <div style={{ fontSize: '75%' }}>
                        {textsCap.introducedBy} <UserID userId={introducedBy} />
                    </div>
                )}
                {actionBtn}
                <div>{message}</div>
            </div>
        )
    }
}

// register notification view handlers
setTimeout(() => [
    {
        childType: 'share',
        handler: handleIdentityReceived,
        type: 'identity',
    },
].forEach(x => setItemViewHandler(x.type, x.childType, x.handler)))