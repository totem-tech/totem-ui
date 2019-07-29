import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import ListFactory from './ListFactory'
import ProjectForm from '../forms/Project'
import { isArr, IfMobile } from '../utils'
import { showForm } from '../../services/modal'
import addressbook from '../../services/addressbook'
import { pretty, secretStore } from 'oo7-substrate'
import client from '../../services/ChatClient'
import storageService from '../../services/storage'
import { ownerProjectsList } from '../../services/blockchain'

const toBeImplemented = ()=> alert('To be implemented')

class ProjectList extends ReactiveComponent {
    constructor(props) {
        super(props, {
            secretStore: secretStore()
        })

        this.state = {
            actionsIndex: -1,
            bonds: [
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
                    onClick: (selectedIndexes) => showForm(
                        ProjectForm,
                        { modal: true, onSubmit: (e, v, success) => success && this.loadProjects() }
                    )
                }
            ],
            topRightMenu: [
                {
                    active: false,
                    name: 'close',
                    content: 'Close project',
                    disabled: true,
                    icon: 'toggle off',
                    onClick: toBeImplemented
                },
                {
                    active: false,
                    content: 'Reassign owner',
                    icon: 'mail forward',
                    name: 'assign',
                    onClick: toBeImplemented
                },
                {
                    active: false,
                    name: 'edit',
                    content: 'Edit',
                    disabled: true,
                    icon: 'pencil',
                    onClick: (selectedIndexes) => selectedIndexes.length !== 1 ? '' : showForm(
                        ProjectForm,
                        { 
                            modal: true,
                            project: this.state.projects.get(selectedIndexes[0]),
                            hash: selectedIndexes[0],
                            onSubmit: (e, v, success) => success && setTimeout(this.loadProjects(), 2000)
                        }
                    ),
                    title: 'Only one project can be edited at a time'
                },
                {
                    active: false,
                    content: 'Export',
                    icon: 'file excel',
                    name: 'export',
                    onClick: toBeImplemented
                },
                {
                    active: false,
                    name: 'delete',
                    content: 'Delete',
                    disabled: true,
                    icon: 'trash alternate',
                    onClick: toBeImplemented
                },
            ]
        }

        this.getContent = this.getContent.bind(this)
        this.loadProjects = this.loadProjects.bind(this)
    }

    componentWillMount() {
        // reload projects whenever 
        this.state.bonds.map(bond => bond.__tieId = bond.tie(() => this.loadProjects()) )
    }

    componentWillUnmount() {
        // unsubscribe from updates
        this.state.bonds.map(bond => bond.untie(bond.__tieId) )
    }

    loadProjects() {
        const {secretStore: ss} = this.state
        const wallets = ss ? ss.keys : secretStore()._value.keys // force if not ready
        const { address } = wallets[storageService.walletIndex()] || {}
        address && ownerProjectsList(address).then( hashArr => {
            if (!isArr(hashArr) || hashArr.length === 0) return this.setState({projects: new Map()});
            // convert to string and add 0x prefix
            hashArr = hashArr.map( hash => pretty(hash) )
            // remove duplicates, if any
            hashArr = Object.keys(hashArr.reduce((obj, address) => { obj[address] = 1; return obj}, {}))
            // Get project data from web storage
            client.projectsByHashes( hashArr, (_, projects) => {
                // attach project owner address name if available
                for (let [hash, project] of projects) {
                    const {ownerAddress} = project
                    const entry = wallets.find(x => x.address === ownerAddress) || addressbook.getByAddress(ownerAddress) || {}
                    // Status codes on blockchain are 0:Open, 1:Reopened, 2:Closed, 99: Deleted
                    const statuses = ['Open', 'Reopened', 'Closed', 'reopened']
                    statuses[99] = 'Deleted'
                    project._ownerName = entry.name
                    project._hash = hash
                    project._statusText = statuses[project.status] || 'Unknown'
                }
                this.setState({projects})
            })
        })
    }

    handleSelection(selectedIndexes) {
        const { projects, topRightMenu } = this.state
        const len = selectedIndexes.length
        topRightMenu.forEach(x => {x.disabled = len === 0; return x})
        if (len <= 1) return this.setState({topRightMenu})
        // more than one selected
        // Disable edit button, otherwise it will require multiple modals to be opened
        const editBtn = topRightMenu.find(x => x.name === 'edit')
        editBtn.disabled = true

        // If every selected project's status is 'open' change action to 'Close', otherwise 'Re-open'
        const closeBtn = topRightMenu.find(x => x.name === 'close')
        const doClose = selectedIndexes.every(key => projects.get(key).status === 0)
        closeBtn.content = doClose ? 'Close' : 'Re-open'
        closeBtn.icon = `toggle ${doClose ? 'off' : 'on'}`
        this.setState({topRightMenu})
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
                            onClick={() => console.log(project, hash) | toBeImplemented()}
                            // content={mobile ? '' : 'Details'} 
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