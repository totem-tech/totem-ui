import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import { isFn, arrSort, textEllipsis } from '../../utils/utils'
// services
import client, { getUser } from '../../services/chatClient'
import { translated } from '../../services/language'
import { showForm, closeModal } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import {
    createInbox,
    getInboxKey,
    hiddenInboxKeys,
    inboxBonds,
    inboxSettings,
    SUPPORT,
} from './chat'

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
    const inboxKeys = hiddenInboxKeys().concat(Object.keys(inboxBonds))
    const [success, setSuccess] = useState(false)
    const [inputs, setInputs] = useState([
        {
            autoFocus: true,
            bond: new Bond(),
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
                let userIds = values[names.receiverIds].map(x => x.split(',')).flat()
                const nameIn = findInput(inputs, names.name)
                const inboxKey = getInboxKey(userIds)
                const hideName = !inboxKey || inboxKey.split(',').length <= 1 || userIds.includes(SUPPORT)
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
            minLength: 3,
            maxLength: 18,
            name: names.name,
            placeholder: textsCap.namePlaceholder,
            required: true,
            type: 'text',
            value: '',
        },
    ])

    const handleSubmit = async (_, values) => {
        const { onSubmit } = props
        let receiverIds = values[names.receiverIds].map(x => x.split(',')).flat()
        const { id: ownId } = getUser() || {}
        const isSupport = receiverIds.includes(SUPPORT)
        if (isSupport) {
            let userIsSupport = false
            await client.amISupport((_, yes) => userIsSupport = !!yes)
            receiverIds = [
                SUPPORT,
                !userIsSupport ? null : receiverIds.filter(id => ![SUPPORT, ownId].includes(id))[0]
            ].filter(Boolean)
        }
        const name = receiverIds.length > 1 ? values[names.name] : null
        const inboxKey = createInbox(receiverIds, name, true)
        setSuccess(true)
        isFn(onSubmit) && onSubmit(true, { inboxKey, ...values })
    }

    props.values && useEffect(() => {
        // on mount prefill values
        fillValues(inputs, props.values)
        return () => { }
    }, [])

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
NewInboxForm.propTypes = {
    values: PropTypes.object
}

// edit group inbox name
export const editName = (inboxKey, onSubmit) => {
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

                const receiverIds = inboxKey.split(',')
                addToQueue({
                    args: [receiverIds, name],
                    func: 'messageGroupName',
                    silent: true,
                    type: QUEUE_TYPES.CHATCLIENT,
                })
                inboxSettings(inboxKey, { name }, true)
                isFn(onSubmit) && onSubmit(true)
            },
            size: 'mini',
        }
    )
}