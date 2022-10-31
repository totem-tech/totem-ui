import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, { fillValues, findInput,  } from '../../components/FormBuilder'
import { isFn, arrSort, textEllipsis, isArr, isStr, arrUnique, escapeStringRegexp } from '../../utils/utils'
// services
import { getUser, rxIsRegistered } from './ChatClient'
import { translated } from '../../services/language'
import { showForm, closeModal } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { useRxSubject } from '../../services/react'
import {
    createInbox,
    getInboxKey,
    inboxSettings,
    inboxesSettings,
    SUPPORT,
    TROLLBOX,
    rxOpenInboxKey,
    TROLLBOX_ALT,
} from './chat'
import { getInboxName } from './InboxList'
import RegistrationForm from './RegistrationForm'

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

const inputNames = {
    name: 'name',
    userIds: 'userIds'
}
export default function NewInboxForm(props) {
    const [isRegistered] = useRxSubject(rxIsRegistered)
    if (!isRegistered) {
        const values = props.values || {}
        const params = [
            'form=chat',
            ...Object.keys(values)
            .map(key => `${key}=${escapeStringRegexp(values[key])}`)
        ].join('&')
        const redirectTo = `${location.protocol}//${location.host}?${params}`
        
        showForm(RegistrationForm, { values: { redirectTo, silent: true } })
        return ''
    }

    const [success, setSuccess] = useState(false)
    const [inputs] = useRxSubject(getRxInputs(props))

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
    modalId: 'NewInboxForm',
    size: 'tiny',
    subheader: textsCap.subheader,
    submitText: textsCap.open,
}
NewInboxForm.propTypes = {
    values: PropTypes.object
}

const getRxInputs = props => {
    const { values = {} } = props || {}
    let { userids, userIds } = values
    userIds = userIds || userids
    values.userIds = isArr(userIds)
        ? userIds 
        : `${userIds || ''}`
            .split(',') 
            .map(x => x.trim())
            .filter(Boolean)
    
    const allInboxKeys = arrUnique([...Object.keys(inboxesSettings()), ...values.userIds])
    const userIdOptions = allInboxKeys.map(key => {
        const userIds = key.split(',')
        const isTrollbox = [TROLLBOX, TROLLBOX_ALT].includes(key)
        const isSupport = userIds.includes(SUPPORT)
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

    const rxInputs = new BehaviorSubject(fillValues([
        {
            autoFocus: true,
            excludeOwnId: true,
            includeFromChat: true,
            includePartners: true,
            message: { content: textsCap.userIdsHint },
            multiple: true,
            name: inputNames.userIds,
            options: arrSort(userIdOptions, 'text'),
            onChange: (_, values) => {
                const inputs = rxInputs.value
                const nameIn = findInput(inputs, inputNames.name)
                const userIds = values[inputNames.userIds]
                    .map(x => x.split(','))
                    .flat()
                const inboxKey = getInboxKey(userIds)
                const [_ig, allowNaming] = checkGroup(userIds)
                nameIn.hidden = !allowNaming
                nameIn.rxValue.next(allowNaming && inboxSettings(inboxKey).name || '')
                rxInputs.next([...inputs])
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
    ], values))
    return rxInputs
}
const handleSubmit = (setSuccess, onSubmit) => async (_, values) => {
    let userIds = arrUnique(
        values[inputNames.userIds]
            .map(x => x.split(','))
            .flat()
    )
    const { id: ownId, roles = [] } = getUser() || {}
    if (userIds.includes(SUPPORT)) {
        userIds = [
            SUPPORT,
            !roles.includes(SUPPORT)
                ? null
                : userIds.filter(id =>
                    ![SUPPORT, ownId].includes(id)
                )[0]
        ].filter(Boolean)
    }
    const name = userIds.length > 1 ? values[inputNames.name] : null
    const inboxKey = createInbox(userIds, name, true)
    rxOpenInboxKey.next(inboxKey)
    setSuccess(true)
    isFn(onSubmit) && onSubmit(true, { inboxKey, ...values })
}

/**
 * @name    checkGroup
 * @summary checks if supplied is a group and whether group can be named
 *  
 * @param   {String|Array} keyOrIds inboxKey or recipient IDs
 * 
 * @returns {Array} [isGroup, allowNaming, recipientIds]
 */
const checkGroup = keyOrIds => {
    let userIds = isArr(keyOrIds)
        ? keyOrIds
        : isStr(keyOrIds)
            ? keyOrIds.split(',')
            : []
    userIds = arrUnique(userIds).filter(Boolean)
    const isGroup = userIds.length > 1
    const allowNaming = isGroup && !userIds.find(x => [SUPPORT, TROLLBOX, TROLLBOX_ALT].includes(x))
    return [isGroup, allowNaming, userIds]
}
/**
 * @name    showEditNameFrom
 * @summary open a modal form to update name of a group chat
 * 
 * @param   {String}    inboxKey 
 * @param   {Function}  onSubmit 
 */
export const showEditNameForm = (inboxKey, onSubmit) => {
    const [_, isValidGroup, userIds] = checkGroup(inboxKey)
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
                    args: [userIds, name],
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