import React from 'react'
import { ButtonAcceptOrReject, UserID } from '../../components/buttons'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { generateHash, isObj } from '../../utils/utils'
import { get as getLocation, remove as removeLocation, set as saveLocation } from '../location/location'
import { inputNames as locationKeys } from '../location/LocationForm'
import { remove, rxVisible, setItemViewHandler } from '../notification/notification'
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
    updatePartner: 'update partner',
    yourIdentity: 'your identity',
}, true)[1]

// identity received from other user
const handleIdentityReceived = (id, notification, { senderId, senderIdBtn }) => {
    const { data, message } = notification
    const { address, introducedBy, location } = data || {}
    const partnerIdentity = get(address)
    const handleClick = accepted => {
        if (!accepted) return remove(id)

        const locationId = generateHash(address)
        const existingLocation = getLocation(locationId)
        const hasLocation = isObj(location)
        let partnerSaved = false
        // remove the location if partner wasn't added
        const removeLocIfNoPartner = () => {
            if (partnerSaved) return
            // partner wasn't saved/updated but location already exists -> restore to location to original values
            if (existingLocation) return saveLocation(existingLocation, locationId, true)
            removeLocation(locationId)
        }
        if (hasLocation) {
            location[locationKeys.partnerIdentity] = address
            saveLocation({ ...existingLocation, ...location }, locationId)
        }
                                
        showForm(PartnerForm, {
            // prevent saving changes unless user clicks on the submit button
            autoSave: false,
            closeOnSubmit: true,
            onClose: removeLocIfNoPartner,
            values: { ...partnerIdentity, ...data, userId: senderId },
            onSubmit: success => {
                // partner wasn't created
                if (!success) return removeLocIfNoPartner()
                partnerSaved = true
                // remove notification
                remove(id)
                // hide notifications
                rxVisible.next(false)
                
            },
        })
    }
    
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
                <ButtonAcceptOrReject {...{
                    acceptColor: 'blue',
                    acceptText: partnerIdentity ? textsCap.updatePartner : textsCap.addPartner,
                    rejectText: textsCap.ignore,
                    onClick: handleClick,
                }} />
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