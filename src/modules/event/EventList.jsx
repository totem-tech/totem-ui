import React, { useState, useEffect } from 'react'
import uuid from 'uuid'
import { getConnection } from '../../services/blockchain'

let eventsT = []
export default function EventList() {
    const [events, setEvents] = useState(eventsT)

    useEffect(() => {
        let mounted = true
        getConnection().then(({ api }) =>
            api.query.system.events(newEvents => {
                eventsT = [...newEvents, ...eventsT].slice(-100) // keep only latest 100 events
                mounted && setEvents(eventsT)
            })
        )

        return () => mounted = false
    }, [])
    return (
        <ol>
            {events.map(event => <EventDisplay {...{ key: uuid.v1(), event: event.event }} />)}
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