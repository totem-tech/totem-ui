import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { BehaviorSubject } from 'rxjs'
// components
import DataTable from '../../../components/DataTable'
import {
    Button,
    ButtonAcceptOrReject,
    UserID,
} from '../../../components/buttons'
import FormInput from '../../../components/FormInput'
// services
import {
    closeModal,
    confirmAsPromise,
    newId,
    showForm,
    showInfo,
} from '../../../services/modal'
import {
    addToQueue,
    awaitComplete,
    QUEUE_TYPES,
} from '../../../services/queue'
// utils
import { translated } from '../../../utils/languageHelper'
import PromisE from '../../../utils/PromisE'
import {
    Message,
    statuses,
    useRxSubject,
} from '../../../utils/reactjs'
import { format } from '../../../utils/time'
import {
    deferred,
    generateHash,
    isFn,
} from '../../../utils/utils'
import { MOBILE, rxLayout } from '../../../utils/window'
// modules
import { get as getIdentity } from '../../identity/identity'
import AddressName from '../../partner/AddressName'
import { get as getPartner } from '../../partner/partner'
import PartnerForm, { inputNames as pInputNames } from '../../partner/PartnerForm'
import { applicationStatus, queueableApis } from '../task'
import TaskForm, { inputNames as taskInputNames } from '../TaskForm'
import useTask from '../useTask'
import ApplicationView from './ApplicationView'

let textsCap = {
    accept: 'accept',
    acceptApplication: 'accept application',
    addPartner: 'add the applicant identity as your partner',
    applicant: 'applicant',
    appliedAt: 'applied at',
    emptyMessage: 'no applications received',
    identity: 'identity',
    loading: 'loading...',
    rejectApplication: 'reject application',
    rejectOthers: 'reject all other unaccepted applications',
    status: 'status',
    title: 'title',
    view: 'view',
    viewApp: 'review appliation',
}
textsCap = translated(textsCap, true)[1]

const ApplicationList = props => {
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const {
        forceReload,
        modalId,
        taskId,
    } = props
    const [updateTrigger, setUpdateTrigger] = useState()
    const { error, task } = useTask(taskId, updateTrigger)
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
    const columns = getColumns(!proposalRequired)

    return (
        <DataTable {...{
            ...props,
            columns,
            columnsHidden,
            data: applications,
            emptyMessage: textsCap.emptyMessage,
            searchable: applications.length > 10,
            sortAsc: false,
            sortBy: 'tsCreated',

            // extra info used by cells
            isMobile,
            modalId,
            forceReload: deferred(() => {
                // reload application view
                setUpdateTrigger(generateHash())

                // reload marketplace tasks list
                isFn(forceReload) && forceReload()
            }, 200),
            task,
            taskId,
        }} />
    )
}
ApplicationList.propTypes = {
    modalId: PropTypes.string,
    taskId: PropTypes.string.isRequired,
}
export default ApplicationList

const getAddressBtn = ({ name, userId, workerAddress }) => (
    <AddressName {...{
        address: workerAddress,
        name,
        userId,
    }} />
)

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
            style: { minWidth: 120 },
            title: textsCap.appliedAt,
        },
        {
            // collapsing: true,
            content: (application, _1, _2, { modalId, taskId }) => getUserIdBtn(
                application,
                modalId,
                taskId,
            ),
            key: 'userId',
            title: textsCap.applicant,
        },
        // {
        //     content: getAddressBtn,
        //     key: 'workerAddress',
        //     title: textsCap.identity,
        // },
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
            content: (application = {}, _i, _arr, { task = {}, taskId }) => (
                <Button {...{
                    icon: 'eye',
                    onClick: () => ApplicationView.asModal({
                        application,
                        task,
                        taskId,
                    }),
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
        task: {
            owner,
        } = {},
    } = props
    const { _status } = application
    const accepted = _status === applicationStatus[1]
    const rejected = _status === applicationStatus[2]
    const isOwner = owner && !!getIdentity(owner)
    const showAction = !accepted && isOwner
    if (!showAction) return (
        <Button basic fluid>
            {_status}
        </Button>
    )

    return (
        <div>
            <ButtonAcceptOrReject {...{
                acceptProps: { icon: 'check' },
                acceptText: isMobile
                    ? '' // hide text on mobile
                    : undefined,
                rejectProps: {
                    disabled: rejected,
                    icon: 'close',
                },
                rejectText: isMobile
                    ? '' // hide text on mobile
                    : undefined,
                onAction: handleActionCb(props, application),
                title: textsCap.accept,
            }} />
        </div>
    )
}

const getUserIdBtn = ({ name, userId, workerAddress }, modalId, taskId) => (
    <UserID {...{
        address: workerAddress,
        name,
        onChatOpen: () => closeModal([
            modalId,
            newId('application_', taskId),
            newId('applications_', taskId),
            newId('task_', taskId),
        ]),
        userId
    }} />
)

const handleActionCb = (props, application) => async (_, accept) => {
    const {
        forceReload,
        modalId,
        task = {},
        taskId,
    } = props
    const { owner } = task
    const {
        name,
        userId,
        workerAddress,
    } = application
    const confirmId = newId('confirm_', taskId)
    const handleResult = async (success, err) => {
        if (!success) return err && showInfo({
            collapsing: true,
            content: (
                <Message {...{
                    content: `${err || ''}`,
                    icon: true,
                    status: 'error',
                }} />
            ),
        })

        await PromisE.delay(300)

        isFn(forceReload) && forceReload()
        closeModal(modalId)
    }
    const data = {
        rejectOthers: true, // reject all other applications
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
        args: [data],
        description,
        func: queueableApis.marketApplyResponse,
        recordId: taskId,
        then: handleResult,
        title,
        type: QUEUE_TYPES.CHATCLIENT,
    }
    const addressBtn = getAddressBtn(application)

    if (accept) {
        // use the regular task form to create a new task and assignin to the applicant
        const childTask = {
            ...task,
            fulfiller: workerAddress,
            isMarket: false,
            parentId: taskId,
        }
        const taskFormProps = {
            closeOnSubmit: true, // close modal after successful submission
            header: title,
            inputsDisabled: Object
                .values(taskInputNames)
                // allow changing the deadline
                .filter(name => ![
                    taskInputNames.deadline,
                    taskInputNames.dueDate,
                ].includes(name)),
            onSubmit: success => success && addToQueue(offChain),
            purpose: 1, // to be included when notifying the user
            subheader: (
                <span>
                    {textsCap.applicant + ': '}
                    {userId
                        ? `@${userId}`
                        : addressBtn}
                </span>
            ),
            submitText: textsCap.acceptApplication,
            values: childTask,
        }
        const openTaskForm = () => showForm(
            TaskForm,
            taskFormProps,
            modalId,
        )
        // prompt to add worker as a partner
        if (!!getPartner(workerAddress)) return openTaskForm()

        return showForm(PartnerForm, {
            subheader: textsCap.addPartner,
            onSubmit: done => done && openTaskForm(),
            values: {
                [pInputNames.address]: workerAddress,
                [pInputNames.associatedIdentity]: owner,
                [pInputNames.name]: name,
                userId,
            },
            warnBackup: false,
        })
    }

    // confirm before rejecting application
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
                    <b>{textsCap.applicant}: </b><br />
                    {addressBtn}
                    {userId && (
                        <span>
                            {' '}
                            ({getUserIdBtn(application, modalId, taskId)})
                        </span>
                    )}
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
    const qid = addToQueue(offChain)
    await awaitComplete(qid)
}