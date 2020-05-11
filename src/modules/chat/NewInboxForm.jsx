import React, { useState } from 'react'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import { getInboxKey, inboxBonds, newInbox, inboxSettings } from './chat'
import { translated } from '../../services/language'
import { isFn } from '../../utils/utils'
import { showForm, closeModal } from '../../services/modal'

const [_, textsCap] = translated({
    header: 'start chat',
    nameLabel: 'name (only visible to you)',
    namePlaceholder: 'enter a name for the group chat',
    inboxExists: 'a conversation with selected user(s) already exists',
    updateName: 'update group name',
}, true)
export default function NewInboxForm(props) {
    const names = {
        name: 'name',
        receiverIds: 'receiverIds'
    }
    const [success, setSuccess] = useState(false)
    const [message, setMessage] = useState(props.message)
    const [inputs, setInputs] = useState([
        {
            excludeOwnId: true,
            includeFromChat: true,
            multiple: true,
            name: names.receiverIds,
            onChange: (_, values) => {
                const userIds = values[names.receiverIds]
                const nameIn = findInput(inputs, names.name)
                nameIn.hidden = userIds.length <= 1
                nameIn.required = !nameIn.hidden
                nameIn.value = ''
                setInputs(inputs)
            },
            type: 'UserIdInput',
        },
        {
            hidden: true,
            label: textsCap.nameLabel,
            maxLength: 16,
            name: 'name',
            placeholder: textsCap.namePlaceholder,
            required: false,
            type: 'text',
            value: '',
        },
    ])

    const handleSubmit = (_, values) => {
        const { onSubmit } = props
        const receiverIds = values[names.receiverIds]
        const name = values[names.name]
        const inboxKey = getInboxKey(receiverIds)
        if (!!inboxBonds[inboxKey]) return setMessage({
            header: textsCap.inboxExists,
            showIcon: true,
            status: 'error',
        })
        newInbox(receiverIds, receiverIds.length > 1 ? name : null, true)
        setSuccess(true)
        isFn(onSubmit) && onSubmit(true)
    }

    return <FormBuilder {...{
        ...props,
        inputs,
        message,
        onSubmit: handleSubmit,
        success,
    }} />
}
NewInboxForm.defaultProps = {
    closeOnSubmit: true,
    header: 'Start chat',
    size: 'tiny',
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