import React, { useState } from 'react'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import { getInboxKey, newInbox, inboxSettings, hiddenInboxKeys } from './chat'
import { translated } from '../../services/language'
import { isFn } from '../../utils/utils'
import { showForm, closeModal } from '../../services/modal'

const [_, textsCap] = translated({
    header: 'open chat',
    nameLabel: 'name (only visible to you)',
    namePlaceholder: 'enter a name for the group chat',
    totemTrollbox: 'Totem Trollbox',
    updateName: 'update group name',
}, true)
const EVERYONE = 'everyone'
export default function NewInboxForm(props) {
    const names = {
        name: 'name',
        receiverIds: 'receiverIds'
    }
    const [success, setSuccess] = useState(false)
    const hiddenKeys = hiddenInboxKeys()
    const [inputs, setInputs] = useState([
        {
            autoFocus: true,
            excludeOwnId: true,
            includeFromChat: true,
            includePartners: true,
            multiple: true,
            name: names.receiverIds,
            options: hiddenKeys.map(key => ({
                icon: key === EVERYONE ? 'globe' : (
                    key.split(',').length > 1 ? 'group' : 'chat'
                ),
                key,
                text: key === EVERYONE ? textsCap.totemTrollbox : (
                    inboxSettings(key).name || key.replace(',', ', ')
                ),
                value: key,
            })),
            onChange: (_, values) => {
                const userIds = values[names.receiverIds].map(x => x.split(',')).flat()
                const nameIn = findInput(inputs, names.name)
                const inboxKey = getInboxKey(userIds)
                const hideName = !inboxKey || inboxKey.split(',').length <= 1
                const value = hideName ? '' : inboxSettings(inboxKey).name || nameIn.value
                nameIn.hidden = hideName
                nameIn.required = !hideName
                nameIn.bond.changed(value)
                setInputs(inputs)
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
        // receiverIds.forEach((id, index) => {
        //     if (!id.includes(',')) return
        //     receiverIds[index] = id.split(',')
        // })
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
    size: 'mini',
}

// edit group inbox name
export const editName = inboxKey => {
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
            onSubmit: (_, { name }) => inboxSettings(inboxKey, { name }) | closeModal(formId),
            size: 'mini',
        }
    )
}