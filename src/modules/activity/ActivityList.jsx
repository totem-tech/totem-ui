import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
import { copyToClipboard, isFn, textEllipsis } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import { statuses } from '../../components/Message'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { addToQueue } from '../../services/queue'
import { unsubscribe } from '../../services/react'
import { rxLayout, MOBILE } from '../../services/window'
import { getSelected } from '../identity/identity'
import TimekeepingList from '../timekeeping/TimekeepingList'
import { getProjects, openStatuses, query, statusCodes, queueables, forceUpdate } from './activity'
import ActivityForm from './ActivityForm'
import ActivityReassignForm from './ActivityReassignForm'
import ActivityTeamList from './ActivityTeamList'
import { ButtonGroup } from '../../components/buttons'
import Text from '../../components/Text'

const toBeImplemented = () => alert('To be implemented')
let textsCap = {
    actions: 'actions',
    activity: 'activity',
    abandoned: 'abandoned',
    blocks: 'blocks',
    cancelled: 'cancelled',
    close: 'close',
    closed: 'closed',
    create: 'create',
    delete: 'delete',
    deleted: 'deleted',
    description: 'description',
    export: 'export',
    name: 'name',
    never: 'never',
    onHold: 'On-hold',
    open: 'open',
    proceed: 'proceed',
    project: 'project',
    records: 'records',
    reopen: 're-open',
    reopened: 're-opened',
    status: 'status',
    team: 'team',
    timekeeping: 'timekeeping',
    update: 'update',
    unknown: 'unknown',
    unnamed: 'unnamed',

    areYouSure: 'are you sure?',
    closeProject: 'close activity',
    deleteConfirmMsg1: 'you are about to delete the following activities:',
    deleteConfirmMsg2: `Warning: This action cannot be undone! 
        You will lose access to this Activity data forever! 
        A better option might be to archive the Activity.`,
    deleteConfirmHeader: 'delete activities',
    detailsNameLabel: 'activity name',
    detailsRecordIdLabel: 'activity ID',
    detailsDescLabel: 'description of activity',
    detailsTotalTimeLabel: 'total time',
    detailsStatusLabel: 'activity status',
    detailsFirstSeenLabel: 'activity first used on (this date)',
    detailsFormHeader: 'activity details',
    detailsTimeRecordsBtn: 'view time records',
    editProject: 'update activity',
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
            searchExtraKeys: ['ownerAddress', 'status', '_statusText'],
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
                            !isMobile && {
                                key: 'edit',
                                icon: 'pencil',
                                onClick: () => showForm(ActivityForm, { hash: recordId, values: project }),
                                title: textsCap.editProject,
                            },
                            !isMobile && {
                                icon: { name: 'group' },
                                key: 'workers',
                                onClick: () => this.showTeam(recordId, project.name),
                                title: textsCap.viewTeam,
                            },
                            {
                                icon: { name: 'eye' },
                                key: 'detials',
                                onClick: () => this.showDetails(project, recordId),
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
                {
                    active: false,
                    content: textsCap.export,
                    icon: 'file excel',
                    name: 'export',
                    onClick: toBeImplemented
                },
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
                        project._totalTime = `${totalBlocks} ${textsCap.blocks}`
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
                    header: textsCap.projectsFailed, content: `${err}`
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
            confirmButton: textsCap.procees,
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
        if (selectedIds.length !== 1) return;
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
        const exportBtn = findInput(topRightMenu, 'export')
        exportBtn.disabled = len !== projects.size

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
    showTeam = (recordId, projectName) => confirm({
        cancelButton: null,
        confirmButton: null,
        content: <ActivityTeamList projectHash={recordId} />,
        header: `${textsCap.projectTeam} - ${projectName}`,
    })

    // show project details in a read-only modal form
    showDetails = (project, recordId) => {
        const { isMobile } = this.state
        const data = { ...project }
        data.recordId = textEllipsis(recordId, 23)
        data._firstSeen = data.firstSeen ? data.firstSeen : textsCap.never
        const labels = {
            name: textsCap.detailsNameLabel,
            recordId: textsCap.detailsRecordIdLabel,
            description: textsCap.detailsDescLabel,
            _totalTime: textsCap.detailsTotalTimeLabel,
            _statusText: textsCap.detailsStatusLabel,
            _firstSeen: textsCap.detailsFirstSeenLabel
        }
        // Create a form on the fly and display data a read-only input fields
        const getContent = (mobile, desktop = mobile) => {
            const El = isMobile
                ? 'div'
                : 'span'
            return <El>{isMobile ? mobile : desktop}</El>
        }
        const btnRecords = {
            // view time records button
            content: getContent(
                textsCap.records,
                textsCap.detailsTimeRecordsBtn,
            ),
            icon: 'clock outline',
            key: 'records',
            name: 'records',
            onClick: () => confirm({
                cancelButton: textsCap.close,
                confirmButton: null,
                content: <TimekeepingList {...{
                    isOwner: true,
                    manage: true,
                    projectHash: recordId,
                    projectName: project.name,
                    ownerAddress: project.ownerAddress,
                }} />,
                header: `${project.name}: ${textsCap.timekeeping}`,
            }),
            type: 'Button',
        }
        const btnTeam = {
            content: getContent(
                textsCap.team,
                textsCap.viewTeam,
            ),
            icon: { name: 'group' },
            key: 'workers',
            onClick: () => this.showTeam(recordId, project.name),
            title: textsCap.viewTeam,
        }
        const btnEdit = {
            content: getContent(
                textsCap.update,
                textsCap.editProject,
            ),
            key: 'edit',
            icon: 'pencil',
            onClick: () => showForm(ActivityForm, { hash: recordId, values: project }),
            title: textsCap.editProject,
        }
        const btnGroup = {
            basic: true,
            buttons: [btnTeam, btnRecords, btnEdit],
            El: ButtonGroup,
            fluid: true,
            name: 'buttons',
            type: 'button',
            // vertical: isMobile,
        }
        showForm(FormBuilder, {
            closeOnEscape: true,
            closeOnDimmerClick: true,
            closeText: null,
            header: textsCap.detailsFormHeader,
            inputs: Object
                .keys(labels)
                .map(key => ({
                    action: key !== 'recordId'
                        ? undefined
                        : {
                            icon: 'copy',
                            onClick: () => copyToClipboard(recordId),
                        },
                    label: labels[key],
                    name: key,
                    readOnly: true,
                    type: key === 'description'
                        ? 'textarea'
                        : 'text',
                    value: data[key]
                }))
                .concat(btnGroup),
            size: 'tiny',
            submitText: null
        })
    }

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