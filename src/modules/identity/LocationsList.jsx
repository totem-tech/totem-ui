import React, { useState } from 'react'
import { Button } from 'semantic-ui-react'
import DataTable from '../../components/DataTable'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { useRxSubject } from '../../services/react'
import { getAll, rxLocations } from './location'
import LocationForm from './LocationForm'

const textsCap = translated({
    actions: 'actions',
	addressLine1: 'address line 1',
	addressLine2: 'address line 2',
    city: 'city',
    close: 'close',
    country: 'country',
    create: 'create',
    delete: 'delete',
    locations: 'locations',
    name: 'name',
	postcode: 'postcode or zip',
	state: 'state or province',
}, true)[1]

export default function LocationsList(props = {}) {
    const [initialValue] = useState(getAll)
    const [locations] = useRxSubject(
        rxLocations,
        map => Array.from(map).map(([id, location]) => ({ ...location, id })),
        initialValue,
    )
    const [listProps, setListProps] = useState({
        stackable: true,
        columns: [
            { key: 'name', title: textsCap.name },
            { key: 'addressLine1', title: textsCap.addressLine1},
            // { key: 'addressLine2', title: textsCap.addressLine2},
            { key: 'city', title: textsCap.city},
            { key: 'postcode', textAlign: 'center', title: textsCap.postcode},
            { key: 'state', textAlign: 'center', title: textsCap.state},
            // { key: 'countryCode', title: textsCap.country },
            {
                collapsing: true,
                draggable: false,
                textAlign: 'center',
                title: textsCap.actions,
                content: ({ id }) => [
                    {
                        icon: 'pencil',
                        key: 'update',
                        onClick: () => showForm(LocationForm, { id }),
                    }
                ].filter(Boolean).map(props => <Button { ...props } />)
            },
        ],
        topLeftMenu: [{
            content: textsCap.create,
            icon: 'plus',
            onClick: () => showForm(LocationForm)
        }]
    })

    return <DataTable {...{ ...props, ...listProps, data: locations }} />
}

export const showModal =() => confirm({
    cancelButton: textsCap.close,
    confirmButton: null,
    content: <LocationsList />,
    header: textsCap.locations,
})