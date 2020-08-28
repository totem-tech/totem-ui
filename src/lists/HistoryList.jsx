import React, { Component } from 'react'
import { Button, Icon } from 'semantic-ui-react'
import DataTable from '../components/DataTable'
import FormBuilder from '../components/FormBuilder'
import { format } from '../utils/time'
import { clearClutter, isValidNumber, isObj, isDefined, copyToClipboard, isFn } from '../utils/utils'
// services
import { clearAll, remove as removeHistoryItem, rxHistory } from '../services/history'
import { translated } from '../services/language'
import { confirm, showForm } from '../services/modal'
import { getAddressName } from '../services/partner'
import {
    getById as getQueueItemById,
    remove as removeQueueItem,
    statuses,
    statusTitles,
    checkComplete,
} from '../services/queue'

const textsCap = translated({
    action: 'action',
    balanceAfterTx: 'account balance after transaction',
    balanceBeforeTx: 'account balance before transaction',
    clearAll: 'Clear All',
    close: 'close',
    dataReceived: 'data received',
    dataSent: 'data sent',
    delete: 'delete',
    description: 'description',
    errorMessage: 'Error message',
    executionTime: 'Execution time',
    function: 'function',
    groupId: 'Group ID',
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
    removeWarning2: 'You will not be able to recover this history item once removed.',
    removeConfirmHeader: 'remove unfinished queue item?',
    removeConfirmHeader2: 'Are you sure?',
    status: 'status',
    taskId: 'Task ID',
    techDetails: 'technical details',
    timestamp: 'timestamp',
    title: 'title',
    txId: 'Transaction ID',
    type: 'type',
}, true)[1]

export default class HistoryList extends Component {
    constructor(props) {
        super(props)

        // makes columns resizable
        const headerProps = { style: { resize: 'both', overflow: 'auto' } }

        this.state = {
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
                    content: ({ timestamp }) => format(timestamp, true),
                    key: 'timestamp',
                    title: textsCap.executionTime,
                },
                {
                    headerProps,
                    key: 'title',
                    title: textsCap.title,
                },
                {
                    headerProps,
                    key: 'description',
                    style: {
                        minWidth: 200,
                        whiteSpace: 'pre-wrap',
                    },
                    title: textsCap.description,
                },
                {
                    collapsing: true,
                    key: '_identity',
                    title: textsCap.identity,
                },
                {
                    collapsing: true,
                    content: (item, id) => [
                        {
                            icon: 'close',
                            onClick: () => {
                                const { groupId } = item
                                const rootTask = getQueueItemById(groupId)
                                const isComplete = checkComplete(rootTask)
                                confirm({
                                    content: !isComplete ? textsCap.removeWarning : textsCap.removeWarning2,
                                    header: !isComplete ? textsCap.removeConfirmHeader : textsCap.removeConfirmHeader2,
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
                        {
                            icon: 'eye',
                            negative: item.status === 'error',
                            onClick: () => this.showDetails(item, id),
                            title: textsCap.techDetails
                        }
                    ].map((props, i) => <Button {...props} key={i} />),
                    textAlign: 'center',
                    title: textsCap.action
                },
            ],
            data: new Map(),
            defaultSort: 'timestamp',
            defaultSortAsc: false, // latest first
            rowProps: ({ status }) => ({
                negative: status === 'error',
                positive: status === 'success',
                warning: status === 'loading',
            }),
            searchExtraKeys: ['identity', 'action'],
            searchable: true,
            selectable: true,
            topLeftMenu: [{
                content: textsCap.clearAll,
                name: 'clear-all',
                negative: true,
                onClick: () => confirm({
                    onConfirm: () => clearAll(),
                    size: 'tiny',
                }),
            }],
            topRightMenu: [{
                content: textsCap.delete,
                icon: 'close',
                onClick: ids => ids.forEach(removeHistoryItem)
            }]
        }
    }

    componentWillMount() {
        this._mounted = true
        this.unsubscribers = {}
        this.unsubscribers.history = rxHistory.subscribe(data => {
            Array.from(data).forEach(([_, item]) => {
                // clear unwanted spaces caused by use of backquotes etc.
                item.message = clearClutter(item.message || '')
                // add identity name if available
                item._identity = getAddressName(item.identity)
            })
            this.setState({ data })
        }).unsubscribe
    }

    componentWillUnmount() {
        this._mounted = true
        Object.values(this.unsubscribers).forEach(fn => isFn(fn) && fn())
    }

    showDetails = (item, id) => {
        const errMsg = `${item.message}` // in case message is an Error object
        const { before, after } = isObj(item.balance) ? item.balance : {}
        const balanceExtProps = { action: { content: 'XTX' } }

        const inputDefs = [
            item.txId && [textsCap.txId, item.txId, 'text', {
                action: {
                    icon: 'copy',
                    onClick: () => copyToClipboard(item.txId),
                }
            }],
            // title describes what the task is about
            [textsCap.action, item.title],
            // description about the task that is displayed in the queue toast message
            [textsCap.description, item.description, 'textarea'],
            [textsCap.status, statusTitles[item.status] || textsCap.pendingExecution],
            // show error message only if available
            errMsg && [textsCap.errorMessage, errMsg, 'textarea', { invalid: item.status === 'error' }],
            // blockchain or chat client function path in string format
            [textsCap.function, item.action],
            // user's identity that was used to create the transaction
            item.identity && [textsCap.identity, item.identity],
            [textsCap.timestamp, format(item.timestamp, true, true)],
            // [textsCap.groupId, item.groupId], // ID of the parent (rootTask) queue item
            // [textsCap.taskId, id], // ID of the child/parent(rootTask) queue item
            isValidNumber(before) && [textsCap.balanceBeforeTx, before, 'number', balanceExtProps],
            isValidNumber(after) && [textsCap.balanceAfterTx, after, 'number', balanceExtProps],
            [textsCap.dataSent, JSON.stringify(item.data, null, 4), 'textarea'],
            isDefined(item.result) && [textsCap.dataReceived, JSON.stringify(item.result, null, 4), 'textarea']
        ]

        showForm(FormBuilder, {
            closeText: textsCap.close,
            header: textsCap.techDetails,
            inputs: inputDefs.filter(Boolean)
                .map(([label, value, type = 'text', extraProps = {}], i) => ({
                    ...extraProps,
                    label,
                    name: `${i}-${label}`,
                    readOnly: true,
                    type,
                    value,
                })),
            size: 'tiny',
            submitText: null,
        })
    }

    render() {
        const { data, topLeftMenu } = this.state
        topLeftMenu.find(x => x.name === 'clear-all').disabled = data.size === 0
        return <DataTable {...this.state} />
    }
}