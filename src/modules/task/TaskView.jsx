import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Menu, Tab } from 'semantic-ui-react'
import { BehaviorSubject } from 'rxjs'
import Text from '../../components/Text'
import { translated } from '../../services/language'
import { useRxSubject } from '../../services/react'
import { useInverted } from '../../services/window'
import { rxSelected } from '../identity/identity'
import { rwSettings } from './task'
import TaskList, { listTypes } from './TaskList'
import useTasks from './useTasks'

const textsCap = translated({
    approver: 'to approve',
    approverDesc: 'tasks you have been assigned as approver',
    beneficiary: 'tasks ToDo',
    beneficiaryDesc: 'tasks assigned to you',
    ownerTasks: 'my tasks',
    ownerTasksDesc: 'tasks created by you',
    marketplace: 'marketplace',
    marketplaceDesc: 'marketplace',
    unknown: 'unknown',
}, true)[1]

export default function TaskView({ address, tab: _activeType }) {
    const inverted = useInverted()
    address = address || useRxSubject(rxSelected)[0]
    const excludeTypes = [
        // listTypes.marketplace,
        listTypes.approver,
    ]
    const [rxTasks] = useState(() => new BehaviorSubject(new Map()))
    const [allTasks = new Map(), message] = useTasks(
        Object
            .values(listTypes)
            .filter(x => ![
                ...excludeTypes,
                listTypes.marketplace
            ].includes(x)),
        address,
    )
    const [activeType, setActiveType] = useState(
        _activeType
        || rwSettings().activeType
        || listTypes.owner
    )
    const data = activeType !== listTypes.marketplace
        && allTasks
        && allTasks.get(activeType)
        || new Map()

    // update rxTasks so that task details view gets re-rendered if open
    useEffect(() => {
        rxTasks.next(new Map(data))
    }, [data])

    const panes = [
        {
            name: textsCap.ownerTasks,
            title: textsCap.ownerTasksDesc,
            type: listTypes.owner,
        },
        {
            name: textsCap.beneficiary,
            title: textsCap.beneficiaryDesc,
            type: listTypes.beneficiary,
        },
        {
            name: textsCap.approver,
            title: textsCap.approverDesc,
            type: listTypes.approver,
        },
        {
            name: textsCap.marketplace,
            title: textsCap.marketplaceDesc,
            type: listTypes.marketplace,
        },
    ]
        .filter(x => !excludeTypes.includes(x.type))
        .map(({ name, title, type }) => ({
            active: true,
            inverted,
            menuItem: (
                <Menu.Item  {...{
                    content: <Text>{name}</Text>,
                    key: type,
                    // remember open tab index
                    onClick: () => rwSettings({ activeType: type }) | setActiveType(type),
                    title,
                }} />
            ),
            type,
        }))

    const activeIndex = panes.findIndex(x =>
        x.type === activeType
    )

    return (
            <div>
                <Tab {...{
                    activeIndex,
                    menu: {
                        inverted,
                        secondary: true,
                        pointing: true,
                    },
                    panes,
                    key: activeIndex + activeType, // forces active pane to re-render on each change
                }} />
                <TaskList {...{
                    address,
                    asTabPane: true,
                    // data,
                    emptyMessage: message
                        ? message
                        : undefined,
                    key: activeType,
                    rxTasks,
                    style: { marginTop: 15 },
                    type: activeType,
                }} />
            </div>
        )
}
TaskView.propTypes = {
    address: PropTypes.string,
    tab: PropTypes.string,
}
