import React, { Component } from 'react'
import { Button, Icon } from 'semantic-ui-react'
import { format } from '../../utils/time'
import { clearClutter, isFn, textEllipsis } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import { translated } from '../../services/language'
import { confirm, confirmAsPromise, showForm } from '../../services/modal'
import { getById as getQueueItemById, remove as removeQueueItem, statuses, checkComplete } from '../../services/queue'
import { unsubscribe } from '../../services/react'
import { getAddressName } from '../partner/partner'
import { clearAll, remove as removeHistoryItem, rxHistory, getAll } from './history'
import HistoryItemDetailsForm from './HistoryItemDetailsForm'
import { MOBILE, rxLayout } from '../../services/window'

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
    removeWarning2: 'you will not be able to recover this history item once removed.',
    removeConfirmHeader: 'remove unfinished queue item?',
    removeConfirmHeader2: 'are you sure?',
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
                    hidden: () => this.state.isMobile,
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
                    key: '_description',
                    style: {
                        minWidth: 200,
                        whiteSpace: 'pre-wrap',
                    },
                    title: textsCap.description,
                },
                {
                    collapsing: true,
                    hidden: () => this.state.isMobile,
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
                            onClick: () => showForm(HistoryItemDetailsForm, { values: item }),
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
                name: 'clear-all',
                negative: true,
                onClick: () => confirmAsPromise({ size: 'tiny' })
                    .then(ok => ok && clearAll()),
            }],
            topRightMenu: [{
                content: textsCap.delete,
                icon: 'close',
                onClick: ids => ids.forEach(removeHistoryItem)
            }]
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        this.subs = {}
        this.subs.history = rxHistory.subscribe(this.setHistory)
        this.subs.isMobile = rxLayout.subscribe(l => 
            this.setState({ isMobile: l === MOBILE })
        )
        // force initial read as in-memory caching is disabled
        this.setHistory(getAll())
    }

    componentWillUnmount() {
        this._mounted = false
        unsubscribe(this.subs)
    }

    setHistory = (history = new Map()) => {
        Array.from(history).forEach(([_, item]) => {
            // clear unwanted spaces caused by use of backquotes etc.
            item.message = clearClutter(item.message || '')
            item._description = (item.description || '')
                .split(' ')
                .map(x => textEllipsis(x, 20))
                .join(' ')
            // add identity name if available
            item._identity = getAddressName(item.identity)
            item._timestamp = format(item.timestamp, true)
        })
        this.setState({ data: history })
    }

    render() {
        const { data, topLeftMenu } = this.state
        const clearAll = topLeftMenu.find(x => x.name === 'clear-all')
        clearAll.disabled = data.size === 0
        return (
            <DataTable {...{
                ...this.props,
                ...this.state,
                columns: this.state.columns.map(column => ({
                    ...column,
                    hidden: isFn(column.hidden)
                        ? column.hidden()
                        : column.hidden
                }))
            }} />
        )
    }
}