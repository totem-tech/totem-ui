import React from 'react'
import PropTypes from 'prop-types'
import DataTable from '../../../components/DataTable'
import { translated } from '../../../utils/languageHelper'
import { useRxSubject } from '../../../utils/reactHelper'
import AddressName from '../../partner/AddressName'
import useTask from '../useTask'
import Message, { statuses } from '../../../components/Message'
import { format } from '../../../utils/time'
import { Button, ButtonAcceptOrReject, UserID } from '../../../components/buttons'
import { MOBILE, rxLayout } from '../../../services/window'
import { closeModal, showInfo } from '../../../services/modal'
import { applicationStatus } from '../task'
import ApplicationView from './ApplicationView'

let textsCap = {
    accept: 'accept',
    applicant: 'applicant',
    appliedAt: 'applied at',
    emptyMessage: 'no applications received',
    identity: 'identity',
    loading: 'loading...',
    status: 'status',
    title: 'title',
    view: 'view',
    viewApp: 'view appliation',
}
textsCap = translated(textsCap, true)[1]

const ApplicationList = props => {
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const { modalId, taskId } = props
    const { error, task } = useTask(taskId)
    const { proposalRequired = true } = task || {}
    
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
    const columnsHidden = [
        isMobile && 'tsCreated',
        !proposalRequired && 'view'
    ].filter(Boolean)
    const columns = getColumns(false)

    return (
        <DataTable {...{
            ...props,
            columns,
            columnsHidden,
            data: applications,
            emptyMessage: textsCap.emptyMessage,
            isMobile,
            modalId,
            searchable: applications.length > 10,
            sortAsc: false,
            sortBy: 'tsCreated',
            task,
            taskId,
        }} />
    )
}
ApplicationList.propTypes = {
    modalId: PropTypes.string,
    taskId: PropTypes.string.isRequired,
}

export const getColumns = (showStatusButtons = true) => {
    const columns = [
        {
            collapsing: true,
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
            collapsing: true,
            content: ({ userId }, _1, _2, { modalId }) => (
                <UserID {...{
                    onChatOpen: () => closeModal(modalId),
                    userId
                }} />
            ),
            key: 'userId',
            title: textsCap.applicant,
        },
        {
            content: ({ userId, workerAddress }) => (
                <AddressName {...{
                    address: workerAddress,
                    userId,
                }} />
            ),
            key: 'workerAddress',
            title: textsCap.identity,
        },
        {
            content: !showStatusButtons
                ? undefined
                : getStatusContent,
            key: '_status',
            textAlign: 'center',
            title: textsCap.status,
        },
        {
            collapsing: true,
            content: (application, _i, _arr, { task, taskId }) => (
                <Button {...{
                    icon: 'eye',
                    onClick: () => {
                        const modalId = `${taskId}-${application.workerAddress}`
                        const content = (
                            <ApplicationView {...{
                                application,
                                modalId,
                                task,
                                taskId,
                            }} />
                        )
                        showInfo({
                            collapsing: true,
                            content,
                            header: textsCap.viewApp,
                            size: 'tiny',
                            subheader: `${textsCap.title}: ${task.title}`
                        }, modalId)
                    },
                }} />
            ),
            name: 'view',
            title: textsCap.view,
        }
    ]
    return columns
}

const getStatusContent = (application = {}, _i, _arr, props = {}) => {
    const {
        isMobile,
        modalId,
        task,
        taskId,
    } = props
    const { _status, userId } = application
    if (_status !== applicationStatus[0]) return _status
        
    return (
        <ButtonAcceptOrReject {...{
            acceptProps: { icon: 'check' },
            acceptText: isMobile
                ? '' // hide text on mobile
                : undefined ,
            rejectProps: { icon: 'close' },
            rejectText: isMobile
                ? '' // hide text on mobile
                : undefined,
            onAction: (_, accept) => {

            },
            title: textsCap.accept,
        }} />
    )
}
export default ApplicationList