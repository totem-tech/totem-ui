import React, { useState, useEffect } from 'react'
import { Tab } from 'semantic-ui-react'
import { textEllipsis, isFn, deferred } from '../../utils/utils'
import TaskList from './TaskList'
import Currency from '../../components/Currency'
import { query } from '../../services/blockchain'
import { useSelected } from '../../services/identity'
import { translated } from '../../services/language'
import { getAddressName } from '../../services/partner'
import PromisE from '../../utils/PromisE'

const textsCap = translated({
    beneficiary: 'my tasks',
    manage: 'manage tasks',
    pending: 'pending tasks',
    unknown: 'unknown',
}, true)[1]
let isOpen = false
const getKey = (address, type) => `${address}-${type}`
const messagingServicePlaceholder = (taskIds) => new Promise(resolve => resolve(
    new Array(taskIds.length).fill(null))
)

export default function TaskView(props) {
    const selectedAddress = props.address || useSelected()
    const [listType, setListType] = useState(props.type || panes[0].type)
    const [allTasks, setAllTasks] = useState(new Map())
    const key = getKey(selectedAddress, listType)
    const tasks = allTasks.get(key)
    isOpen = true

    useEffect(() => {
        let mounted = true
        const unsubscribers = {}
        const allTasks = new Map()
        const setTasksDeffered = deferred(tasks => mounted && setAllTasks(tasks), 500)
        const types = ['owner', 'approver', 'beneficiary']
        const tasksCb = (key, taskIds) => async (taskOrders) => {
            const tasks = new Map()
            // older orders can sometimes be invalid and have null value
            taskOrders.filter(Boolean).forEach((order = [], i) => {
                const [owner, approver, fullfiller, isSell, amountXTX, isClosed, orderType, deadline, dueDate] = order
                const taskId = taskIds[i]
                tasks.set(taskId, {
                    owner,
                    approver,
                    fullfiller,
                    isSell,
                    amountXTX: eval(amountXTX), // convert Hex string to int if needed
                    isClosed,
                    orderType,
                    deadline,
                    dueDate,
                    // pre-process values for use with DataTable
                    _amountXTX: <Currency value={eval(amountXTX)} />,
                    _owner: getAddressName(owner) || textEllipsis(owner, 15),
                    _fulfiller: getAddressName(fullfiller) || textEllipsis(fullfiller, 15),
                })
            })

            const promise = PromisE.timeout(messagingServicePlaceholder(taskIds), 5000)
            const process = (arrTaskDetails = []) => {
                Array.from(tasks).forEach(([id, task], i) => {
                    const { title, description, tags } = arrTaskDetails[i] || {}
                    task.title = title || textsCap.unknown
                    task.description = description
                    task.tags = tags
                })
                allTasks.set(key, tasks)
                setTasksDeffered(allTasks)
            }
            // on receive update tasks lists
            promise.promise.then(process)
            // if times out update component without title, desc etc
            promise.catch(() => process([]))
        }

        types.forEach(type => {
            const key = getKey(selectedAddress, type)
            unsubscribers[`taskIds-${key}`] = (async () => await query(
                `api.query.orders.${type}`,
                [
                    selectedAddress,
                    async (taskIds) => {
                        // no tasks available
                        if (!taskIds.length) return tasksCb(key, taskIds)([])

                        isFn(unsubscribers[`tasks-${key}`]) && unsubscribers[`tasks-${key}`]()
                        unsubscribers[`tasks-${key}`] = await query(
                            'api.query.orders.order',
                            [taskIds, tasksCb(key, taskIds)],
                            true,
                        )
                    },
                ]
            ))()
        })

        // unsubscribe on unmount
        return () => {
            isOpen = false
            mounted = false
            Object.values(unsubscribers).forEach(fn => isFn(fn) && fn())
        }
    }, [selectedAddress])

    return (
        <Tab
            className='module-task-view'
            onTabChange={(_, { activeIndex }) => setListType(panes[activeIndex].type)}
            panes={panes.map(({ title, type }) => ({
                menuItem: title,
                render: () => (
                    <TaskList {...{
                        asTabPane: true,
                        key: type,
                        loading: !tasks,
                        selectedAddress,
                        data: type === listType && tasks || new Map(),
                        title,
                        type,
                    }} />
                )
            }))}
        />
    )
}

const panes = [
    {
        title: textsCap.manage,
        type: 'owner',
    },
    {
        title: textsCap.beneficiary,
        type: 'beneficiary',
    },
    {
        title: textsCap.pending,
        type: 'approver',
    },
]