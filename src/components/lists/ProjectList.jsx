import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button, Icon, Menu } from 'semantic-ui-react'
import ListFactory from './ListFactory'
import ProjectForm from '../forms/Project'
import { isArr, copyToClipboard, IfMobile, textEllipsis } from '../utils'
import { confirm, showForm, closeModal } from '../../services/modal'
import AddressbookEntryForm from '../forms/AddressbookEntry'
import addressbook from '../../services/addressbook'
import { bytesToHex, pretty, secretStore } from 'oo7-substrate'
import client from '../../services/ChatClient'
import storageService from '../../services/storage'
import { ownerProjectsList } from '../../services/project'

const toBeImplemented = ()=> alert('To be implemented')

class ProjectList extends ReactiveComponent {
    constructor(props) {
        super(props, {
            _: addressbook.getBond(),
            secretStore: secretStore(),
            // update projects whenever selected wallet changes
            // walletIndex: storageService.walletIndexBond.map(() => this.loadProjects())
        })

        this.state = {
            actionsIndex: -1,
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

        // this.getActions = this.getActions.bind(this)
        this.getContent = this.getContent.bind(this)
        // this.getCardHeader = this.getCardHeader.bind(this)
        this.loadProjects = this.loadProjects.bind(this)

        // Update projects whenever selected wallet changes
        storageService.walletIndexBond.tie(index => {
            this.loadProjects()
        })
    }

    loadProjects() {
        const {secretStore: ss} = this.state
        const wallets = ss ? ss.keys : secretStore()._value.keys // force if not ready
        const address = wallets[storageService.walletIndex()].address
        ownerProjectsList(address).then( hashArr => {
            if (!isArr(hashArr) || hashArr.length === 0) return this.setState({projects: new Map()});
            // convert to string and add 0x prefix
            hashArr = hashArr.map( hash => pretty(hash) )
            // remove duplicates, if any
            hashArr = Object.keys(hashArr.reduce((obj, address) => { obj[address] = 1; return obj}, {}))
            client.projectsByHashes( hashArr, (_, projects) => {
                // attach project owner address name if available
                for (let [hash, project] of projects) {
                    const {ownerAddress} = project
                    const entry = wallets.find(x => x.address === ownerAddress) || addressbook.getByAddress(ownerAddress) || {}
                    const statuses = ['unknown', 'open', 'closed']
                    project._ownerName = entry.name
                    project._hash = hash
                    project._statusText = statuses[project.status || 0]
                }
                this.setState({projects})
            })
        })
    }

    // getActions(project, id, mobile) {
    //     return [
    //         {
    //             active: false,
    //             content: mobile ? '' : 'Show Seed',
    //             icon: 'eye',
    //             onClick: ()=> {
    //                 const id = confirm({
    //                     cancelButton: null,
    //                     content: 'Seed goes here',
    //                     header: project.name + ' : Seed',
    //                     size: 'tiny'
    //                 })
    //                 setTimeout(() => closeModal(id), 5000)
    //             } 
    //         },
    //         {
    //             active: false,
    //             content: mobile ? '' : 'Copy',
    //             icon: 'copy',
    //             onClick: () => copyToClipboard(project.ownerAddress)
    //         },
    //         {
    //             active: false,
    //             icon: 'edit',
    //             onClick: ()=> showForm(
    //                 ProjectForm,
    //                 { 
    //                     modal: true,
    //                     project,
    //                     id,
    //                     onSubmit: (e, v, success) => success && setTimeout(this.loadProjects(), 2000)
    //                 })
    //         },
    //         {
    //             active: false,
    //             content: mobile ? '' : 'Delete',
    //             icon: 'trash alternate',
    //             onClick: toBeImplemented
    //         }
    //     ].map((x, i) => {x.key = i; return x})
    // }
    // 
    // getCardHeader(project, id) {
    //     const { actionsIndex } = this.state
    //     const toggleOnClick = ()=> {
    //         this.setState({
    //             actionsIndex: actionsIndex === id ? -1 : id
    //         })
    //     }
    //     return {
    //         content: project.name,
    //         icon: {
    //             color: 'grey',
    //             className: 'circular',
    //             link: true,
    //             name: 'angle ' + (actionsIndex === id ? 'up' : 'down'),
    //             onClick: toggleOnClick
    //         },
    //         image: <Icon name="flask" size="big" />,
    //         subheader: textEllipsis(project.address, 23)
    //     }
    // }
    // 
    // getOwner(project) {
    //     const { ownerAddress, _ownerName } = project
    //     if(_ownerName) return _ownerName;
    //     // Add a button to add address as a partner to the addressbook
    //     return <Button content="Add Partner" onClick={ () => showForm(AddressbookEntryForm, {
    //         modal: true,
    //         values: {address: ownerAddress}
    //     })} />
    // }

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
        const doClose = selectedIndexes.every(key => projects.get(key).status !== 'open')
        closeBtn.content = doClose ? 'Close' : 'Re-open'
        closeBtn.icon = `toggle ${doClose ? 'off' : 'on'}`
        this.setState({topRightMenu})
    }

    getContent(mobile) {
        return () => {
            // const { itemsPerRow, type } = this.props
            const { actionsIndex, projects, topRightMenu, topLeftMenu } = this.state
            const listType = 'datatable'
            const listProps = {
                perPage: 10,
                pageNo: 1,
                type: listType,
            }
            switch(listType.toLowerCase()) {
                // case 'cardlist' :
                    // const perRow = mobile ? 1 : itemsPerRow || 1
                    // listProps.items = Array.from(projects).map(item => {
                    //     const id = item[0]
                    //     const project = item[1]
                    //     return {
                    //         actions: getActions(project, id, mobile),
                    //         actionsVisible: actionsIndex === id,
                    //         description: (
                    //             <div>
                    //                 <p><b>Owner:</b></p>
                    //                 <p>{this.getOwner(project)}</p>
                    //                 <p><b>Description:</b></p>
                    //                 <p>{project.description}</p>
                    //                 <p><b>Total Time:</b></p>
                    //                 <p>{(project.totalTime || 0) + ' blocks'}</p>
                    //             </div>
                    //         ),
                    //         header: getCardHeader(project, id),
                    //         style: perRow === 1 ? {margin: 0} : undefined
                    //     }
                    // })
                    // listProps.itemsPerRow = perRow
                case 'datatable':
                default:
                    listProps.data = projects
                    listProps.dataKeys = [
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
                    listProps.float = 'right'
                    listProps.perPage = 5
                    listProps.topLeftMenu = projects.size > 0 ? topLeftMenu : topLeftMenu.filter(x => x.name === 'create')
                    listProps.topRightMenu = topRightMenu
                    listProps.searchExtraKeys = ['ownerAddress', 'status', '_statusText']
                    listProps.selectable = true
                    listProps.defaultSort = 'status'
                    listProps.onRowSelect = this.handleSelection.bind(this)
                    break;
            }
            return <ListFactory {...listProps} />
        }
    }

    render() {
        return <IfMobile then={this.getContent(true)} else={this.getContent(false)} />
    }
}
ProjectList.propTypes = {
    projects: PropTypes.arrayOf(PropTypes.object),
    itemsPerRow: PropTypes.number,
    type: PropTypes.string
}
ProjectList.defaultProps = {
    // projects: Array(100).fill(0).map((_, i) => (
    //     {
    //         name: 'Project ' + i,
    //         // only save address to server. Save to addressbook as well?
    //         totalTime: 1000 + i,
    //         ownerAddress: '5CwkLTVyzjHvoeArWQbas6v9StrBo3zaKN9ZGuEVfKJRUevA',
    //         // 160 chars max. use textfield ??
    //         description: 'This is a sample project ' + i
    //     }
    // ))
}
export default ProjectList