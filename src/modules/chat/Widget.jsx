import React, { useState, useEffect } from 'react'
import { Button, Icon } from 'semantic-ui-react'
import { textEllipsis } from '../../utils/utils'
import Chat from './Inbox'
import NewInboxForm from './NewInboxForm'
import { inboxBonds, inboxSettings, newInboxBond } from './chat'
import { getUser, loginBond } from '../../services/chatClient'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'

const [texts, textsCap] = translated({
    offline: 'offline',
    loggedInAs: 'Logged in as',
    online: 'online',
    totemTrollbox: 'Totem Trollbox',
}, true)

const EVERYONE = 'everyone'
export default function ChatWidget(props) {
    const [open, setOpen] = useState(props.open)
    const [inboxKeys, setInboxKeys] = useState(Object.keys(inboxBonds))
    const [openInboxKey, setOpenInboxKey] = useState(inboxKeys[inboxKeys.length - 1])
    const { id } = getUser() || {}
    const [online, setOnline] = useState(loginBond._value)

    useEffect(() => {
        const tieId = newInboxBond.tie(() => {
            const newKeys = Object.keys(inboxBonds)
            setInboxKeys(newKeys)
        })
        const tieIdLogin = loginBond.tie(online => setOnline(online))
        return () => {
            newInboxBond.untie(tieId)
            loginBond.untie(tieIdLogin)
        }
    }, [])
    if (!id) return ''
    return (
        <div className='chat-container'>
            {open && inboxKeys.includes(openInboxKey) && (
                <Chat
                    key={openInboxKey}
                    receiverIds={openInboxKey.split(',')}
                    style={{
                        background: 'white',
                        boxShadow: '0 2px 10px 1px #b5b5b5',
                        borderRadius: 5,
                        bottom: 60,
                        maxWidth: 'calc( 100% - 30px )',
                        margin: '0 15px',
                        overflow: 'hidden',
                        position: 'fixed',
                        right: 0,
                        width: 400,
                        zIndex: 1,
                    }}
                    title={openInboxKey === EVERYONE ? texts.totemTrollbox : ''}
                    subtitle={id && openInboxKey === EVERYONE && `${textsCap.loggedInAs} @${id}`}
                />
            )}
            <WidgetButtons {...{ inboxKeys, online, open, openInboxKey, setOpen, setOpenInboxKey }} />
        </div>
    )
}

const WidgetButtons = ({ inboxKeys, online, open, openInboxKey, setOpen, setOpenInboxKey }) => {
    const settingsAr = inboxKeys.map(key => inboxSettings(key))
    const hasUnread = settingsAr.find(({ unread }) => unread)
    return (
        <div>
            {open && (
                <div style={{
                    bottom: 5,
                    position: 'fixed',
                    right: 125,
                    zIndex: 1
                }}>
                    <div style={{
                        overflowX: 'auto',
                        paddingBottom: 2,
                        position: 'absolute',
                        right: 0,
                        textAlign: 'right',
                        top: -45,
                        whiteSpace: 'nowrap',
                        width: window.innerWidth - 135,
                    }}>
                        {inboxKeys.map((inboxKey, i) => {
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
                        }).reverse()}
                    </div>
                </div>
            )}

            <div style={{
                bottom: 5,
                position: 'fixed',
                right: 5,
                zIndex: 2
            }}>
                {open && (
                    <Button {...{
                        circular: true,
                        icon: {
                            name: 'search plus',
                            size: 'big',
                        },
                        onClick: () => showForm(NewInboxForm, {
                            closeOnSubmit: true,
                            onSubmit: (success, values) => success && setOpenInboxKey(values.inboxKey)
                        }),
                    }} />
                )}
                <Button {...{
                    circular: true,
                    icon: {
                        color: !online ? 'red' : (
                            hasUnread ? 'orange' : undefined
                        ),
                        name: open ? 'close' : 'chat',
                        size: 'big',
                    },
                    onClick: () => {
                        setOpen(!open)
                        !open && !inboxKeys.includes(openInboxKey) && setOpenInboxKey(inboxKeys[inboxKeys.length - 1])

                    },
                    title: online ? textsCap.online : textsCap.offline,
                }} />
            </div>
        </div>
    )
}