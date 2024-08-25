import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { Button } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import { showForm, showInfo } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactjs'
// import { getAll, rxLocations } from './custom' // add this if a custom js file has been created
import CustomForm, { inputNames } from './customForm' // related to a form also in the same module

const textsCap = {
    actions: 'actions',
    add: 'add',
    delete: 'delete',
    emptyMessage: 'no list items. Please add one',
    myListItems: 'list of items',
    field1: 'field1',
    field2: 'field2',
    field3: 'field3',
    field4: 'field4',
}
translated(textsCap, true)

export default function CustomList({
    includePartners,
    ...props
}) {
    const [data = []] = useRxSubject(
        rxLocations,
        (map = getAll()) => Array
            .from(map)
            .map(([id, listItems]) => {
                const ownListItems = !listItems[inputNames.partnerIdentity]
                return !includePartners && !ownListItems
                    ? null
                    : { ...listItems, id, }
            })
            .filter(Boolean)
    )
    const [tableProps] = useState({
        ...props,
        stackable: true,
        columns: [
            { key: 'field1', title: textsCap.field1 },
            { key: 'field2', title: textsCap.field2 },
            { key: 'field3', title: textsCap.field3 },
            { key: 'field4', title: textsCap.field4, textAlign: 'center' },
            {
                collapsing: true,
                draggable: false,
                textAlign: 'center',
                title: textsCap.actions,
                content: ({ id }) => (
                    <Button {...{
                        icon: 'pencil',
                        onClick: () => showForm(
                            CustomForm,
                            { autoSave: true, id }
                        ),
                    }} />
                ),
            },
        ],
        topLeftMenu: [{
            content: textsCap.add,
            icon: 'plus',
            onClick: () => showForm(CustomForm),
        }],
    })

    return <DataTable {...{ ...tableProps, data }} />
}

CustomList.propTypes = {
    // whether to include partner items in the list
    includePartners: PropTypes.bool,
}

CustomList.defaultProps = {
    emptyMessage: textsCap.emptyMessage,
    includePartners: false,
}

CustomList.asModal = (
    props = {},
    modalId,
    modalProps = {}
) => showInfo({
    ...modalProps,
    content: <CustomList {...props} />,
    header: textsCap.myListItems,
},modalId)