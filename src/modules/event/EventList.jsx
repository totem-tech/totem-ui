import React, { useState, useEffect } from 'react'
import uuid from 'uuid'
import { getConnection, query } from '../../services/blockchain'
import { Button } from 'semantic-ui-react'
import { copyToClipboard } from '../../utils/utils'

let eventsCached = []
export default function EventList() {
    const [events, setEvents] = useState(eventsCached)

    useEffect(() => {
        let mounted = true
        query('api.query.system.events', newEvents => {
            eventsCached = [...newEvents, ...eventsCached]
                .slice(-100) // keep only latest 100 events
            mounted && setEvents(eventsCached)
            window.blockchainEvents = eventsCached
        })

        return () => mounted = false
    }, [])
    return (
        <ol>
            {events.length > 0 && (
                <Button
                    content='Clear'
                    icon='trash'
                    onClick={() => {
                        eventsCached = []
                        setEvents([])
                    }}
                />
            )}
            {events.length > 0 && (
                <Button
                    content='Copy'
                    icon='copy'
                    onClick={() => {
                        copyToClipboard(JSON.stringify(eventsCached, null, 4))
                    }}
                />
            )}
            {events.map(event => <EventDisplay {...{ key: uuid.v1(), event: event.event }} />)}
            <div className='empty-message'>No events available</div>
        </ol>
    )
}

function EventDisplay({ event }) {
    const type = (event.typeDef || [])
        .map(({ type }) => ({
            type//: getTypeDef(type)
        }))
    const data = (event.data || [])
        .map((value) => ({
            isValid: true,
            value
        }))

    return (
        <li>
            <div>
                <div>{event.section}: {event.method}</div>
                <div>Meta: {JSON.stringify(event.meta, null, 4)}</div>
                <div>Type: {JSON.stringify(type, null, 4)}</div>
                <div>Data: {JSON.stringify(data, null, 4)}</div>
            </div>
        </li>
    )
}