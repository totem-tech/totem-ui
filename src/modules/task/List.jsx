import React, { Component, useState, useEffect, useReducer } from 'react'
import PropTypes from 'prop-types'
// components
import DataTable from '../../components/DataTable'
// forms
import TaskForm from './Form'
// services
import { getConnection } from '../../services/blockchain'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { selectedAddressBond, getSelected } from '../../services/identity'
import { isFn } from '../../utils/utils'

const [texts, textsCap] = translated({
    actions: 'actions',
    assignee: 'assignee',
    bounty: 'bounty',
    create: 'create',
    description: 'description',
    tags: 'tags',
    taskOwner: 'task owner',
    title: 'title',
}, true)
const listTypes = Object.freeze({
    owner: 'owner',
    approver: 'approver',
    fullfiller: 'fullfiller',
})

export default class List extends Component {
    constructor(props) {
        super(props)

        this.listType = listTypes[props.listType] || listTypes.owner
        this.selectedAddress = null
        this.state = {
            columns: [
                { key: 'title', title: textsCap.title },
                { key: '_owner', title: textsCap.taskOwner },
                { key: '_assignee', title: textsCap.assignee },
                { key: '_bounty', title: textsCap.bounty },
                { key: 'tags', title: textsCap.tags },
                { key: 'description', title: textsCap.description },
                { title: textsCap.actions }
            ],
            data: new Map(
                new Array(15).fill().map((_, i) => [i, {
                    title: `Task ${i}`,
                    description: `Task ${i} description`,
                    assignee: i % 2 === 0 ?
                        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
                        : '5G1iRKXyqeX9WLzS6bT7i41NUntmtCHZG2vwReZomnaxHvsD',
                }])
            ),
            topLeftMenu: [
                {
                    content: textsCap.create,
                    icon: 'plus',
                    onClick: () => showForm(TaskForm, { size: 'tiny' }),
                }
            ]
        }


        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        this.tieIdAddress = selectedAddressBond.tie(async (address) => {
            this.selectedAddress = address
            // subscribe to hash list changes
            const { api } = await getConnection()
            this.unsubscribe && this.unsubscribe()
            this.unsubscribe = await api.query.orders[this.listType](address, hashAr => { //).then(
                console.log({ hashAr })
                if (!this._mounted) return
                // Promise.all([])
                // retrieve 
                // this.setState({ hashAr, data: new Map() })
            })
            console.log({ unsubscribe: this.unsubscribe })
        })
    }

    componentWillUnmount() {
        this._mounted = false
        isFn(this.unsubscribe) && this.unsubscribe() || console.log({ unsubscribe: this.unsubscribe })
        selectedAddressBond.untie(this.tieIdAddress)
    }

    render = () => <DataTable {...{ ...this.props, ...this.state }} />
}
List.propTypes = {
    // valid options: owner, approver, fullfiller
    listType: PropTypes.string,
}
List.defaultProps = {
    listType: listTypes.owner,
}