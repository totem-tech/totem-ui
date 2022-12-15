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
import { closeModal, confirmAsPromise, showInfo } from '../../../services/modal'
import { applicationStatus, queueableApis, queueables } from '../task'
import ApplicationView from './ApplicationView'
import { isFn, objClean } from '../../../utils/utils'
import { bonsaiKeys, getBonsaiData } from '../TaskForm'
import FormInput from '../../../components/FormInput'
import { BehaviorSubject } from 'rxjs'
import { addToQueue, checkComplete, QUEUE_TYPES } from '../../../services/queue'

let textsCap = {
    accept: 'accept',
    acceptApplication: 'accept application',
    applicant: 'applicant',
    appliedAt: 'applied at',
    emptyMessage: 'no applications received',
    identity: 'identity',
    loading: 'loading...',
    rejectApplication: 'reject application',
    rejectOthers: 'reject all other applicants',
    status: 'status',
    title: 'title',
    view: 'view',
    viewApp: 'review appliation',
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

const getStatusContent = (application = {}, _1, _arr, props = {}) => {
    const {
        isMobile,
        forceReload,
        modalId,
        task,
        taskId,
    } = props
    const {
        _status,
        userId,
        workerAddress,
    } = application

    const accepted = _status === applicationStatus[1]
    const rejected = _status === applicationStatus[2]
    if (accepted) return _status
        
    const handleAction = async (_, accept) => {
        const {
            owner,
            approver,
            fulfiller,
            isSell,
            amountXTX,
            isMarket,
            orderType,
            deadline,
            dueDate,
        } = task
        const confirmId = taskId + workerAddress + 'confirm'
        const handleResult = (success, err) => {
            console.log(success, err)
            err && showInfo({
                collapsing: true,
                content: (
                    <Message {...{ 
                        content: `${err || ''}`,
                        icon: true,
                        status: 'error',
                    }} />
                ),
            })
        }
        const [dbValues, token] = getBonsaiData(task, task.owner)
        const data = {
            rejectOthers: true,
            status: accept
                ? 1
                : 2,
            taskId,
            workerAddress,
        }
        const description = workerAddress
        const title = accept
            ? textsCap.acceptApplication
            : textsCap.rejectApplication
        const offChain = {
            args: [data, null],
            description,
            func: queueableApis.marketApplication,
            recordId: taskId,
            then: handleResult,
            title,
            type: QUEUE_TYPES.CHATCLIENT,
        }
        const onChain = queueables.saveSpfso(
            owner,
            approver,
            workerAddress,
            isSell,
            amountXTX,
            isMarket,
            orderType,
            deadline,
            dueDate,
            taskId,
            token,
            {
                description,
                next: offChain,
                then: handleResult,
                title,
            }
        )
        const confirmed = await confirmAsPromise({
            confirmButton: (
                <Button {...{
                    content: accept
                        ? textsCap.acceptApplication
                        : textsCap.rejectApplication,
                    negative: !accept,
                    positive: accept,
                }} />
            ),
            content: (
                <div>
                    <div style={{ marginBottom: 15 }}>
                        <b>{textsCap.applicant}: </b><br/>
                        <AddressName address={workerAddress} /> (<UserID userId={userId} />)
                    </div>
                    <FormInput {...{
                        label: textsCap.rejectOthers,
                        name: 'rejectOthers',
                        onChange: (_, { value }) => data.rejectOthers = value,
                        rxValue: new BehaviorSubject(accept),
                        toggle: true,
                        type: 'checkbox',
                    }} />
                </div>
            ),
            header: `${title}?`,
            size: 'mini',
        }, confirmId)
        if (!confirmed) return

        // if rejected, no need to update onchain data
        const queueId = addToQueue(accept ? onChain : offChain)
        console.log({queueId, taskId})

        // keeps the button disabled until queue item execution is completed (success/error)
        await checkComplete(queueId, true)

        setTimeout(() => {
            console.log('complete: shoulds stop loading spinner now')
            closeModal(modalId)
            isFn(forceReload) && forceReload()
        })
    }

    return (
        <div>
            {/* {rejected && <div>{_status}</div>} */}
            <ButtonAcceptOrReject {...{
                acceptProps: { icon: 'check' },
                acceptText: isMobile
                    ? '' // hide text on mobile
                    : undefined ,
                rejectProps: {
                    disabled: rejected,
                    icon: 'close',
                },
                rejectText: isMobile
                    ? '' // hide text on mobile
                    : undefined,
                onAction: handleAction,
                title: textsCap.accept,
            }} />
        </div>
    )
}
export default ApplicationList