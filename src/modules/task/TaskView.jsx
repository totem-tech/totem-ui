import React, { useState } from 'react'
import { Menu, Tab } from 'semantic-ui-react'
import Message from '../../components/Message'
import Text from '../../components/Text'
import TaskList from './TaskList'
import { rxSelected } from '../identity/identity'
import { translated } from '../../services/language'
import useTasks from './useTasks'
import { rwSettings } from './task'
import { useInverted } from '../../services/window'
import { useRxSubject } from '../../services/react'

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

export default function TaskView({ address }) {
    const inverted = useInverted()
    address = address || useRxSubject(rxSelected)[0]
    const [allTasks = new Map(), message] = useTasks(['owner', 'approver', 'beneficiary'], address)
    const [activeType, setActiveType] = useState(rwSettings().activeType || 'owner')
    const panes = [
        {
            name: textsCap.ownerTasks,
            title: textsCap.ownerTasksDesc,
            type: 'owner',
        },
        {
            name: textsCap.beneficiary,
            title: textsCap.beneficiaryDesc,
            type: 'beneficiary',
        },
        {
            name: textsCap.approver,
            title: textsCap.approverDesc,
            type: 'approver',
        },
        // {
        //     name: textsCap.marketplace,
        //     title: textsCap.marketplaceDesc,
        //     type: 'marketplace',
        // },
    ].map(({ name, title, type }) => ({
        active: true,
        inverted,
        menuItem: <Menu.Item  {...{
            content: <Text>{name}</Text>,
            key: type,
            // remember open tab index
            onClick: () => rwSettings({ activeType: type }) | setActiveType(type),
            title,
        }} />,
        type,
    }))

    const activeIndex = panes.findIndex(x => x.type === activeType)
    return message
        ? <Message {...message} />
        : (
            <div>
                <Tab {...{
                    activeIndex,
                    menu: { inverted, secondary: true, pointing: true },
                    panes,
                    key: activeIndex + activeType, // forces active pane to re-render on each change
                }} />
                <TaskList {...{
                    address,
                    asTabPane: true,
                    data: activeType !== 'marketplace' && allTasks && allTasks.get(activeType) || new Map(),
                    key: activeType,
                    style: { marginTop: 15 },
                    type: activeType,
                }} />
            </div>
        )
}
