import React, { useState, useEffect } from 'react'
import { Tab } from 'semantic-ui-react'
import { textEllipsis, isFn, deferred, arrUnique } from '../../utils/utils'
import TaskList from './TaskList'
import Currency from '../../components/Currency'
import { query, getConnection } from '../../services/blockchain'
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
const getKey = (address, type) => `${address}-${type}`
const messagingServicePlaceholder = () => new Promise(resolve => resolve(new Map()))

export default function TaskView(props) {
    const selectedAddress = props.address || useSelected()
    const [allTasks, setAllTasks] = useState(new Map())

    useEffect(() => {
        let mounted = true
        const unsubscribers = {}
        const types = ['owner', 'approver', 'beneficiary']
        const tasksCb = (address, taskIds2d, uniqueTaskIds) => async (taskOrders) => {
            let uniqueTasks = new Map()
            // older orders can sometimes be invalid and have null value
            taskOrders.filter(Boolean).forEach((order = [], i) => {
                const [owner, approver, fullfiller, isSell, amountXTX, isClosed, orderType, deadline, dueDate] = order
                const taskId = uniqueTaskIds[i]
                uniqueTasks.set(taskId, {
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
            const promise = PromisE.timeout(messagingServicePlaceholder(), 5000)
            const addDetails = (detailsMap = new Map()) => {
                // add title description etc retrieved from Messaging Service
                Array.from(uniqueTasks).forEach(([id, task]) => {
                    const { title, description, tags } = detailsMap.get(id) || {}
                    task.title = title || textsCap.unknown
                    task.description = description
                    task.tags = tags
                })
                // construct separate lists for each type
                const allTasks = new Map()
                types.forEach((type, i) => {
                    const ids = taskIds2d[i]
                    const typeTasks = ids.map(id => {
                        const task = uniqueTasks.get(id)
                        return task && [id, uniqueTasks.get(id)]
                    }).filter(Boolean)
                    allTasks.set(
                        getKey(address, type),
                        new Map(typeTasks),
                    )
                })
                setAllTasks(allTasks)

                console.log({ allTasks, taskIds2d })

            }
            // on receive update tasks lists
            promise.promise.then(addDetails)
            // if times out update component without title, desc etc
            promise.catch(() => addDetails([]))
        }

        getConnection().then(async ({ api }) => {
            // construct a single query to retrieve 3 different types of lists with a single subscription
            unsubscribers.taskIds2d = await query('api.queryMulti', [
                types.map(x => [api.query.orders[x], selectedAddress]),
                async (taskIds2d) => {
                    // create single list of unique Task IDs
                    const uniqueTaskIds = arrUnique(taskIds2d.flat())
                    // retrieve details of all unique tasks at with a signle subscription
                    unsubscribers.tasks = await query(
                        'api.query.orders.order',
                        [uniqueTaskIds, tasksCb(selectedAddress, taskIds2d, uniqueTaskIds)],
                        true,
                    )
                }
            ])
        })


        // unsubscribe on unmount
        return () => {
            mounted = false
            Object.values(unsubscribers).forEach(fn => isFn(fn) && fn())
        }
    }, [selectedAddress])

    return (
        <Tab
            className='module-task-view'
            panes={panes.map(({ title, type }) => ({
                menuItem: title,
                render: () => {
                    const key = getKey(selectedAddress, type)
                    const tasks = allTasks.get(key)
                    return (
                        <TaskList {...{
                            asTabPane: true,
                            key: type,
                            loading: !tasks,
                            selectedAddress,
                            data: tasks || new Map(),
                            title,
                            type,
                        }} />
                    )
                }
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