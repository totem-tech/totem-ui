import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { pretty, secretStore } from 'oo7-substrate'
import { Button } from 'semantic-ui-react'
import ListFactory from '../components/ListFactory'
import FormBuilder from '../components/FormBuilder'
import ProjectForm, { ReassignProjectForm } from '../forms/Project'
import { deferred, isArr, IfMobile, objCopy } from '../utils/utils'
import { confirm, showForm } from '../services/modal'
import client from '../services/ChatClient'
import storageService from '../services/storage'
import { ownerProjectsList, projectHashStatus } from '../services/blockchain'
import { addToQueue } from '../services/queue'
import addressbook from '../services/addressbook'

const toBeImplemented = ()=> alert('To be implemented')

const PROJECT_STATUSES = { 0: 'Open', 1: 'Re-opened', 2: 'Closed', 99: 'Deleted'}

class ProjectList extends ReactiveComponent {
    constructor(props) {
        super(props, {
            // secretStore: secretStore()
        })

        this.getContent = this.getContent.bind(this)
        this.loadProjects = deferred(this.loadProjects, 100, this)
        this.state = {
            actionsIndex: -1,
            projects: new Map(),
            topLeftMenu : [
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
                    name: 'edit',
                    content: 'Edit',
                    disabled: true,
                    icon: 'pencil',
                    onClick: (selectedHashes) => {
                        const project = this.state.projects.get(selectedHashes[0])
                        project && showForm(
                            ProjectForm,
                            { 
                                modal: true,
                                project,
                                hash: selectedHashes[0],
                                onSubmit: (e, v, success) => success && setTimeout(this.loadProjects(), 2000)
                            }
                        )
                    },
                    title: 'Only one project can be edited at a time'
                },
                {
                    active: false,
                    name: 'close',
                    content: 'Close', //Close/Reopen
                    disabled: true,
                    icon: 'toggle off',
                    onClick: (selectedHashes) => {
                        const { projects, topRightMenu } = this.state
                        const doClose = selectedHashes.every(key => [0, 1].indexOf((projects.get(key) || {}).status) >= 0)
                        const targetStatus = doClose ? 2 : 1
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
                        this.setState({topRightMenu})
                    }
                },
                {
                    active: false,
                    name: 'delete',
                    content: 'Delete',
                    disabled: true,
                    icon: 'trash alternate',
                    onClick: (selectedHashes) => {
                        selectedHashes.forEach(hash => {
                            const { projects } = this.state
                            const targetStatus = 99
                            const { name, ownerAddress, status } = projects.get(hash) || {}
                            // ignore if project is already at target status or project not longer exists in the list
                            if (status === targetStatus || !name) return;
                            addToQueue({
                                type: 'blockchain',
                                func:'removeProject',
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
                                        () => {} // placeholder callback. required for data service
                                    ]
                                }
                            })
                        })
                    }
                },
                {
                    active: false,
                    content: 'Re-assign owner',
                    icon: 'mail forward',
                    name: 're-assign',
                    onClick: (selectedHashes) => {
                        if (selectedHashes.length === 0) return;
                        if (selectedHashes.length > 1) return toBeImplemented();
                        const project = this.state.projects.get(selectedHashes[0])
                        project && showForm(ReassignProjectForm, {hash: selectedHashes[0], project, size: 'tiny'})
                    }
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
        const { secretStore: ss } = this.state
        const wallets = ss ? ss.keys : secretStore()._value.keys // force if not ready
        const { address } = wallets[storageService.walletIndex()]
        this.triggerBond = Bond.all([
            addressbook.getBond(),
            secretStore(),
            storageService.walletIndexBond,
            ownerProjectsList(address)
        ])
        // reload projects whenever any of the bond's value updates
        this.notifyId =  this.triggerBond.notify(() => this.loadProjects())
    }

    componentWillUnmount() {
        // unsubscribe from updates
        this.triggerBond.unnotify(this.notifyId)
        if (this.statusBond && this.statusTieId) this.statusBond.untie(this.statusTieId);
    }

    // Reload project list whenever status of any of the projects changes
    setStatusBond(hashes) {
        // return if all the hashes are the same as the ones from previous call
        if (JSON.stringify(this.hashes) === JSON.stringify(hashes)) return;
        this.hashes = hashes
        // untie existing bond
        if (this.statusBond && this.statusTieId) this.statusBond.untie(this.statusTieId);
        this.statusBond = Bond.all(this.hashes.map(hash => projectHashStatus(hash)))
        this.statusTieId = this.statusBond.tie((statusCodes)=> {
            // return if all status codes received are exactly same as previously set ones
            if (JSON.stringify(this.statusCodes) === JSON.stringify(statusCodes))
            this.statusCodes = statusCodes
            this.loadProjects()
        })
    }

    syncStatus(hash, project) {
        setTimeout(()=> {
            projectHashStatus(hash).then(status => {
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
                        objCopy({status}, project, true),
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
                    const id = hash+project.status+status+create
                    addToQueue( create ? createTask : updateTask, id)
                })
                
            })
        })
    }

    loadProjects() {
        const {secretStore: ss} = this.state
        const wallets = ss ? ss.keys : secretStore()._value.keys // force if not ready
        const { address } = wallets[storageService.walletIndex()]
        return ownerProjectsList(address).then( hashArr => {
            if (!isArr(hashArr) || hashArr.length === 0) return this.setState({projects: new Map()});
            // convert to string
            hashArr = hashArr.map( hash => pretty(hash) )
            // remove duplicates, if any
            hashArr = Object.keys(hashArr.reduce((obj, address) => { obj[address] = 1; return obj}, {}))
            this.setStatusBond(hashArr)
            // Get project data from web storage
            client.projectsByHashes( hashArr, (_, projects, notFoundHashes) => {
                (notFoundHashes || []).forEach(hash => projects.set(hash, {
                    ownerAddress: address,
                    name: 'Unnamed',
                    description: 'N/A',
                    status: -1
                }))
                // attach project owner address name if available
                for (let [hash, project] of projects) {
                    const {ownerAddress} = project
                    const entry = wallets.find(x => x.address === ownerAddress) || {}
                    project._ownerName = entry.name
                    project._hash = hash
                    project._statusText = PROJECT_STATUSES[project.status] || 'Unknown'
                    project._tsFirstUsed = `${project.tsFirstUsed}`.split('T').join(' ').split('Z').join(' ').split('.')[0]
                    this.syncStatus(hash, project)
                }
                this.setState({projects})
            })
        })
    }

    handleSelection(selectedHashes) {
        const { projects, topRightMenu } = this.state
        const len = selectedHashes.length
        topRightMenu.forEach(x => {x.disabled = len === 0; return x})

        // Enable export button only when all projects are selected
        const exportBtn = topRightMenu.find(x => x.name === 'export')
        exportBtn.disabled = len !== projects.size


        // If every selected project's status is 'open' or 're-opened change action to 'Close', otherwise 'Re-open'
        const closeBtn = topRightMenu.find(x => x.name === 'close')
        const doClose = selectedHashes.every(key => [0, 1].indexOf(projects.get(key).status) >= 0)
        closeBtn.content = doClose ? 'Close' : 'Re-open'
        closeBtn.icon = `toggle ${doClose ? 'off' : 'on'}`

        if (len <= 1) return this.setState({topRightMenu})
        // more than one selected
        // Disable edit button, otherwise it will require multiple modals to be opened
        const editBtn = topRightMenu.find(x => x.name === 'edit')
        editBtn.disabled = true
    }

    showDetails(project, hash) {
        project = objCopy(project)
        project.hash = hash
        const labels = {
            name: 'Name',
            _ownerName: 'Owner Name',
            ownerAddress: 'Owner Address',
            description: 'Description',
            status: 'Status Code',
            _statusText: 'Status',
            hash: 'Hash',
            _tsFirstUsed: 'First Used'
        }
        // Create a form on the fly and display data a read-only input fields
        showForm(FormBuilder, {
            closeOnEscape: true,
            closeOnDimmerClick: true,
            closeText: 'Close',
            header: 'Project Details',
            inputs: Object.keys(labels).map((key, i, keys) => ({
                label: labels[key],
                name: key,
                readOnly: true,
                type: key === 'description' ? 'textarea' : 'text',
                value: project[key]
            })),
            size: 'tiny',
            submitText: null
        })
    }

    getContent(mobile) {
        return () => {
            const { projects, topRightMenu, topLeftMenu } = this.state
            const listProps = {
                perPage: 10,
                pageNo: 1,
                type: 'datatable',
                data: projects,
                float: 'right',
                perPage: 5,
                topLeftMenu: projects.size > 0 ? topLeftMenu : topLeftMenu.filter(x => x.name === 'create'),
                topRightMenu: topRightMenu,
                searchExtraKeys: ['ownerAddress', 'status', '_statusText'],
                selectable: true,
                defaultSort: 'status',
                onRowSelect: this.handleSelection.bind(this),
            }
            
            listProps.columns = [
                { 
                    key:'name',
                    title: 'Name'
                },
                { 
                    collapsing: true,
                    key: 'totalTime',
                    title: 'Total Time', 
                    content: project => (project.totalTime || 0) + ' blocks' 
                },
                mobile ? null : {
                    collapsing: true,
                    content: this.getOwner,
                    key: '_ownerName', 
                    title: 'Owner',
                },
                mobile ? null : {
                    key: 'description',
                    title: 'Description'
                },
                {
                    collapsing: true,
                    key: '_statusText',
                    title: 'Status'
                },
                {
                    // No key required
                    collapsing: true,
                    content: (project, hash) => (
                        <Button 
                            onClick={() => this.showDetails(project, hash)}
                            icon={{
                                className: mobile? 'no-margin' : '',
                                name: 'eye'
                            }}
                            style={{margin: 0}} 
                        />
                    ),
                    textAlign: 'center',
                    title: 'Details'
                }
            ]
            return <ListFactory {...listProps} />
        }
    }

    render() {
        return <IfMobile then={this.getContent(true)} else={this.getContent(false)} />
    }
}

ProjectList.propTypes = {
    projects: PropTypes.arrayOf(PropTypes.object),
}
export default ProjectList