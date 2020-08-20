import React from 'react'
import uuid from 'uuid'
import { Menu, Tab } from 'semantic-ui-react'
import TaskList from './TaskList'
import { useSelected } from '../../services/identity'
import { translated } from '../../services/language'
import useTasks from './useTasks'
import Message from '../../components/Message'
import { rwSettings } from './task'

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
    const activeIndex = rwSettings().activeIndex || 0
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
    ].map(({ name, title, type }, i) => ({
        active: true,
        menuItem: <Menu.Item  {...{
            content: name,
            key: type,
            // remember open tab index
            onClick: () => rwSettings({ activeIndex: i }),
            title,
        }} />,
        render: () => (
            <Tab.Pane>
                <TaskList {...{
                    address,
                    asTabPane: true,
                    key: type,
                    data: type === 'marketplace' ? new Map() : allTasks.get(type),
                    type,
                }} />
            </Tab.Pane>
        )
    }))

    return message ? <Message {...message} /> : (
        <Tab
            defaultActiveIndex={activeIndex}
            panes={panes}
            key={uuid.v1()} // forces active pane to re-render on each change
        />
    )
}
