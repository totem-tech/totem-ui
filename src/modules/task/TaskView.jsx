import React from 'react'
import { Tab } from 'semantic-ui-react'
import TaskList from './TaskList'
import { translated } from '../../services/language'

const textsCap = translated({
    assigned: 'my tasks',
    manage: 'manage tasks I own',
    pending: 'pending tasks',
}, true)[1]

export default function () {
    const panes = [
        {
            title: textsCap.assigned,
            type: 'assigned',
        },
        {
            title: textsCap.pending,
            type: 'approver',
        },
        {
            title: textsCap.manage,
            type: 'owner',
        },
    ]

    return <Tab panes={panes.map(({ title, type }) => ({
        menuItem: title,
        render: () => <TaskList {...{
            asTabPane: true,
            key: type,
            title,
            type,
        }} />
    }))} className='module-task-view' />
}