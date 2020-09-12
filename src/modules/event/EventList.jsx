import React, { useState, useEffect } from 'react'
import uuid from 'uuid'
import { getConnection, query } from '../../services/blockchain'
import { Button } from 'semantic-ui-react'

let eventsT = []
export default function EventList() {
    const [events, setEvents] = useState(eventsT)

    useEffect(() => {
        let mounted = true
        query('api.query.system.events', newEvents => {
            eventsT = [...newEvents, ...eventsT].slice(-100) // keep only latest 100 events
            mounted && setEvents(eventsT)
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
                        eventsT = []
                        setEvents([])
                    }}
                />
            )}
            {events.map(event => <EventDisplay {...{ key: uuid.v1(), event: event.event }} />)}
            <div className='empty-message'>No events available</div>
        </ol>
    )
}

function EventDisplay({ event }) {
    const params = (event.typeDef || []).map(({ type }) => ({
        type//: getTypeDef(type)
    }))
    const values = (event.data || []).map((value) => ({
        isValid: true,
        value
    }))

    return (
        <li>
            <div>
                <div>{event.section}: {event.method}</div>
                <div>Meta: {JSON.stringify(event.meta, null, 4)}</div>
                <div>Type: {JSON.stringify(params, null, 4)}</div>
                <div>Data: {JSON.stringify(values, null, 4)}</div>
            </div>
        </li>
    )
}