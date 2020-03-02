import React, { Component } from 'react'
import { Button, Icon } from 'semantic-ui-react'
import DataTable from '../components/DataTable'
import { formatStrTimestamp } from '../utils/time'
// services
import { bond, clearAll, getAll, remove } from '../services/history'
import { translated } from '../services/language'
import { confirm } from '../services/modal'
import { getAddressName } from '../services/partner'
import { clearClutter } from '../utils/utils'

const [texts, textsCap] = translated({
    action: 'action',
    clearAll: 'Clear All',
    delete: 'delete',
    description: 'description',
    executionTime: 'Execution time',
    identity: 'identity',
    message: 'message',
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
                    content: ({ icon }) => <Icon className='no-margin' name={icon || 'history'} />,
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
                    key: 'message',
                    style: {
                        whiteSpace: 'pre-wrap',
                        maxWidth: 250,
                    },
                    title: textsCap.message
                },
                {
                    collapsing: true,
                    content: (_, id) => (
                        <Button
                            icon='close'
                            onClick={() => remove(id)}
                            title={textsCap.delete}
                        />
                    ),
                    textAlign: 'center',
                    title: textsCap.action
                }
            ],
            data: new Map(),
            defaultSort: '_timestamp',
            defaultSortAsc: false, // latest first
            rowProps: ({ status }) => ({ negative: status === 'error' }),
            searchExtraKeys: ['identity', 'action'],
            searchable: true,
            selectable: true,
            topLeftMenu: [{
                content: texts.clearAll,
                name: 'clear-all',
                negative: true,
                onClick: () => confirm({ onConfirm: () => clearAll(), size: 'tiny' }),
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
                item.message = clearClutter(item.message || '')
                item._identity = getAddressName(item.identity)
                item._timestamp = item.timestamp.replace(/\T|\Z/g, ' ').split('.')[0]
            })
            this.setState({ data })
        })
    }

    componentWillUnmount() {
        this._mounted = true
        bond.untie(this.tieId)
    }

    render() {
        const { data, topLeftMenu } = this.state
        topLeftMenu.find(x => x.name === 'clear-all').disabled = data.size === 0
        return <DataTable {...this.state} />
    }
}