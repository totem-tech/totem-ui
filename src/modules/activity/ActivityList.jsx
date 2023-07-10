import React from 'react'
import { Button } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import { findInput } from '../../components/FormBuilder'
import Text from '../../components/Text'
import { confirm, showForm, showInfo } from '../../services/modal'
import { addToQueue } from '../../services/queue'
import { translated } from '../../utils/languageHelper'
import { statuses, useIsMobile, useRxState } from '../../utils/reactjs'
import { textEllipsis } from '../../utils/utils'
import {
    openStatuses,
    queueables,
    statusCodes,
    statusTexts,
} from './activity'
import ActivityDetails from './ActivityDetails'
import ActivityForm from './ActivityForm'
import ActivityReassignForm from './ActivityReassignForm'
import ActivityTeamList from './ActivityTeamList'
import useActivities from './useActivities'

const textsCap = {
    areYouSure: 'are you sure?',
    actions: 'actions',
    activity: 'activity',
    activityTeam: 'activity team',
    close: 'close',
    closeActivity: 'close activity',
    create: 'create',
    delete: 'delete',
    deleteConfirmHeader: 'delete activities',
    deleteConfirmMsg1: 'you are about to delete the following activities:',
    deleteConfirmMsg2: `Warning: This action cannot be undone! 
        You will lose access to this Activity data forever! 
        A better option might be to archive the Activity.`,
    description: 'description',
    loading: 'loading...',
    name: 'name',
    proceed: 'proceed',
    reassignOwner: 're-assign owner',
    reopen: 're-open',
    reopenActivity: 're-open ativity',
    status: 'status',
    statusChangeWarning: 'you are about to change status of the following activities to:',
    totalTime: 'total time',
    unnamed: 'unnamed',
    viewDetails: 'view details',
    viewTeam: 'view team',
}
translated(textsCap, true)

const ActivityList = React.memo(props => {
    const {
        isMobile = useIsMobile()
    } = props
    const [state] = useRxState(getInitialState)
    const [activities] = useActivities()
    state.data = activities
    state.isMobile = isMobile
    state.emptyMessage = activities
        ? null
        : {
            content: textsCap.loading,
            icon: true,
            status: statuses.LOADING,
        }

    return <DataTable {...{ ...props, ...state }} />
})
export default ActivityList

const getInitialState = rxState => {
    const hideOnMobile = props => props?.isMobile === true
    const state = {
        data: new Map(),
        defaultSort: 'status',
        perPage: 5,
        onRowSelect: handleRowSelection(rxState),
        searchExtraKeys: [
            '_id',
            'ownerAddress',
            'ownerName',
            'userId',
            'status',
            '_statusText',
        ],
        selectable: true,
        columns: [
            {
                content: (activity, _1, _2, { isMobile } = {}) => {
                    const {
                        description,
                        name = textsCap.unnamed
                    } = activity
                    if (!isMobile) return name

                    return (
                        <div>
                            {name}
                            <Text {...{
                                children: (
                                    <small>
                                        {textEllipsis(
                                            description,
                                            64,
                                            3,
                                            false
                                        )}
                                    </small>
                                ),
                                color: 'grey',
                                El: 'div',
                                invertedColor: 'lightgrey',
                                style: { lineHeight: 1 },
                            }} />
                        </div>
                    )
                },
                draggableValueKey: 'name',
                key: 'name',
                title: textsCap.name,
                style: { minWidth: 125 }
            },
            {
                hidden: hideOnMobile,
                key: 'description',
                style: { whiteSpace: 'pre-wrap' },
                title: textsCap.description,
            },
            {
                collapsing: true,
                hidden: hideOnMobile,
                key: '_statusText',
                textAlign: 'center',
                title: textsCap.status
            },
            {
                collapsing: true,
                hidden: hideOnMobile,
                key: '_totalTime',
                textAlign: 'center',
                title: textsCap.totalTime,
            },
            {
                // No key required
                collapsing: true,
                content: (activity, activityId, _, { isMobile } = {}) => [
                    !isMobile && {
                        icon: { name: 'group' },
                        key: 'workers',
                        onClick: () => handleShowTeam(activityId, activity.name),
                        title: textsCap.viewTeam,
                    },
                    {
                        icon: { name: 'eye' },
                        key: 'detials',
                        onClick: () => ActivityDetails.asModal({
                            activity,
                            activityId,
                        }),
                        title: textsCap.viewDetails,
                    }
                ]
                    .filter(Boolean)
                    .map(btn => <Button {...btn} />),
                draggable: false,
                textAlign: 'center',
                title: textsCap.actions,
            },
        ],
        topLeftMenu: [{
            // create new activity button
            active: false,
            content: textsCap.create,
            icon: 'plus',
            name: 'create',
            onClick: () => showForm(ActivityForm)
        }],
        topRightMenu: [
            {
                // button to change status of activity to close or reopen
                active: false,
                content: textsCap.close, //Close/Reopen
                disabled: true,
                icon: 'toggle off',
                name: 'close',
                onClick: handleCloseReopen(rxState),
            },
            {
                active: false,
                content: textsCap.delete,
                disabled: true,
                icon: 'trash alternate',
                name: 'delete',
                onClick: handleDelete(rxState),
            },
            {
                active: false,
                content: textsCap.reassignOwner,
                icon: 'mail forward',
                name: 're-assign',
                onClick: handleReassignOwner(rxState),
            },
            // {
            //     active: false,
            //     content: textsCap.export,
            //     icon: 'file excel',
            //     name: 'export',
            //     onClick: () => alert('To be implemented')
            // },
        ]
    }
    return state
}

// either close or reopen activities.
// if all of the activities are open/repopened, then close otherwise reopens closed ones
const handleCloseReopen = rxState => activityIds => {
    const {
        data: activities,
        topRightMenu
    } = rxState.value
    const doClose = activityIds.every(id =>
        openStatuses.includes(
            activities.get(id)?.status
        )
    )
    const targetStatus = doClose
        ? statusCodes.close
        : statusCodes.reopen
    const targetStatusText = statusTexts[
        doClose
            ? statusCodes.close
            : statusCodes.reopen
    ]
    // const targetIds = selectedIds.reduce((recordIds, id) => {
    //     const { status } = activities.get(id) || {}
    //     const isOpen = openStatuses.includes(status)
    //     if (doClose && isOpen || !doClose && !isOpen) recordIds.push(id)
    //     return recordIds
    // }, [])
    const targetIds = activityIds.filter(id => {
        const isOpen = openStatuses.includes(
            activities.get(id)?.status
        )
        return doClose
            ? isOpen
            : !isOpen
    })

    confirm({
        content: (
            <div>
                {textsCap.statusChangeWarning}
                <b> {targetStatusText}</b>
                <ol>
                    {targetIds.map(id => (
                        <li key={id}>
                            {activities.get(id).name}
                        </li>
                    ))}
                </ol>
            </div>
        ),
        confirmButton: textsCap.proceed,
        header: textsCap.areYouSure,
        onConfirm: () => {
            targetIds.forEach(id => {
                const {
                    name,
                    ownerAddress,
                    status
                } = activities.get(id) || {}
                // ignore if activity is already at target status or activity no longer exists
                if (status === targetStatus || !name) return
                const statusCode = doClose
                    ? statusCodes.close
                    : statusCodes.reopen

                const queueItem = queueables.setStatus(
                    ownerAddress,
                    id,
                    statusCode,
                    {
                        title: doClose
                            ? textsCap.closeActivity
                            : textsCap.reopenActivity,
                        description: `${textsCap.activity}: ${name}`,
                        // useActivities() should auto update
                        // then: success => success && forceUpdate([id], ownerAddress),
                    }
                )
                addToQueue(queueItem)
            })

            const closeBtn = topRightMenu.find(x => x.name === 'close')
            closeBtn.content = doClose
                ? textsCap.reopen
                : textsCap.close
            rxState.next({ topRightMenu })
        },
        size: 'tiny',
    })
}

// delete activities
const handleDelete = rxState => activityIds => {
    const queueItems = []
    const names = []

    activityIds.forEach(activityId => {
        const { data: activities } = rxState.value
        const targetStatus = statusCodes.delete
        const activity = activities.get(activityId)
        const {
            name = textsCap.unnamed,
            ownerAddress,
            status
        } = activity || {}
        // ignore if activity is already at target status or activity not longer exists in the list
        if (status === targetStatus || !activity) return

        const queueItem = queueables.remove(
            ownerAddress,
            activityId,
            {
                title: textsCap.deleteConfirmHeader,
                description: `${textsCap.activity}: ${name}`,
                // useActivities should auto update
                // then: success => success && forceUpdate([activityId], ownerAddress),
            }
        )
        queueItems.push(queueItem)
        names.push(name)
    })

    queueItems.length > 0 && confirm({
        confirmButton: { color: 'red', content: textsCap.proceed },
        content: (
            <div>
                <h4>{textsCap.deleteConfirmMsg1}</h4>
                <ul>
                    {names.map((name, i) =>
                        <li key={name}>{name}</li>
                    )}
                </ul>
                <p style={{ color: 'red' }}>
                    {textsCap.deleteConfirmMsg2}
                </p>
            </div>
        ),
        header: textsCap.deleteConfirmHeader,
        // add each delete action as a separate item to the queue service
        onConfirm: () => queueItems.forEach(item => addToQueue(item)),
        size: 'mini',
    })
}

const handleReassignOwner = rxState => activityIds => {
    if (activityIds.length !== 1) return

    const { data: activities } = rxState.value
    const activityId = activityIds[0]
    const activity = activities.get(activityId)
    activity && showForm(ActivityReassignForm, {
        hash: activityId,
        values: activity,
    })
}

// on row select change close and reassign button texts (topLeftMenu)
const handleRowSelection = rxState => activityIds => {
    const {
        data: activities,
        topRightMenu
    } = rxState.value || {}
    const len = activityIds.length
    topRightMenu.forEach(x => { x.disabled = len === 0; return x })


    // If every selected activity status is 'open' or 're-opened change action to 'Close', otherwise 'Re-open'
    const closeBtn = findInput(topRightMenu, 'close')
    const doClose = activityIds.every(id =>
        openStatuses.includes(
            activities.get(id)?.status
        )
    )
    closeBtn.content = doClose
        ? textsCap.close
        : textsCap.reopen
    closeBtn.icon = `toggle ${doClose ? 'off' : 'on'}`
    const reAssignBtn = findInput(topRightMenu, 're-assign')
    reAssignBtn.disabled = len !== 1

    rxState.next({ topRightMenu })
}

// show activity team in a modal
const handleShowTeam = (activityId, activityName = textsCap.unnamed) => showInfo({
    content: <ActivityTeamList activityId={activityId} />,
    header: `${textsCap.activityTeam} - ${activityName}`,
})