import React, { useState } from 'react'
import uuid from 'uuid'
import { Menu, Tab } from 'semantic-ui-react'
import Message from '../../components/Message'
import Text from '../../components/Text'
import TaskList from './TaskList'
import { useSelected } from '../../services/identity'
import { translated } from '../../services/language'
import useTasks from './useTasks'
import { rwSettings } from './task'
import { useInverted } from '../../services/window'

const textsCap = translated({
    approver: 'approver',
    approverDesc: 'tasks you can approve',
    beneficiary: 'my tasks',
    beneficiaryDesc: 'tasks assigned to you',
    manage: 'manage tasks',
    manageDesc: 'tasks created by you',
    marketplace: 'marketplace',
    marketplaceDesc: 'marketplace',
    unknown: 'unknown',
}, true)[1]

export default function TaskView(props) {
    const address = props.address || useSelected()
    const [allTasks, message] = useTasks(['owner', 'approver', 'beneficiary'], address)
    const [activeType, setActiveType] = useState(rwSettings().activeType || 'owner')
    const panes = [
        {
            name: textsCap.manage,
            title: textsCap.manageDesc,
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
        {
            name: textsCap.marketplace,
            title: textsCap.marketplaceDesc,
            type: 'marketplace',
        },
    ].map(({ name, title, type }) => ({
        active: true,
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
    return message ? <Message {...message} /> : (
        <div>
            <Tab {...{
                activeIndex,
                menu: { secondary: true, pointing: true },
                panes,
                key: activeIndex + activeType, // forces active pane to re-render on each change
            }} />
            <TaskList {...{
                address,
                asTabPane: true,
                data: activeType === 'marketplace' ? new Map() : allTasks.get(activeType),
                key: activeType,
                style: { marginTop: 15 },
                type: activeType,
            }} />
        </div>
    )
}
