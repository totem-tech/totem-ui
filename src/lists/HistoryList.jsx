import React, { Component } from 'react'
import { Button, Icon } from 'semantic-ui-react'
import DataTable from '../components/DataTable'
import { formatStrTimestamp } from '../utils/time'
import FormBuilder from '../components/FormBuilder'
// services
import { bond, clearAll, getAll, remove } from '../services/history'
import { translated } from '../services/language'
import { confirm, showForm } from '../services/modal'
import { getAddressName } from '../services/partner'
import { clearClutter } from '../utils/utils'

const [texts, textsCap] = translated({
    action: 'action',
    clearAll: 'Clear All',
    close: 'close',
    data: 'data',
    delete: 'delete',
    description: 'description',
    errorMessage: 'Error message',
    executionTime: 'Execution time',
    function: 'function',
    groupId: 'Group ID',
    identity: 'identity',
    message: 'message',
    status: 'status',
    taskId: 'Task ID',
    techDetails: 'technical details',
    timestamp: 'timestamp',
    title: 'title',
    type: 'type',
}, true)

export default class HistoryList extends Component {
    constructor(props) {
        super(props)

        this.state = {
            columns: [
                {
                    collapsing: true,
                    content: ({ icon, status }) => (
                        <Icon
                            className='no-margin'
                            loading={status === 'loading'}
                            name={status === 'loading' ? 'spinner' : icon || 'history'}
                        />
                    ),
                    title: '',
                },
                {
                    collapsing: true,
                    key: '_timestamp',
                    title: textsCap.executionTime,
                },
                {
                    collapsing: true,
                    key: '_identity',
                    title: textsCap.identity,
                },
                { key: 'title', title: textsCap.title },
                {
                    key: 'description',
                    style: {
                        minWidth: 200,
                        whiteSpace: 'pre-wrap',
                    },
                    title: textsCap.description,
                },
                {
                    collapsing: true,
                    content: (item, id) => [
                        {
                            icon: 'close',
                            onClick: () => remove(id),
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
            defaultSort: '_timestamp',
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
                content: texts.clearAll,
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
                onClick: ids => ids.forEach(remove)
            }]
        }
    }

    componentWillMount() {
        this._mounted = true
        this.tieId = bond.tie(() => {
            const data = getAll()
            Array.from(data).forEach(([_, item]) => {
                // clear unwanted spaces caused by use of backquotes etc.
                item.message = clearClutter(item.message || '')
                // add identity name if available
                item._identity = getAddressName(item.identity)
                // Make time more human friendly
                item._timestamp = item.timestamp.replace(/\T|\Z/g, ' ').split('.')[0]
            })
            this.setState({ data })
        })
    }

    componentWillUnmount() {
        this._mounted = true
        bond.untie(this.tieId)
    }

    showDetails = (item, id) => {
        const x = [
            // title describes what the task is about
            [textsCap.action, item.title],
            // description about the task that is displayed in the queue toast message
            [textsCap.description, item.description, 'textarea'],
            // show error message only if available
            item.message && [textsCap.errorMessage, item.message, 'textarea', { invalid: item.status === 'error' }],
            // blockchain or chat client function path in string format
            [textsCap.function, item.action],
            // user's identity that was used to create the transaction
            item.identity && [textsCap.identity, item._identity],
            [textsCap.timestamp, item._timestamp],
            [texts.groupId, item.groupId],
            [texts.taskId, id],
            // data is an array of arguments passed to and solely dependant on the specific task's function (@item.action <=> queueItem.func).
            [textsCap.data, JSON.stringify(item.data, null, 4), 'textarea'],
        ]
        showForm(FormBuilder, {
            closeText: textsCap.close,
            header: textsCap.techDetails,
            inputs: x.filter(Boolean)
                .map(([label, value, type = 'text', extraProps = {}], i) => ({
                    ...extraProps,
                    label,
                    name: `${i}`,
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