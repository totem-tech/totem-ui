import React, { Component } from 'react'
import {
    isFn,
    textEllipsis,
} from '../../utils/utils'
import { Button } from '../../components/buttons'
import DataTable from '../../components/DataTable'
import { findInput } from '../../components/FormBuilder'
import { statuses } from '../../components/Message'
import Text from '../../components/Text'
import { translated } from '../../utils/languageHelper'
import { confirm, showForm, showInfo } from '../../services/modal'
import { addToQueue } from '../../services/queue'
import { unsubscribe } from '../../utils/reactHelper'
import { rxLayout, MOBILE } from '../../services/window'
import { getSelected } from '../identity/identity'
import { blocksToDuration } from '../timekeeping/timekeeping'
import {
    getProjects,
    openStatuses,
    query,
    statusCodes,
    queueables,
    forceUpdate,
} from './activity'
import ActivityDetails from './ActivityDetails'
import ActivityForm from './ActivityForm'
import ActivityReassignForm from './ActivityReassignForm'
import ActivityTeamList from './ActivityTeamList'

let textsCap = {
    actions: 'actions',
    activity: 'activity',
    abandoned: 'abandoned',
    close: 'close',
    closed: 'closed',
    create: 'create',
    delete: 'delete',
    deleted: 'deleted',
    description: 'description',
    export: 'export',
    name: 'name',
    onHold: 'On-hold',
    open: 'open',
    proceed: 'proceed',
    reopen: 're-open',
    reopened: 're-opened',
    status: 'status',
    unknown: 'unknown',
    unnamed: 'unnamed',

    areYouSure: 'are you sure?',
    closeProject: 'close activity',
    deleteConfirmMsg1: 'you are about to delete the following activities:',
    deleteConfirmMsg2: `Warning: This action cannot be undone! 
        You will lose access to this Activity data forever! 
        A better option might be to archive the Activity.`,
    deleteConfirmHeader: 'delete activities',

    loading: 'loading...',
    projectsFailed: 'failed to retrieve activities',
    projectCloseReopenWarning: 'you are about to change status of the following activities to:',
    projectTeam: 'activity team',
    reassignOwner: 're-assign owner',
    reopenProject: 're-open ativity',
    totalTime: 'total time',
    viewDetails: 'view details',
    viewTeam: 'view team',
}
textsCap = translated(textsCap, true)[1]
const statusTexts = []
statusTexts[statusCodes.open] = textsCap.open
statusTexts[statusCodes.reopen] = textsCap.reopened
statusTexts[statusCodes.onHold] = textsCap.onHold
statusTexts[statusCodes.abandon] = textsCap.abandoned
statusTexts[statusCodes.cancel] = textsCap.canceled
statusTexts[statusCodes.close] = textsCap.closed
statusTexts[statusCodes.delete] = textsCap.deleted

export default class ActivityList extends Component {
    constructor(props) {
        super(props)

        this.state = {
            emptyMessage: {
                content: textsCap.loading,
                icon: true,
                status: statuses.LOADING,
            },
            data: new Map(),
            defaultSort: 'status',
            perPage: 5,
            onRowSelect: this.handleRowSelection,
            searchExtraKeys: [
                'description',
                'ownerAddress',
                'status',
                '_statusText',
            ],
            selectable: true,
            columns: [
                {
                    content: ({ description, name = textsCap.unnamed }) => !this.state.isMobile
                        ? name 
                        : (
                            <div>
                                {name}
                                <Text {...{
                                    children: <small>{textEllipsis(description, 64, 3, false)}</small>,
                                    color: 'grey',
                                    El: 'div',
                                    invertedColor: 'lightgrey',
                                    style: { lineHeight: 1 },
                                }} />
                            </div>
                        ),
                    draggableValueKey: 'name',
                    key: 'name',
                    title: textsCap.name,
                    style: { minWidth: 125 }
                },
                {
                    hidden: () => this.state.isMobile,
                    key: 'description',
                    style: { whiteSpace: 'pre-wrap' },
                    title: textsCap.description,
                },
                {
                    collapsing: true,
                    hidden: () => this.state.isMobile,
                    key: '_statusText',
                    textAlign: 'center',
                    title: textsCap.status
                },
                {
                    collapsing: true,
                    hidden: () => this.state.isMobile,
                    key: '_totalTime',
                    textAlign: 'center',
                    title: textsCap.totalTime,
                },
                {
                    // No key required
                    collapsing: true,
                    content: (project, recordId) => {
                        const { isMobile } = this.state
                        return [
                            // !isMobile && {
                            //     key: 'edit',
                            //     icon: 'pencil',
                            //     onClick: () => showForm(ActivityForm, { hash: recordId, values: project }),
                            //     title: textsCap.editProject,
                            // },
                            !isMobile && {
                                icon: { name: 'group' },
                                key: 'workers',
                                onClick: () => this.showTeam(recordId, project.name),
                                title: textsCap.viewTeam,
                            },
                            {
                                icon: { name: 'eye' },
                                key: 'detials',
                                onClick: () => ActivityDetails
                                    .asModal({ id: recordId, project }),
                                title: textsCap.viewDetails,
                            }
                        ]
                            .filter(Boolean)
                            .map(props => <Button {...props} />)
                    },
                    draggable: false,
                    textAlign: 'center',
                    title: textsCap.actions,
                },
            ],
            topLeftMenu: [{
                active: false,
                content: textsCap.create,
                icon: 'plus',
                name: 'create',
                onClick: () => showForm(ActivityForm)
            }],
            topRightMenu: [
                {
                    active: false,
                    content: textsCap.close, //Close/Reopen
                    disabled: true,
                    icon: 'toggle off',
                    name: 'close',
                    onClick: this.handleCloseReopen,
                },
                {
                    active: false,
                    content: textsCap.delete,
                    disabled: true,
                    icon: 'trash alternate',
                    name: 'delete',
                    onClick: this.handleDelete,
                },
                {
                    active: false,
                    content: textsCap.reassignOwner,
                    icon: 'mail forward',
                    name: 're-assign',
                    onClick: this.handleReassignOwner,
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

        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    async componentWillMount() {
        this._mounted = true
        this.subscriptions = {
            projects: null,
            status: null,
        }
        this.subscriptions.layout = rxLayout.subscribe(l => 
            this.setState({
                isMobile: l === MOBILE,
            })
        )
        try {
            this.subscriptions.project = await getProjects(true, projects => {
                if (!this._mounted) return
                const recordIds = Array.from(projects)
                    .map(([recordId, project]) => {
                        const { status, totalBlocks } = project
                        project.recordId = recordId
                        project._statusText = statusTexts[status] || textsCap.unknown
                        project._totalTime = blocksToDuration(totalBlocks)
                        return recordId
                    })
                this.subscribeToStatusChanges(
                    recordIds,
                    getSelected().address,
                )
                this.setState({
                    emptyMessage: null,
                    data: projects,
                    loaded: true,
                })
            })
        } catch (err) {
            this.setState({
                emptyMessage: {
                    content: `${err}`,
                    header: textsCap.projectsFailed,
                }
            })
        }
    }

    componentWillUnmount() {
        this._mounted = false
        // unsubscribe from updates
        unsubscribe(this.subscriptions)
    }

    // either close or reopen projects
    // if all of the projects are open/repopened, then close otherwise reopens closed ones
    handleCloseReopen = selectedIds => {
        const { data: projects, topRightMenu } = this.state
        const doClose = selectedIds.every(key => openStatuses.indexOf((projects.get(key) || {}).status) >= 0)
        const targetStatus = doClose ? statusCodes.close : statusCodes.reopen
        const targetStatusText = statusTexts[doClose ? statusCodes.close : statusCodes.reopen]
        const targetIds = selectedIds.reduce((recordIds, id) => {
            const { status } = projects.get(id) || {}
            const isOpen = openStatuses.includes(status)
            if (doClose && isOpen || !doClose && !isOpen) recordIds.push(id)
            return recordIds
        }, [])

        confirm({
            content: (
                <div>
                    {textsCap.projectCloseReopenWarning} <b>{targetStatusText}</b>
                    <ol>{targetIds.map(id => <li key={id}>{projects.get(id).name}</li>)}</ol>
                </div>
            ),
            confirmButton: textsCap.proceed,
            header: textsCap.areYouSure,
            onConfirm: () => {
                targetIds.forEach(recordId => {
                    const { name, ownerAddress, status } = projects.get(recordId) || {}
                    // ignore if project is already at target status or project no longer exists
                    if (status === targetStatus || !name) return;
                    const statusCode = doClose ? statusCodes.close : statusCodes.reopen
                    addToQueue(queueables.setStatus(ownerAddress, recordId, statusCode, {
                        title: doClose ? textsCap.closeProject : textsCap.reopenProject,
                        description: `${textsCap.activity}: ${name}`,
                        then: success => success && forceUpdate([recordId], ownerAddress),
                    }))
                })

                const menuItemText = doClose ? textsCap.reopen : textsCap.close
                topRightMenu.find(x => x.name === 'close').content = menuItemText
                this.setState({ topRightMenu })
            }
        })
    }

    handleDelete = selectedIds => {
        const queueItems = []
        const projectNames = []
        selectedIds.forEach(recordId => {
            const { data: projects } = this.state
            const targetStatus = statusCodes.delete
            const { name, ownerAddress, status } = projects.get(recordId) || {}
            // ignore if project is already at target status or project not longer exists in the list
            if (status === targetStatus || !name) return;
            projectNames.push(name)
            queueItems.push(queueables.remove(ownerAddress, recordId, {
                title: textsCap.deleteConfirmHeader,
                description: `${textsCap.activity}: ${name}`,
                then: success => success && forceUpdate([recordId], ownerAddress),
            }))
        })
        if (projectNames.length === 0) return
        confirm({
            confirmButton: { color: 'red', content: textsCap.proceed },
            content: (
                <div>
                    <h4>{textsCap.deleteConfirmMsg1}</h4>
                    <ul>{projectNames.map((name, i) => <li key={i}>{name}</li>)}</ul>
                    <p style={{ color: 'red' }}>{textsCap.deleteConfirmMsg2}</p>
                </div>
            ),
            header: textsCap.deleteConfirmHeader,
            onConfirm: () => queueItems.forEach(item => addToQueue(item)),
            size: 'mini',
        })
    }

    handleReassignOwner = selectedIds => {
        if (selectedIds.length !== 1) return
        const { data: projects } = this.state
        const recordId = selectedIds[0]
        const project = projects.get(recordId)
        project && showForm(ActivityReassignForm, { hash: recordId, values: project })
    }

    handleRowSelection = selectedIds => {
        const { data: projects, topRightMenu } = this.state
        const len = selectedIds.length
        topRightMenu.forEach(x => { x.disabled = len === 0; return x })

        // Enable export button only when all projects are selected
        // const exportBtn = findInput(topRightMenu, 'export')
        // exportBtn.disabled = len !== projects.size

        // If every selected project's status is 'open' or 're-opened change action to 'Close', otherwise 'Re-open'
        const closeBtn = findInput(topRightMenu, 'close')
        const doClose = selectedIds.every(key => openStatuses.indexOf(projects.get(key).status) >= 0)
        closeBtn.content = doClose ? textsCap.close : textsCap.reopen
        closeBtn.icon = `toggle ${doClose ? 'off' : 'on'}`
        findInput(topRightMenu, 're-assign').disabled = len !== 1

        this.setState({ topRightMenu })
    }

    // ToDo: re-evaluate
    // Reload project list whenever status of any of the projects changes
    subscribeToStatusChanges = async (recordIds, ownerAddress) => {
        recordIds = recordIds.sort()
        // return if all the Record Ids are the same as the ones from previous call
        if (JSON.stringify(this.recordIds) === JSON.stringify(recordIds)) return
        this.recordIds = recordIds
        unsubscribe({ x: this.subscriptions.status })
        const updateStatus = (statusCodes) => {
            // return if all status codes received are exactly same as previously set ones
            if (JSON.stringify(this.statusCodes) === JSON.stringify(statusCodes)) return
            this.statusCodes = statusCodes
            // update update project details
            forceUpdate(recordIds, ownerAddress)
        }
        this.subscriptions.status = await query.status(this.recordIds, updateStatus, true)
    }

    // show project team in a modal
    showTeam = (recordId, projectName) => showInfo({
        content: <ActivityTeamList projectHash={recordId} />,
        header: `${textsCap.projectTeam} - ${projectName}`,
    })

    render = () => (
        <DataTable {...{
            ...this.props,
            ...this.state,
            columns: this.state.columns.map(column => ({
                ...column,
                hidden: isFn(column.hidden)
                    ? column.hidden()
                    : column.hidden
            }))
        }} />
    )
}