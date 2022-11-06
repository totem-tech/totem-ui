import React, { useEffect } from 'react'
import { Button, Icon } from 'semantic-ui-react'
import { format } from '../../utils/time'
import {
    clearClutter,
    isFn,
    textEllipsis,
} from '../../utils/utils'
import DataTable from '../../components/DataTable'
import { translated } from '../../services/language'
import {
    confirm,
    confirmAsPromise,
    showForm,
} from '../../services/modal'
import {
    checkComplete,
    getById as getQueueItemById,
    remove as removeQueueItem,
    statuses,
} from '../../services/queue'
import { getAddressName } from '../partner/partner'
import {
    clearAll,
    getAll,
    remove as removeHistoryItem,
    rxHistory,
} from './history'
import HistoryItemDetailsForm from './HistoryItemDetailsForm'
import { MOBILE, rxLayout } from '../../services/window'
import { useRxSubject } from '../../utils/reactHelper'

const textsCap = translated({
    action: 'action',
    balanceAfterTx: 'account balance after transaction',
    balanceBeforeTx: 'account balance before transaction',
    clearAll: 'clear All',
    close: 'close',
    dataReceived: 'data received',
    dataSent: 'data sent',
    delete: 'delete',
    description: 'description',
    errorMessage: 'error message',
    executionTime: 'execution time',
    function: 'function',
    groupId: 'group ID',
    identity: 'identity',
    message: 'message',
    pendingExecution: 'pending execution',
    remove: 'remove',
    removeWarning: `
        WARNING: selected item has not completed execution.
        If the execution has already started, removing it from here WILL NOT be able to stop it.
        It may show up again if the task execution is completed before is page reloaded.
        However, if the execution has not started yet or is stuck, 
        revoming will prevent it from being executed again on page reload.
    `,
    removeWarning2: 'you will not be able to recover this history item once removed.',
    removeConfirmHeader: 'remove unfinished queue item?',
    removeConfirmHeader2: 'are you sure?',
    status: 'status',
    taskId: 'task ID',
    techDetails: 'technical details',
    timestamp: 'timestamp',
    title: 'title',
    txId: 'transaction ID',
    type: 'type',
}, true)[1]

export default function HistoryList(props) {
    const [state] = useRxSubject(rxLayout, layout => {
        const isMobile = layout === MOBILE
        // makes columns resizable
        const headerProps = { style: { resize: 'both', overflow: 'auto' } }
        const state = {
            isMobile,
            columns: [
                {
                    collapsing: true,
                    content: ({ icon, status }) => {
                        const iconPrpos = {
                            className: 'no-margin',
                            name: icon || history,
                            loading: false
                        }
                        switch (status) {
                            case statuses.LOADING:
                                iconPrpos.name = 'spinner'
                                iconPrpos.loading = true
                                break
                            case statuses.SUSPENDED:
                                iconPrpos.name = 'pause'
                                break
                        }
                        return <Icon {...iconPrpos} />
                    },
                    title: '',
                },
                {
                    collapsing: true,
                    hidden: isMobile,
                    key: '_timestamp',
                    title: textsCap.executionTime,
                },
                {
                    headerProps,
                    key: 'title',
                    title: textsCap.title,
                },
                {
                    headerProps,
                    hidden: isMobile,
                    key: '_description',
                    style: {
                        minWidth: 200,
                        whiteSpace: 'pre-wrap',
                    },
                    title: textsCap.description,
                },
                {
                    collapsing: true,
                    hidden: isMobile,
                    key: '_identity',
                    title: textsCap.identity,
                },
                {
                    collapsing: true,
                    content: (item, id) => [
                        {
                            icon: 'eye',
                            negative: item.status === 'error',
                            onClick: () => showForm(HistoryItemDetailsForm, { values: item }),
                            title: textsCap.techDetails
                        },
                        {
                            icon: 'trash',
                            // negative: true,
                            onClick: () => {
                                const { groupId } = item
                                const rootTask = getQueueItemById(groupId)
                                const isComplete = checkComplete(rootTask)
                                confirm({
                                    content: !isComplete
                                        ? textsCap.removeWarning
                                        : textsCap.removeWarning2,
                                    header: !isComplete
                                        ? textsCap.removeConfirmHeader
                                        : textsCap.removeConfirmHeader2,
                                    onConfirm: () => {
                                        removeHistoryItem(id)
                                        removeQueueItem(groupId)
                                    },
                                    confirmButton: <Button negative content={textsCap.remove} />,
                                    size: 'tiny',
                                })
                            },
                            title: textsCap.delete,
                        },
                    ].map((props, i) => <Button {...props} key={i} />),
                    textAlign: 'center',
                    title: textsCap.action
                },
            ],
            data: new Map(),
            defaultSort: 'timestamp',
            defaultSortAsc: false, // latest first
            rowProps: ({ status }) => ({
                // negative: status === 'error',
                // positive: status === 'success',
                warning: status === 'loading',
            }),
            searchExtraKeys: [
                'action',
                'description',
                'identity',
                'txId',
            ],
            searchable: true,
            selectable: true,
            topLeftMenu: [{
                content: textsCap.clearAll,
                icon: 'trash',
                name: 'clear-all',
                negative: true,
                onClick: () => confirmAsPromise({
                    confirmButton: (
                        <Button {...{
                            content: textsCap.clearAll,
                            icon: 'trash',
                            negative: true,
                        }} />
                    ),
                    header: textsCap.clearAll,
                    size: 'mini',
                })
                    .then(ok => ok && clearAll()),
            }],
            // on select menu
            topRightMenu: [{
                content: textsCap.delete,
                icon: 'trash',
                onClick: ids => ids.forEach(removeHistoryItem)
            }]
        }
        return state
    })
    // update table whenever rxHistory is changed
    const [data, setData] = useRxSubject(rxHistory, (history = new Map()) => {
        Array
            .from(history)
            .forEach(([_, item]) => {
                // clear unwanted spaces caused by use of backquotes etc.
                item.message = clearClutter(item.message || '')
                item._description = (item.description || '')
                    .split(' ')
                    .map(x => textEllipsis(x, 20))
                    .join(' ')
                // add identity name if available
                item._identity = getAddressName(item.identity)
                item._timestamp = format(item.timestamp, true)
                // to make the entire object searchable
                item._search = JSON.stringify(item)
            })
        return history
    })

    // Set initial table data.
    // This is required because rxHistory is a Subject instance (due to cache being disabled)
    useEffect(() => setData(getAll()), [])
        
    const { topLeftMenu } = state
    const btnClearAll = topLeftMenu.find(x => x.name === 'clear-all')
    btnClearAll.disabled = data.size === 0

    return (
        <DataTable {...{
            ...props,
            ...state,
            columns: state.columns.map(column => ({
                ...column,
                hidden: isFn(column.hidden)
                    ? column.hidden()
                    : column.hidden
            })),
            data,
        }} />
    )
}