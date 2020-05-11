import React, { useState, useEffect } from 'react'
import { Button } from 'semantic-ui-react'
import Chat from './Inbox'
import NewInboxForm from './NewInboxForm'
import { inboxBonds, newInboxBond, inboxSettings } from './chat'
import { getUser } from '../../services/chatClient'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { textEllipsis } from '../../utils/utils'

const [_, textsCap] = translated({
    totemTrollbox: 'totem trollbox'
}, true)

const EVERYONE = 'everyone'
export default function ChatWidget(props) {
    const [open, setOpen] = useState(props.open)
    const [inboxKeys, setInboxKeys] = useState(Object.keys(inboxBonds))
    const [openInboxKey, setOpenInboxKey] = useState()
    const { id } = getUser() || {}

    useEffect(() => {
        const tieId = newInboxBond.tie(() => setInboxKeys(Object.keys(inboxBonds)))
        return () => newInboxBond.untie(tieId)
    }, [])

    return (
        <div className='chat-container'>
            {open && openInboxKey && (
                <Chat
                    key={openInboxKey}
                    receiverIds={openInboxKey.split(',')}
                    style={{
                        background: 'white',
                        boxShadow: '0 2px 10px 1px #b5b5b5',
                        borderRadius: 10,
                        bottom: 65,
                        maxWidth: 'calc( 100% - 30px )',
                        margin: '0 15px',
                        overflow: 'hidden',
                        position: 'fixed',
                        right: 0,
                        width: 400,
                        zIndex: 1,
                    }}
                    title={openInboxKey === EVERYONE ? 'Totem Trollbox' : ''}
                    subtitle={id && openInboxKey === EVERYONE && `Logged in as @${id}`}
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
                        {[...inboxKeys.filter(x => x !== EVERYONE), EVERYONE,].map(key => (
                            <Button {...{
                                content: textEllipsis(
                                    key === EVERYONE ? textsCap.totemTrollbox : inboxSettings(key).name || `@${key}`,
                                    20,
                                    3,
                                    false,
                                ),
                                key,
                                icon: {
                                    name: key === EVERYONE ? 'globe' : key.split(',').length === 1 ? 'chat' : 'group',
                                    color: key === openInboxKey ? 'green' : undefined
                                },
                                onClick: () => setOpenInboxKey(openInboxKey === key ? '' : key),
                                style: { display: 'inline' }
                            }} />
                        ))}
                        <Button {...{
                            icon: 'plus',
                            onClick: () => showForm(NewInboxForm, { closeOnSubmit: true }),
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
                        name: open ? 'close' : 'chat',
                        size: 'big',
                    },
                    onClick: () => {
                        !open && !openInboxKey && setOpenInboxKey(EVERYONE)
                        setOpen(!open)
                    },
                }} />
            </div>
        </div>
    )
}