import React, { useState, useEffect } from 'react'
import { Button, Icon } from 'semantic-ui-react'
import Chat from './Inbox'
import NewInboxForm from './NewInboxForm'
import { inboxBonds, inboxSettings, newInboxBond } from './chat'
import { getUser, loginBond } from '../../services/chatClient'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { textEllipsis } from '../../utils/utils'

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
                        bottom: 65,
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

            {open && (
                <div style={{
                    bottom: 10,
                    position: 'fixed',
                    right: 70,
                    zIndex: 1
                }}>
                    <div style={{
                        overflowX: 'auto',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        width: window.innerWidth - 90,

                        position: 'absolute',
                        right: 0,
                        top: -45,
                    }}>
                        {inboxKeys.map(key => (
                            <Button {...{
                                content: textEllipsis(
                                    key === EVERYONE ? texts.totemTrollbox : inboxSettings(key).name || `@${key}`,
                                    20,
                                    3,
                                    false,
                                ),
                                key,
                                icon: {
                                    name: key === EVERYONE ? 'globe' : key.split(',').length === 1 ? 'user' : 'group',
                                    color: key === openInboxKey ? 'green' : undefined
                                },
                                onClick: () => setOpenInboxKey(openInboxKey === key ? '' : key),
                                style: { display: 'inline' }
                            }} />
                        ))}
                        <Button {...{
                            icon: 'search plus',
                            onClick: () => showForm(NewInboxForm, {
                                closeOnSubmit: true,
                                onSubmit: (success, values) => success && setOpenInboxKey(values.inboxKey)
                            }),
                        }} />
                    </div>
                </div>
            )}
            <div style={{
                bottom: 15,
                position: 'fixed',
                right: 15,
                zIndex: 2
            }}>
                <Button {...{
                    circular: true,
                    icon: {
                        color: online ? undefined : 'red',
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