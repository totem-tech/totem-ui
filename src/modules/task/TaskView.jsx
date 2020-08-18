import React from 'react'
import { Menu, Tab } from 'semantic-ui-react'
import TaskList from './TaskList'
import { useSelected } from '../../services/identity'
import { translated } from '../../services/language'
import useTasks from './useTasks'

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
        menuItem: <Menu.Item  {...{ title, content: name, key: type }} />,
        render: () => {
            const tasks = type === 'marketplace' ? new Map() : allTasks.get(type)
            return (
                <Tab.Pane {...{ loading: !tasks }}>
                    {tasks && (
                        <TaskList {...{
                            address,
                            asTabPane: true,
                            data: tasks,
                            key: type + address + tasks.size,
                            type,
                        }} />
                    )}
                </Tab.Pane>
            )
        }
    }))

    return <Tab panes={panes} />
}
