import React, { Component } from 'react'
import { Bond } from 'oo7'
import { Button } from 'semantic-ui-react'
import { copyToClipboard, textEllipsis } from '../utils/utils'
// components
import DataTable from '../components/DataTable'
import FormBuilder, { findInput } from '../components/FormBuilder'
import ProjectTeamList from '../lists/ProjectTeamList'
import TimeKeepingList from '../lists/TimeKeepingList'
import ProjectForm from '../forms/Project'
import ReassignProjectForm from '../forms/ProjectReassign'
// services
import { translated } from '../services/language'
import { confirm, showForm } from '../services/modal'
import { addToQueue } from '../services/queue'
import projectService, { getProjects, getProjectsBond, openStatuses, statusCodes, tasks } from '../services/project'
import { layoutBond, getLayout } from '../services/window'

const toBeImplemented = () => alert('To be implemented')
const [words, wordsCap] = translated({
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
    reopen: 're-open',
    reopened: 're-opened',
    status: 'status',
    timekeeping: 'timekeeping',
    unknown: 'unknown',
}, true)
const [texts] = translated({
    areYouSure: 'Are you sure?',
    closeProject: 'Close activity',
    deleteConfirmMsg1: 'You are about to delete the following Activities:',
    deleteConfirmMsg2: `Warning: This action cannot be undone! 
        You will lose access to this Activity data forever! 
        A better option might be to archive the Activity.`,
    deleteConfirmHeader: 'Delete Activities',
    detailsNameLabel: 'Activity Name',
    detailsHashLabel: 'Activity Unique ID',
    detailsDescLabel: 'Description of Activity',
    detailsTotalTimeLabel: 'Total Time',
    detailsStatusLabel: 'Activity Status',
    detailsFirstSeenLabel: 'Activity First Used On (this date)',
    detailsFormHeader: 'Activity Details',
    detailsTimeRecordsBtn: 'View Time Records',
    editProject: 'Edit Activity',
    projectCloseReopenWarning: 'You are about to change status of the following Activities to:',
    projectTeam: 'Activity team',
    reassignOwner: 'Re-assign owner',
    reopenProject: 'Re-open activity',
    totalTime: 'Total Time',
    viewDetails: 'View Details',
    viewTeam: 'View Team',
})
const statusTexts = []
statusTexts[statusCodes.open] = wordsCap.open
statusTexts[statusCodes.reopen] = wordsCap.reopened
statusTexts[statusCodes.onHold] = wordsCap.onHold
statusTexts[statusCodes.abandon] = wordsCap.abandoned
statusTexts[statusCodes.cancel] = wordsCap.canceled
statusTexts[statusCodes.close] = wordsCap.closed
statusTexts[statusCodes.delete] = wordsCap.deleted

export default class ProjectList extends Component {
    constructor(props) {
        super(props)

        this.state = {
            emptyMessage: null,
            data: new Map(),
            defaultSort: 'status',
            perPage: 5,
            onRowSelect: this.handleRowSelection,
            searchExtraKeys: ['ownerAddress', 'status', '_statusText'],
            selectable: true,
            columns: [
                {
                    key: 'name',
                    title: wordsCap.name
                },
                {
                    hidden: true,
                    key: 'description',
                    style: { whiteSpace: 'pre-wrap' },
                    title: wordsCap.description,
                },
                {
                    collapsing: true,
                    key: '_statusText',
                    textAlign: 'center',
                    title: wordsCap.status
                },
                {
                    collapsing: true,
                    key: '_totalTime',
                    textAlign: 'center',
                    title: texts.totalTime,
                },
                {
                    // No key required
                    collapsing: true,
                    content: (project, hash) => ([
                        {
                            key: 'edit',
                            icon: 'pencil',
                            onClick: () => showForm(ProjectForm, { hash, values: project }),
                            title: texts.editProject,
                        },
                        {
                            icon: { name: 'group' },
                            key: 'workers',
                            onClick: () => this.showTeam(hash, project.name),
                            title: texts.viewTeam,
                        },
                        {
                            icon: { name: 'eye' },
                            key: 'detials',
                            onClick: () => this.showDetails(project, hash),
                            title: texts.viewDetails,
                        }
                    ]).map(props => <Button {...props} />),
                    draggable: false,
                    textAlign: 'center',
                    title: wordsCap.actions,
                },
            ],
            topLeftMenu: [{
                active: false,
                content: wordsCap.create,
                icon: 'plus',
                name: 'create',
                onClick: () => showForm(ProjectForm)
            }],
            topRightMenu: [
                {
                    active: false,
                    content: wordsCap.close, //Close/Reopen
                    disabled: true,
                    icon: 'toggle off',
                    name: 'close',
                    onClick: this.handleCloseReopen,
                },
                {
                    active: false,
                    content: wordsCap.delete,
                    disabled: true,
                    icon: 'trash alternate',
                    name: 'delete',
                    onClick: this.handleDelete,
                },
                {
                    active: false,
                    content: texts.reassignOwner,
                    icon: 'mail forward',
                    name: 're-assign',
                    onClick: this.handleReassignOwner,
                },
                {
                    active: false,
                    content: wordsCap.export,
                    icon: 'file excel',
                    name: 'export',
                    onClick: toBeImplemented
                },
            ]
        }
    }

    componentWillMount() {
        // reload projects whenever any of the bond's value updates
        this.tieId = getProjectsBond.tie(() => this.loadProjects())
        this.tieIdLayout = layoutBond.tie(() => {
            const { columns } = this.state
            // hide on mobile
            columns.find(x => x.key === 'description').hidden = getLayout() === 'mobile'
            this.setState({ columns })
        })
    }

    componentWillUnmount() {
        // unsubscribe from updates
        getProjectsBond.untie(this.tieId)
        layoutBond.untie(this.tieIdLayout)
        if (this.statusBond) this.statusBond.untie(this.statusTieId);
    }

    // either close or reopen projects
    // if all of the projects are open/repopened, then close otherwise reopens closed ones
    handleCloseReopen = selectedHashes => {
        const { data: projects, topRightMenu } = this.state
        const doClose = selectedHashes.every(key => openStatuses.indexOf((projects.get(key) || {}).status) >= 0)
        const targetStatus = doClose ? statusCodes.close : statusCodes.reopen
        const targetStatusText = statusTexts[doClose ? statusCodes.close : statusCodes.reopen]
        const targetHashes = selectedHashes.reduce((hashArr, hash) => {
            const { status } = projects.get(hash) || {}
            const isOpen = openStatuses.includes(status)
            if (doClose && isOpen || !doClose && !isOpen) hashArr.push(hash)
            return hashArr
        }, [])

        confirm({
            content: (
                <div>
                    {texts.projectCloseReopenWarning} <b>{targetStatusText}</b>
                    <ol>{targetHashes.map(hash => <li key={hash}>{projects.get(hash).name}</li>)}</ol>
                </div>
            ),
            confirmButton: wordsCap.procees,
            header: texts.areYouSure,
            onConfirm: () => {
                targetHashes.forEach(hash => {
                    const { name, ownerAddress, status } = projects.get(hash) || {}
                    // ignore if project is already at target status or project no longer exists
                    if (status === targetStatus || !name) return;
                    const taskFn = doClose ? tasks.close : tasks.reopen
                    addToQueue(taskFn(ownerAddress, hash, {
                        title: doClose ? texts.closeProject : texts.reopenProject,
                        description: `${wordsCap.activity}: ${name}`,
                        then: success => success && getProjects(true),
                    }))
                })

                const menuItemText = doClose ? wordsCap.reopen : wordsCap.close
                topRightMenu.find(x => x.name === 'close').content = menuItemText
                this.setState({ topRightMenu })
            }
        })
    }

    handleDelete = selectedHashes => {
        const queueItems = []
        const projectNames = []
        selectedHashes.forEach(hash => {
            const { data: projects } = this.state
            const targetStatus = statusCodes.delete
            const { name, ownerAddress, status } = projects.get(hash) || {}
            // ignore if project is already at target status or project not longer exists in the list
            if (status === targetStatus || !name) return;
            projectNames.push(name)
            queueItems.push(tasks.remove(ownerAddress, hash, {
                title: texts.deleteConfirmHeader,
                description: `${wordsCap.activity}: ${name}`,
                then: success => success && getProjects(true),
            }))
        })
        if (projectNames.length === 0) return
        confirm({
            confirmButton: { color: 'red', content: wordsCap.proceed },
            content: (
                <div>
                    <h4>{texts.deleteConfirmMsg1}</h4>
                    <ul>{projectNames.map((name, i) => <li key={i}>{name}</li>)}</ul>
                    <p style={{ color: 'red' }}>{texts.deleteConfirmMsg2}</p>
                </div>
            ),
            header: texts.deleteConfirmHeader,
            onConfirm: () => queueItems.forEach(item => addToQueue(item)),
            size: 'mini',
        })
    }

    handleReassignOwner = selectedHashes => {
        if (selectedHashes.length !== 1) return;
        const { data: projects } = this.state
        const hash = selectedHashes[0]
        const project = projects.get(hash)
        project && showForm(ReassignProjectForm, { hash, values: project })
    }

    handleRowSelection = selectedHashes => {
        const { data: projects, topRightMenu } = this.state
        const len = selectedHashes.length
        topRightMenu.forEach(x => { x.disabled = len === 0; return x })

        // Enable export button only when all projects are selected
        const exportBtn = findInput(topRightMenu, 'export')
        exportBtn.disabled = len !== projects.size

        // If every selected project's status is 'open' or 're-opened change action to 'Close', otherwise 'Re-open'
        const closeBtn = findInput(topRightMenu, 'close')
        const doClose = selectedHashes.every(key => openStatuses.indexOf(projects.get(key).status) >= 0)
        closeBtn.content = doClose ? wordsCap.close : wordsCap.reopen
        closeBtn.icon = `toggle ${doClose ? 'off' : 'on'}`
        findInput(topRightMenu, 're-assign').disabled = len !== 1

        this.setState({ topRightMenu })
    }

    loadProjects = force => getProjects(force).then(projects => {
        const hashes = Array.from(projects).map(([hash, project]) => {
            const { status, totalBlocks } = project
            project._hash = hash
            project._statusText = statusTexts[status] || words.unknown
            project._totalTime = `${totalBlocks} ${words.blocks}`
            return hash
        })
        this.setStatusBond(hashes)
        this.setState({ data: projects })
    }, console.log)

    // ToDo: re-evaluate
    // Reload project list whenever status of any of the projects changes
    setStatusBond(hashes) {
        // return if all the hashes are the same as the ones from previous call
        if (JSON.stringify(this.hashes) === JSON.stringify(hashes)) return;
        this.hashes = hashes
        // untie existing bond
        if (this.statusBond && this.statusTieId) this.statusBond.untie(this.statusTieId);
        this.statusBond = Bond.all(this.hashes.map(hash => projectService.status(hash)))
        this.statusTieId = this.statusBond.tie((statusCodes) => {
            // return if all status codes received are exactly same as previously set ones
            if (JSON.stringify(this.statusCodes) === JSON.stringify(statusCodes)) return
            this.statusCodes = statusCodes
            this.loadProjects(true)
        })
    }

    // show project team in a modal
    showTeam = (hash, projectName) => confirm({
        cancelButton: wordsCap.close,
        confirmButton: null,
        content: <ProjectTeamList projectHash={hash} />,
        header: `${texts.projectTeam} - ${projectName}`,
    })

    // show project details in a read-only modal form
    showDetails = (project, hash) => {
        const data = { ...project }
        data._hash = textEllipsis(hash, 23)
        data._firstSeen = data.firstSeen ? data.firstSeen : words.never
        const labels = {
            name: texts.detailsNameLabel,
            _hash: texts.detailsHashLabel,
            description: texts.detailsDescLabel,
            _totalTime: texts.detailsTotalTimeLabel,
            _statusText: texts.detailsStatusLabel,
            _firstSeen: texts.detailsFirstSeenLabel
        }
        // Create a form on the fly and display data a read-only input fields
        showForm(FormBuilder, {
            closeOnEscape: true,
            closeOnDimmerClick: true,
            closeText: wordsCap.close,
            header: texts.detailsFormHeader,
            inputs: Object.keys(labels).map(key => ({
                action: key !== '_hash' ? undefined : { icon: 'copy', onClick: () => copyToClipboard(hash) },
                label: labels[key],
                name: key,
                readOnly: true,
                type: key === 'description' ? 'textarea' : 'text',
                value: data[key]
            })).concat({
                // view time records button
                content: texts.detailsTimeRecordsBtn,
                name: 'button',
                onClick: () => confirm({
                    cancelButton: wordsCap.close,
                    confirmButton: null,
                    content: <TimeKeepingList {...{
                        isOwner: true,
                        manage: true,
                        projectHash: hash,
                        projectName: project.name,
                        ownerAddress: project.ownerAddress,
                    }} />,
                    header: `${project.name}: ${wordsCap.timekeeping}`,
                }),
                type: 'Button',
            }),
            size: 'tiny',
            submitText: null
        })
    }

    render = () => <DataTable {...{ ...this.props, ...this.state }} />
}