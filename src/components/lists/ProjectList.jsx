import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { pretty, secretStore } from 'oo7-substrate'
import { Button } from 'semantic-ui-react'
import ListFactory from './ListFactory'
import FormBuilder from '../forms/FormBuilder'
import ProjectForm, { ReassignProjectForm } from '../forms/Project'
import { deferred, isArr, IfMobile, objCopy } from '../utils'
import { confirm, showForm } from '../../services/modal'
import addressbook from '../../services/addressbook'
import client from '../../services/ChatClient'
import storageService from '../../services/storage'
import { ownerProjectsList } from '../../services/blockchain'
import { addToQueue } from '../../services/queue'

const toBeImplemented = ()=> alert('To be implemented')

const PROJECT_STATUSES = { 0: 'Open', 1: 'Re-opened', 2: 'Closed', 99: 'Deleted'}

class ProjectList extends ReactiveComponent {
    constructor(props) {
        super(props, {
            secretStore: secretStore()
        })

        this.getContent = this.getContent.bind(this)
        this.loadProjects = deferred(this.loadProjects, 100, this)

        this.state = {
            actionsIndex: -1,
            bonds: [
                this.getSelectedHashesBond(), // keep at index 0
                addressbook.getBond(),
                secretStore(),
                storageService.walletIndexBond,
            ],
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
                                        err => !err && this.loadProjects()
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
                                    func: 'project',
                                    args: [
                                        hash,
                                        objCopy({status: targetStatus}, projects.get(hash), true),
                                        false,
                                        err => !err && this.loadProjects()
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

    // Selected wallet hashes bond
    getSelectedHashesBond() {
        const { secretStore: ss } = this.state
        const wallets = ss ? ss.keys : secretStore()._value.keys // force if not ready
        const selectedWallet = wallets[storageService.walletIndex()]
        return ownerProjectsList(selectedWallet.address)
    }

    componentWillMount() {
        const cb = () => this.loadProjects()
        // reload projects whenever any of the bond's value updates
        this.state.bonds.map(bond => bond.__tieId = bond.tie(cb) )

        // Update project hashes bond whenever selected wallet changes
        storageService.walletIndexBond.tie(()=> {
            const { bonds } = this.state
            bonds[0].untie(bonds[0].__tieId)
            bonds[0] = this.getSelectedHashesBond()
            bonds[0].__tieId = bonds[0].tie(cb)
            this.setState({bonds})
        })
    }

    componentWillUnmount() {
        // unsubscribe from updates
        this.state.bonds.map(bond => bond.untie(bond.__tieId))
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
            // Get project data from web storage
            client.projectsByHashes( hashArr, (_, projects, notFoundHashes) => {
                (notFoundHashes || []).forEach(hash => projects.set(hash, {ownerAddress: address, name: 'Unnamed'}))
                // attach project owner address name if available
                for (let [hash, project] of projects) {
                    const {ownerAddress} = project
                    const entry = wallets.find(x => x.address === ownerAddress) || addressbook.getByAddress(ownerAddress) || {}
                    project._ownerName = entry.name
                    project._hash = hash
                    project._statusText = PROJECT_STATUSES[project.status] || 'Unknown'
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