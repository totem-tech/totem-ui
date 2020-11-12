import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, { fillValues, findInput,  } from '../../components/FormBuilder'
import { isFn, arrSort, textEllipsis, isArr, isStr, arrUnique } from '../../utils/utils'
// services
import { getUser, rxIsRegistered } from './ChatClient'
import { translated } from '../../services/language'
import { showForm, closeModal } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import {
    createInbox,
    getInboxKey,
    inboxSettings,
    inboxesSettings,
    SUPPORT,
    TROLLBOX,
    rxOpenInboxKey,
} from './chat'
import { getInboxName } from './InboxList'
import { useRxSubject } from '../../services/react'

const [_, textsCap] = translated({
    group: 'group',
    header: 'start chat',
    nameLabel: 'group name',
    namePlaceholder: 'enter a name for the group chat',
    open: 'open',
    subheader: 'start new or re-open archived chat',
    totemSupport: 'Totem Support',
    totemTrollbox: 'Totem Trollbox',
    updateName: 'update group name',
    userIdsHint: 'To start a group chat enter multiple User IDs',
}, true)
const EVERYONE = 'everyone'

const inputNames = {
    name: 'name',
    receiverIds: 'receiverIds'
}
export default function NewInboxForm(props) {
    const [isRegistered] = useRxSubject(rxIsRegistered)
    const [success, setSuccess] = useState(false)
    const [inputs] = useRxSubject(getRxInputs())
    return (
        <FormBuilder {...{
            ...props,
            inputs,
            onSubmit: handleSubmit(setSuccess, props.onSubmit),
            success,
        }} />
    )
}
NewInboxForm.defaultProps = {
    closeOnSubmit: true,
    header: textsCap.header,
    size: 'tiny',
    subheader: textsCap.subheader,
    submitText: textsCap.open,
}
NewInboxForm.propTypes = {
    values: PropTypes.object
}


const getRxInputs = values => {
    const allInboxKeys = Object.keys(inboxesSettings())
    const receiverIdOptions = allInboxKeys.map(key => {
        const receiverIds = key.split(',')
        const isTrollbox = key === EVERYONE
        const isSupport = receiverIds.includes(SUPPORT)
        const isGroup = !isSupport && key.split(',').length > 1
        const name = getInboxName(key)
        const members = textEllipsis(key.replace(/\,/g, ', '), 30, 3, false)
        const text = name || members
        return {
            description: !isSupport && !isTrollbox && name && members,
            icon: isSupport ? 'heartbeat' : isTrollbox ? 'globe' : (isGroup ? 'group' : 'chat'),
            key,
            text: `${isGroup ? textsCap.group + ': ' : ''}${text}`,
            value: key,
        }
    })
    const rxInputs = new BehaviorSubject(
        fillValues([
            {
                autoFocus: true,
                excludeOwnId: true,
                includeFromChat: true,
                includePartners: true,
                message: { content: textsCap.userIdsHint },
                multiple: true,
                name: inputNames.receiverIds,
                options: arrSort(receiverIdOptions, 'text'),
                onChange: (_, values) => {
                    const nameIn = findInput(rxInputs.value, inputNames.name)
                    const userIds = values[inputNames.receiverIds]
                        .map(x => x.split(','))
                        .flat()
                    const inboxKey = getInboxKey(userIds)
                    const [_ig, allowNaming] = checkGroup(userIds)
                    nameIn.hidden =
                        nameIn.rxValue.next(allowNaming && inboxSettings(inboxKey).name || '')
                },
                required: true,
                rxValue: new BehaviorSubject([]),
                type: 'UserIdInput',
            },
            {
                label: textsCap.nameLabel,
                minLength: 3,
                maxLength: 32,
                name: inputNames.name,
                placeholder: textsCap.namePlaceholder,
                required: true,
                rxValue: new BehaviorSubject(''),
                type: 'text',
            },
        ], values)
    )
    return rxInputs
}
const handleSubmit = (setSuccess, onSubmit) => async (_, values) => {
    let receiverIds = arrUnique(
        values[inputNames.receiverIds]
            .map(x => x.split(','))
            .flat()
    )
    const { id: ownId, roles = [] } = getUser() || {}
    if (receiverIds.includes(SUPPORT)) {
        receiverIds = [
            SUPPORT,
            !roles.includes(SUPPORT)
                ? null
                : receiverIds.filter(id =>
                    ![SUPPORT, ownId].includes(id)
                )[0]
        ].filter(Boolean)
    }
    const name = receiverIds.length > 1 ? values[inputNames.name] : null
    const inboxKey = createInbox(receiverIds, name, true)
    rxOpenInboxKey.next(inboxKey)
    setSuccess(true)
    isFn(onSubmit) && onSubmit(true, { inboxKey, ...values })
}

/**
 * @name    checkGroup
 * @summary checks if supplied is a group and whether group can be named
 *  
 * @param   {String|Array} keyOrIds inboxKey or receiver IDs
 * 
 * @returns {Array} [isGroup, allowNaming, receiverIds]
 */
const checkGroup = keyOrIds => {
    let receiverIds = isArr(keyOrIds)
        ? keyOrIds
        : isStr(keyOrIds)
            ? keyOrIds.split(',')
            : []
    receiverIds = arrUnique(receiverIds).filter(Boolean)
    const isGroup = receiverIds.length > 1
    const allowNaming = isGroup && !receiverIds.find(x => [SUPPORT, TROLLBOX].includes(x))
    return [isGroup, allowNaming, receiverIds]
}
/**
 * @name    showEditNameFrom
 * @summary open a modal form to update name of a group chat
 * 
 * @param   {String}    inboxKey 
 * @param   {Function}  onSubmit 
 */
export const showEditNameFrom = (inboxKey, onSubmit) => {
    const [_, isValidGroup, receiverIds] = checkGroup(inboxKey)
    // inbox is not a valid group or does not support name change
    if (!isValidGroup) return
    const originalName = inboxSettings(inboxKey).name || ''
    const formId = showForm(
        FormBuilder,
        {
            header: textsCap.updateName,
            inputs: [{
                label: textsCap.nameLabel,
                maxLength: 18,
                minLength: 3,
                name: 'name',
                placeholder: textsCap.namePlaceholder,
                required: false,
                type: 'text',
                value: originalName,
            }],
            onSubmit: (_, { name }) => {
                closeModal(formId)
                if (name === originalName) return

                addToQueue({
                    args: [receiverIds, name],
                    func: 'messageGroupName',
                    silent: true,
                    type: QUEUE_TYPES.CHATCLIENT,
                })
                inboxSettings(inboxKey, { name })
                isFn(onSubmit) && onSubmit(true)
            },
            size: 'mini',
        }
    )
}