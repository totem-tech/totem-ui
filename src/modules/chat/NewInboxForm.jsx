import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import { isFn, arrSort, textEllipsis } from '../../utils/utils'
// services
import { getUser } from './ChatClient'
import { translated } from '../../services/language'
import { showForm, closeModal } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import {
    createInbox,
    getInboxKey,
    inboxSettings,
    inboxesSettings,
    SUPPORT,
} from './chat'
import { getInboxName } from './InboxList'

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

export default function NewInboxForm(props) {
    const names = {
        name: 'name',
        receiverIds: 'receiverIds'
    }
    const inboxKeys = Object.keys(inboxesSettings())
    const [success, setSuccess] = useState(false)
    const [inputs, setInputs] = useState([
        {
            autoFocus: true,
            excludeOwnId: true,
            includeFromChat: true,
            includePartners: true,
            message: { content: textsCap.userIdsHint },
            multiple: true,
            name: names.receiverIds,
            rxValue: new BehaviorSubject(),
            options: arrSort(
                inboxKeys.map(key => {
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
                nameIn.rxValue.next(value)
            },
            required: true,
            type: 'UserIdInput',
        },
        {
            hidden: true,
            label: textsCap.nameLabel,
            minLength: 3,
            maxLength: 18,
            name: names.name,
            placeholder: textsCap.namePlaceholder,
            required: true,
            rxValue: new BehaviorSubject(),
            type: 'text',
            value: '',
        },
    ])

    const handleSubmit = async (_, values) => {
        const { onSubmit } = props
        let receiverIds = values[names.receiverIds].map(x => x.split(',')).flat()
        const { id: ownId, roles = [] } = getUser() || {}
        if (receiverIds.includes(SUPPORT)) {
            receiverIds = [
                SUPPORT,
                !roles.includes(SUPPORT) ? null : receiverIds.filter(id => ![SUPPORT, ownId].includes(id))[0]
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
                inboxSettings(inboxKey, { name })
                isFn(onSubmit) && onSubmit(true)
            },
            size: 'mini',
        }
    )
}