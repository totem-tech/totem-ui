import React, { useState, useEffect } from 'react'
import { Bond } from 'oo7'
import { Button, Icon } from 'semantic-ui-react'
import { textEllipsis } from '../../utils/utils'
import Inbox from './Inbox'
import NewInboxForm from './NewInboxForm'
import { inboxBonds, inboxSettings, newInboxBond } from './chat'
import { getUser, loginBond } from '../../services/chatClient'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
// import chat module styes
import './style.css'

const [texts, textsCap] = translated({
    hide: 'hide',
    // offline: 'offline',
    // online: 'online',
    loggedInAs: 'logged in as',
    openChat: 'open chat',
    totemTrollbox: 'Totem Trollbox',
}, true)

const EVERYONE = 'everyone'
export const visibleBond = new Bond().defaultTo(false)

export default function ChatWidget() {
    const [visible, setVisibleOrg] = useState(visibleBond._value)
    const [inboxKeys, setInboxKeys] = useState(Object.keys(inboxBonds))
    const [openInboxKey, setOpenInboxKey] = useState(inboxKeys[inboxKeys.length - 1])
    const [online, setOnline] = useState(loginBond._value)
    const { id } = getUser() || {}
    const setVisible = visible => {
        setVisibleOrg(visible)
        visibleBond._value = visible
    }
    const hideInbox = !visible || !openInboxKey || !inboxKeys.includes(openInboxKey)

    document.getElementById('app').children[0]
        .classList[!visible ? 'remove' : 'add']('chat-visible')
    document.getElementById('app').children[0]
        .classList[hideInbox ? 'remove' : 'add']('inbox-visible')

    useEffect(() => {
        const tieId = newInboxBond.tie(() => {
            const newKeys = Object.keys(inboxBonds)
            setInboxKeys(newKeys)
        })
        const tieIdLogin = loginBond.tie(online => setOnline(online))
        const tieIdVisible = visibleBond.tie(visible => setVisible(visible))
        return () => {
            newInboxBond.untie(tieId)
            loginBond.untie(tieIdLogin)
            visibleBond.untie(tieIdVisible)
        }
    }, [])
    // return ''

    return !id || !visible ? '' : (
        <div className='chat-container'>
            {visible && inboxKeys.includes(openInboxKey) && (
                <Inbox
                    receiverIds={openInboxKey.split(',')}
                    title={openInboxKey === EVERYONE ? texts.totemTrollbox : ''}
                    subtitle={id && `${textsCap.loggedInAs} @${id}`}
                />
            )}
            {/* <WidgetButtons {...{
                inboxKeys,
                online,
                openInboxKey,
                setOpenInboxKey,
                setVisible,
                visible,
            }} /> */}
        </div>
    )
}

const WidgetButtons = ({ inboxKeys, online, openInboxKey, setOpenInboxKey, setVisible, visible }) => {
    const settingsAr = inboxKeys.map(key => inboxSettings(key))
    const hasUnread = settingsAr.find(({ unread }) => unread)
    return (
        <div className='chat-buttons'>
            {visible && (
                inboxKeys.map((inboxKey, i) => {
                    const { name, unread } = settingsAr[i]
                    return (
                        <Button {...{
                            content: textEllipsis(
                                inboxKey === EVERYONE ? texts.totemTrollbox : (
                                    name || `@${inboxKey}`
                                ),
                                20,
                                3,
                                false,
                            ),
                            key: inboxKey,
                            icon: {
                                color: inboxKey === openInboxKey ? 'green' : (
                                    unread ? 'orange' : undefined
                                ),
                                name: inboxKey === EVERYONE ? 'globe' : (
                                    inboxKey.split(',').length === 1 ? 'user' : 'group'
                                ),
                            },
                            onClick: () => setOpenInboxKey(openInboxKey === inboxKey ? '' : inboxKey),
                            style: { display: 'inline' }
                        }} />
                    )
                }).reverse()
            )}

            {visible && (
                <Button {...{
                    circular: true,
                    icon: {
                        name: 'search plus',
                        // size: 'big',
                    },
                    onClick: () => showForm(NewInboxForm, {
                        closeOnSubmit: true,
                        onSubmit: (success, values) => success && setOpenInboxKey(values.inboxKey)
                    }),
                    title: textsCap.openChat,
                }} />
            )}
            <Button {...{
                circular: true,
                icon: { name: visible ? 'hide' : 'chat' },
                onClick: () => setVisible(!visible),
                title: textsCap.hide,
            }} />
        </div>
    )
}