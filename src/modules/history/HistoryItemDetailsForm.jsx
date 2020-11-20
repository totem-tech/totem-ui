import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'semantic-ui-react'
import { copyToClipboard, isObj } from '../../utils/utils'
import { format } from '../../utils/time'
import DataTable from '../../components/DataTable'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import JSONView from '../../components/JSONView'
import { translated } from '../../services/language'
import { statusTitles } from '../../services/queue'
import { query } from '../../services/blockchain'
import LabelCopy from '../../components/LabelCopy'

// Read-only form
const textsCap = translated({
    action: 'action',
    advanced: 'advanced',
    balances: 'balances',
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

    name: 'name',
    type: 'type',
    value: 'value',
}, true)[1]

export default function HistoryItemDetailsForm(props) {
    const { values = {} } = props
    const {
        action,
        balance,
        data,
        description,
        identity,
        message,
        result,
        status,
        timestamp,
        title,
        txId,
    } = values
    const { before, after } = isObj(balance) ? balance : {}
    const isTx = `${action}`.includes('api.tx.')
    const [inputs, setInputs] = useState([
        {
            accordion: {
                collapsed: true,
                styled: true,
            },
            inline: false,
            label: textsCap.advanced,
            name: 'advanced',
            type: 'group',
            widths: 16,
            grouped: true,
            inputs: [
                txId && {
                    inlineLabel: <LabelCopy {...{ content: null, value: txId }} />,
                    labelPosition: 'right',
                    name: 'txId',
                    label: textsCap.txId,
                    readOnly: true,
                    value: txId,
                    type: 'text',
                },
                {
                    label: textsCap.function,
                    name: 'action',
                    readOnly: true,
                    type: 'text',
                    value: action,
                },
                identity && {
                    inlineLabel: <LabelCopy {...{ content: null, value: identity }} />,
                    labelPosition: 'right',
                    label: textsCap.identity,
                    name: 'identity',
                    readOnly: true,
                    type: 'text',
                    value: identity,
                },
                data && {
                    content: (
                        <div style={{ padding: '0 10px' }}>
                            <h5 style={{ margin: 0 }}>{textsCap.dataSent}</h5>
                            {isTx
                                ? <Icon loading={true} name='spinner' />
                                : <JSONView data={data} />
                            }
                        </div>
                    ),
                    name: 'dataSent',
                    type: 'html',
                },
                result && {
                    content: (
                        <div style={{ padding: '0 10px' }}>
                            <h5 style={{ margin: 0 }}>{textsCap.dataReceived}</h5>
                            <JSONView data={result} />
                        </div>
                    ),
                    name: 'result',
                    type: 'html',
                },
            ].filter(Boolean)
        },
        {
            label: textsCap.action,
            name: 'title',
            readOnly: true,
            value: title,
            type: 'text',
        },
        {
            label: textsCap.description,
            name: 'description',
            readOnly: true,
            type: 'textarea',
            value: description,
        },
        {
            label: textsCap.status,
            name: 'status',
            readOnly: true,
            value: statusTitles[status] || textsCap.pendingExecution,
            type: 'text',
        },
        message && {
            invalid: status === 'error',
            label: textsCap.errorMessage,
            name: 'message',
            readOnly: true,
            value: `${message}`,
            type: 'textarea',
        },
        {
            label: textsCap.timestamp,
            name: 'timestamp',
            readOnly: true,
            type: 'text',
            value: format(timestamp, true, true),
        },
        !before && !after ? null : {
            label: textsCap.balances,
            inline: true,
            grouped: false,
            name: 'group-balances',
            type: 'group',
            widths: 8,
            inputs: [
                before && {
                    action: { content: 'XTX' },
                    label: textsCap.balanceBeforeTx,
                    name: 'balance-before',
                    readOnly: true,
                    value: before,
                    type: 'number',
                },
                after && {
                    action: { content: 'XTX' },
                    label: textsCap.balanceAfterTx,
                    name: 'balance-after',
                    readOnly: true,
                    value: after,
                    type: 'number',
                },
            ].filter(Boolean),
        },
    ].filter(Boolean))

    isTx && data && useEffect(() => {
        let mounted = true
        query(action + '.meta').then(meta => {
            if (!mounted) return
            const { args = [] } = meta
            const tableProps = {
                data: args.map((arg, i) => ({
                    ...arg,
                    value: data[i],
                    _value: <JSONView data={data[i]} />,
                })),
                columns: [
                    { key: '_value', title: textsCap.value },
                    { collapsing: true, key: 'name', title: textsCap.name },
                    { collapsing: true, key: 'type', title: textsCap.type },
                ],
                perPage: args.length,
                searchable: false,
                style: { padding: 0, margin: 0 },
                tableProps: {
                    celled: true,
                    unstackable: true,
                    singleLine: true,
                },
            }
            const dataSentIn = findInput(inputs, 'dataSent')
            dataSentIn.content = (
                <div style={{ padding: '0 10px' }}>
                    <h4 style={{ margin: 0 }}>{textsCap.dataSent}</h4>
                    <DataTable {...{ ...tableProps }} />
                </div>
            )
            dataSentIn.hidden = false
            setInputs([...inputs])
        })

        return () => mounted = false
    }, [setInputs])


    return <FormBuilder {...{ ...props, inputs, values: undefined }} />
}
HistoryItemDetailsForm.propTypes = {
    values: PropTypes.object,
}
HistoryItemDetailsForm.defaultProps = {
    closeOnDimmerClick: true,
    closeOnEscape: true,
    closeText: null,
    header: textsCap.techDetails,
    size: 'tiny',
    submitText: null,
}