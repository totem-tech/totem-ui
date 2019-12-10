import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { pretty } from 'oo7-substrate'
import { Button } from 'semantic-ui-react'
import ListFactory from '../components/ListFactory'
import FormBuilder, { findInput } from '../components/FormBuilder'
import ProjectForm, { ReassignProjectForm } from '../forms/Project'
import { deferred, objCopy, textEllipsis, copyToClipboard } from '../utils/utils'
import { formatStrTimestamp } from '../utils/time'
import client from '../services/ChatClient'
import identityService from '../services/identity'
import { confirm, showForm } from '../services/modal'
import { addToQueue } from '../services/queue'
import addressbook from '../services/partners'
import projectService, { getProjects } from '../services/project'
import { layoutBond } from '../services/window'

const toBeImplemented = () => alert('To be implemented')

const statusTexts = []
statusTexts[0] = 'Open'
statusTexts[100] = 'Re-opened'
statusTexts[200] = 'On-hold'
statusTexts[300] = 'Abandoned'
statusTexts[400] = 'Canceled'
statusTexts[500] = 'Closed'
statusTexts[999] = 'Deleted'
const statusCodes = {
    open: 0,
    reopen: 100,
    close: 500,
    delete: 999,
}

export default class ProjectList extends ReactiveComponent {
    constructor(props) {
        super(props, { layout: layoutBond })

        this.loadProjects = deferred(this.loadProjects, 100, this)
        this.state = {
            projects: new Map(),
            emptyMessage: {},
            topLeftMenu: [
                {
                    active: false,
                    content: 'Create',
                    icon: 'plus',
                    name: 'create',
                    onClick: () => showForm(
                        ProjectForm,
                        { modal: true, onSubmit: (e, v, success) => success && this.loadProjects() }
                    )
                }
            ],
            topRightMenu: [
                {
                    active: false,
                    name: 'close',
                    content: 'Close', //Close/Reopen
                    disabled: true,
                    icon: 'toggle off',
                    onClick: this.handleCloseReopen.bind(this),
                },
                {
                    active: false,
                    name: 'delete',
                    content: 'Delete',
                    disabled: true,
                    icon: 'trash alternate',
                    onClick: this.handleDelete.bind(this),
                },
                {
                    active: false,
                    content: 'Re-assign owner',
                    icon: 'mail forward',
                    name: 're-assign',
                    onClick: this.handleReassignOwner.bind(this),
                },
                {
                    active: false,
                    content: 'Export',
                    icon: 'file excel',
                    name: 'export',
                    onClick: toBeImplemented
                },
            ]
        }
    }

    componentWillMount() {
        const { address } = identityService.getSelected()
        this.bond = Bond.all([
            addressbook.bond,
            identityService.bond,
            projectService.listByOwner(address)
        ])
        // reload projects whenever any of the bond's value updates
        this.tieId = this.bond.tie(() => this.loadProjects())
        this.loadProjects()
    }

    componentWillUnmount() {
        // unsubscribe from updates
        this.bond.untie(this.tieId)
        if (this.statusBond) this.statusBond.untie(this.statusTieId);
    }

    // either close or reopen projects
    // if all of the projects are open/repopened, then close otherwise reopens closed ones
    handleCloseReopen(selectedHashes) {
        const { projects, topRightMenu } = this.state
        const doClose = selectedHashes.every(key => [0, 1].indexOf((projects.get(key) || {}).status) >= 0)
        const targetStatus = doClose ? statusCodes.close : statusCodes.reopen
        const func = `${doClose ? 'close' : 'reopen'}Project`
        selectedHashes.forEach(hash => {
            const { name, ownerAddress, status } = projects.get(hash) || {}
            // ignore if project is already at target status or project no longer exists
            if (status === targetStatus || !name) return;
            addToQueue({
                type: 'blockchain',
                func,
                args: [ownerAddress, hash],
                address: ownerAddress,
                title: `${doClose ? 'Close' : 'Re-open'} project`,
                description: `Name: ${name}`,
                next: {
                    type: 'chatclient',
                    func: 'projectStatus',
                    args: [
                        hash,
                        targetStatus,
                        err => !err //&& this.loadProjects()
                    ]
                }
            })
        })

        topRightMenu.find(x => x.name === 'close').content = doClose ? 'Re-open' : 'Close'
        this.setState({ topRightMenu })
    }

    handleDelete(selectedHashes) {
        const queueItems = []
        const projectNames = []
        selectedHashes.forEach(hash => {
            const { projects } = this.state
            const targetStatus = statusCodes.delete
            const { name, ownerAddress, status } = projects.get(hash) || {}
            // ignore if project is already at target status or project not longer exists in the list
            if (status === targetStatus || !name) return;
            projectNames.push(name)
            queueItems.push({
                type: 'blockchain',
                func: 'removeProject',
                args: [ownerAddress, hash],
                address: ownerAddress,
                title: `Delete project`,
                description: `Name: ${name}`,
                next: {
                    type: 'chatclient',
                    func: 'projectStatus',
                    args: [
                        hash,
                        targetStatus,
                    ]
                }
            })
        })
        if (projectNames.length === 0) return
        const s = projectNames.length > 1 ? 's' : ''
        confirm({
            content: (
                <div>
                    <h4>You are about to delete the following project{s}:</h4>
                    <p>
                        This action cannot be undone! You will lose access to this project data forever! A better option might be to change the project status.
                    </p>
                    <ul>
                        {projectNames.map((name, i) => <li key={i}>{name}</li>)}
                    </ul>
                </div>
            ),
            header: 'Delete project' + s,
            onConfirm: () => queueItems.forEach(item => addToQueue(item)),
            size: 'mini',
        })
    }

    handleReassignOwner(selectedHashes = []) {
        if (selectedHashes.length > 1) return;
        const project = this.state.projects.get(selectedHashes[0])
        project && showForm(ReassignProjectForm, { hash: selectedHashes[0], project, size: 'tiny' })
    }

    handleRowSelection(selectedHashes) {
        const { projects, topRightMenu } = this.state
        const len = selectedHashes.length
        topRightMenu.forEach(x => { x.disabled = len === 0; return x })

        // Enable export button only when all projects are selected
        const exportBtn = findInput(topRightMenu, 'export')
        exportBtn.disabled = len !== projects.size

        // If every selected project's status is 'open' or 're-opened change action to 'Close', otherwise 'Re-open'
        const closeBtn = findInput(topRightMenu, 'close')
        const doClose = selectedHashes.every(key => [statusCodes.open, statusCodes.reopen].indexOf(projects.get(key).status) >= 0)
        closeBtn.content = doClose ? 'Close' : 'Re-open'
        closeBtn.icon = `toggle ${doClose ? 'off' : 'on'}`

        findInput(topRightMenu, 're-assign').disabled = len !== 1

        this.setState({ topRightMenu })
    }

    loadProjects() {
        getProjects().then(projects => {
            const ar = Array.from(projects)
            ar.forEach(([hash, project]) => {
                project._hash = hash
                project._statusText = statusTexts[project.status] || 'unknown'
                this.syncStatus(hash, project)
            })
            this.setStatusBond(ar.map(([hash]) => hash))
            const isEmpty = projects.size === 0
            const emptyMessage = {
                content: isEmpty ? '' : 'Your search yielded no results',
                status: isEmpty ? '' : 'warning'
            }
            this.setState({ emptyMessage, projects })
        }, console.log)
    }

    // ToDo: deprecate by not storing status in the chatserver
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
            if (JSON.stringify(this.statusCodes) === JSON.stringify(statusCodes))
                this.statusCodes = statusCodes
            this.loadProjects()
        })
    }

    // ToDo: deprecate by not storing status in the chatserver
    syncStatus(hash, project) {
        setTimeout(() => {
            projectService.status(hash).then(status => {
                if (status === project.status) return;
                const updateTask = {
                    type: 'chatclient',
                    func: 'projectStatus',
                    args: [
                        hash,
                        status,
                        err => !err && this.loadProjects()
                    ],
                    silent: true
                }

                const createTask = {
                    type: 'chatclient',
                    func: 'project',
                    args: [
                        hash,
                        objCopy({ status }, project, true),
                        true,
                        err => !err && this.loadProjects()
                    ],
                    silent: true
                }
                // status in the web storage is not the same as blockchain status
                client.projectsByHashes([hash], (_, projects) => {
                    // create if not already exists in the web storage, otherwise update status
                    const create = projects.size === 0
                    project = create ? project : projects.get(hash)
                    if (status === project.status) return;
                    // Hack to prevent same task being executed multiple times
                    const id = hash + project.status + status + create
                    addToQueue(create ? createTask : updateTask, id)
                })

            })
        })
    }

    showDetails(project, hash) {
        const data = { ...project }
        data._hash = textEllipsis(hash, 23)
        data._firstSeen = data.firstSeen ? formatStrTimestamp(data.firstSeen) : 'never'
        data._totalTime = (data.totalBlocks || 0) + ' blocks'
        const labels = {
            name: 'Project Name',
            _hash: 'Project Unique ID',
            description: 'Description of Project',
            _totalTime: 'Total Time',
            _statusText: 'Project Status',
            _firstSeen: 'Project First Used',
        }
        // Create a form on the fly and display data a read-only input fields
        showForm(FormBuilder, {
            closeOnEscape: true,
            closeOnDimmerClick: true,
            closeText: 'Close',
            header: 'Project Details',
            inputs: Object.keys(labels).map((key, i, keys) => ({
                action: key !== '_hash' ? undefined : { icon: 'copy', onClick: () => copyToClipboard(hash) },
                label: labels[key],
                name: key,
                readOnly: true,
                type: key === 'description' ? 'textarea' : 'text',
                value: data[key]
            })),
            size: 'tiny',
            submitText: null
        })
    }

    render() {
        const { emptyMessage, layout, projects, topRightMenu, topLeftMenu } = this.state
        const isMobile = layout === 'mobile'
        const listProps = {
            data: projects,
            defaultSort: 'status',
            emptyMessage,
            float: 'right',
            pageNo: 1,
            perPage: 5,
            onRowSelect: this.handleRowSelection.bind(this),
            searchExtraKeys: ['ownerAddress', 'status', '_statusText'],
            selectable: true,
            topLeftMenu: projects.size > 0 ? topLeftMenu : topLeftMenu.filter(x => x.name === 'create'),
            topRightMenu: topRightMenu,
            type: 'datatable',
        }

        listProps.columns = [
            {
                key: 'name',
                title: 'Name'
            },
            isMobile ? null : {
                key: 'description',
                title: 'Description'
            },
            {
                collapsing: true,
                key: '_statusText',
                title: 'Status'
            },
            {
                collapsing: true,
                key: 'totalTime',
                title: 'Total Time',
                content: project => (project.totalTime || 0) + ' blocks'
            },
            {
                // No key required
                collapsing: true,
                content: (project, hash) => ([
                    {
                        key: 'edit',
                        name: 'edit',
                        icon: 'pencil',
                        onClick: () => showForm(ProjectForm, {
                            modal: true,
                            project,
                            hash,
                            onSubmit: (e, v, success) => success && this.loadProjects()
                        }),
                        title: 'Edit project'
                    },
                    {
                        icon: { className: isMobile ? 'no-margin' : '', name: 'eye' },
                        key: 'detials',
                        onClick: () => this.showDetails(project, hash),
                        style: { margin: 0 },
                        title: 'View detials'
                    }
                ]).map(props => <Button {...props} />),
                textAlign: 'center',
                title: 'Action',
            }
        ]
        return <ListFactory {...listProps} />
    }
}