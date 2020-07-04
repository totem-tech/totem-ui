import React, { Component, useState, useEffect, useReducer } from 'react'
import PropTypes from 'prop-types'
import DataTable from '../../components/DataTable'
import { showForm } from '../../services/modal'
import TaskForm from './Form'
import { getConnection } from '../../services/blockchain'
import { translated } from '../../services/language'

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

export default function List(props) {
    const [state, dispatch] = useReducer(reducer, getListProps())

    useEffect(() => {
        getConnection().then(({ api }) => {

        })
        return () => { }
    }, [])
    return <DataTable {...{ ...props, ...state }} />
}
List.propTypes = {
    // valid options: owner, approver, fullfiller
    listType: PropTypes.string,
}
List.defaultProps = {
}

const reducer = (state = {}, action = { type: '', data: undefined }) => {
    switch (action) {
        case 'columns':
            break
        case 'hashAr':
            state.hashAr = data
            break
    }
    return state
}

const getListProps = () => ({
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
            onClick: () => showForm(TaskForm, { size: 'tiny' }),
        }
    ]
})