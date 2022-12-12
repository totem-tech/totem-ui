import React from 'react'
import PropTypes from 'prop-types'
import DataTable from '../../../components/DataTable'
import { translated } from '../../../utils/languageHelper'
import { iUseReducer } from '../../../utils/reactHelper'
import AddressName from '../../partner/AddressName'
import useTask from '../useTask'
import Message, { statuses } from '../../../components/Message'
import { format } from '../../../utils/time'

let textsCap = {
    appliedAt: 'applied at',
    emptyMessage: 'no applications received',
    loading: 'loading...',
    worker: 'worker',
}
textsCap = translated(textsCap, true)[1]

const ApplicationList = props => {
    const { taskId } = props
    const { error, task } = useTask(taskId)
    const [state] = iUseReducer(null, getInitialState)

    if (!task) return (
        <Message {...{
            content: !!error
                ? error
                : textsCap.loading,
            icon: true,
            status: !!error
                ? statuses.ERROR
                : statuses.LOADING,
        }} />
    )

    const { applications = [] } = task
    return (
        <DataTable {...{
            ...props,
            ...state,
            data: applications,
            emptyMessage: textsCap.emptyMessage,
            searchable: applications.length > 10,
        }} />
    )
}
ApplicationList.propTypes = {
    taskId: PropTypes.string.isRequired,
}

const getInitialState = rxSetState => {
    const columns = [
        {
            content: ({ date, tsCreated }) => format(
                tsCreated || date,
                false,
                false,
                true,
            ),
            key: 'tsCreated',
            title: textsCap.appliedAt,
        },
        {
            content: ({ userId, workerAddress }) => (
                <AddressName {...{
                    address: workerAddress,
                    userId,
                }} />
            ),
            key: 'workerAddress',
            title: textsCap.worker,
        },
        {},
    ]
    return {
        columns,
    }
}

export default ApplicationList