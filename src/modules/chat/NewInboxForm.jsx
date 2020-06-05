import React, { useState } from 'react'
import { Bond } from 'oo7'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import { isFn, arrSort, textEllipsis } from '../../utils/utils'
import { getInboxKey, hiddenInboxKeys, inboxBonds, inboxSettings, newInbox } from './chat'
import { translated } from '../../services/language'
import { showForm, closeModal } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'

const [_, textsCap] = translated({
    group: 'group',
    header: 'start chat',
    nameLabel: 'group name',
    namePlaceholder: 'enter a name for the group chat',
    open: 'open',
    subheader: 'start new or re-open archived chat',
    totemTrollbox: 'Totem Trollbox',
    updateName: 'update group name',
    userIdsHint: 'To start a group chat enter multiple User IDs',
}, true)
const EVERYONE = 'everyone'
export default function NewInboxForm(props) {
    const names = {
        name: 'name',
        receiverIds: 'receiverIds'
    }
    const [success, setSuccess] = useState(false)

    const inboxKeys = hiddenInboxKeys().concat(Object.keys(inboxBonds))
    const [inputs, setInputs] = useState([
        {
            autoFocus: true,
            excludeOwnId: true,
            includeFromChat: true,
            includePartners: true,
            message: { content: textsCap.userIdsHint },
            multiple: true,
            name: names.receiverIds,
            options: arrSort(
                inboxKeys.map(key => {
                    const isGroup = key.split(',').length > 1
                    const isTrollbox = key === EVERYONE
                    const groupName = inboxSettings(key).name
                    const members = textEllipsis(key.replace(/\,/g, ', '), 30, 3, false)
                    const text = isTrollbox ? textsCap.totemTrollbox : groupName || members
                    return {
                        description: groupName && members,
                        icon: isTrollbox ? 'globe' : (isGroup ? 'group' : 'chat'),
                        key,
                        text: `${isGroup ? textsCap.group + ': ' : ''}${text}`,
                        value: key,
                    }
                }),
                'text',
            ),
            onChange: (_, values) => {
                const userIds = values[names.receiverIds].map(x => x.split(',')).flat()
                const nameIn = findInput(inputs, names.name)
                const inboxKey = getInboxKey(userIds)
                const hideName = !inboxKey || inboxKey.split(',').length <= 1
                const value = hideName ? '' : inboxSettings(inboxKey).name || nameIn.value
                nameIn.hidden = hideName
                nameIn.required = !hideName
                setInputs(inputs)
                nameIn.bond.changed(value)
            },
            required: true,
            type: 'UserIdInput',
        },
        {
            bond: new Bond(),
            hidden: true,
            label: textsCap.nameLabel,
            maxLength: 16,
            name: names.name,
            placeholder: textsCap.namePlaceholder,
            required: true,
            type: 'text',
            value: '',
        },
    ])

    const handleSubmit = (_, values) => {
        const { onSubmit } = props
        const receiverIds = values[names.receiverIds].map(x => x.split(',')).flat()
        const name = values[names.name]
        const inboxKey = getInboxKey(receiverIds)
        newInbox(receiverIds, receiverIds.length > 1 ? name : null, true)
        setSuccess(true)
        isFn(onSubmit) && onSubmit(true, { inboxKey, ...values })
    }

    return (
        <FormBuilder {...{
            ...props,
            inputs,
            onSubmit: handleSubmit,
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

// edit group inbox name
export const editName = (inboxKey, onSubmit) => {
    const formId = showForm(
        FormBuilder,
        {
            header: textsCap.updateName,
            inputs: [{
                label: textsCap.nameLabel,
                maxLength: 16,
                name: 'name',
                placeholder: textsCap.namePlaceholder,
                required: false,
                type: 'text',
                value: inboxSettings(inboxKey).name || '',
            }],
            onSubmit: (_, { name }) => {
                const receiverIds = inboxKey.split(',')
                addToQueue({
                    args: [receiverIds, name],
                    func: 'messageGroupName',
                    silent: true,
                    type: QUEUE_TYPES.CHATCLIENT,
                })
                inboxSettings(inboxKey, { name }, true)
                closeModal(formId)
                isFn(onSubmit) && onSubmit(true)
            },
            size: 'mini',
        }
    )
}