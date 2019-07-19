import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button, Icon, Menu } from 'semantic-ui-react'
import ListFactory from './ListFactory'
import ProjectForm from '../forms/Project'
import { copyToClipboard, IfMobile, textEllipsis } from '../utils'
import { confirm, showForm, closeModal } from '../../services/modal'
import AddressbookEntryForm from '../forms/AddressbookEntry'
import addressbook from '../../services/addressbook'
import { secretStore } from 'oo7-substrate'
import client from '../../services/ChatClient'

const toBeImplemented = ()=> alert('To be implemented')

class ProjectList extends ReactiveComponent {
    constructor(props) {
        super(props, {
            _: addressbook.getBond(),
            secretStore: secretStore()
        })
        this.state = {
            actionsIndex: -1,
            projects: new Map()
        }

        this.getActions = this.getActions.bind(this)
        this.getContent = this.getContent.bind(this)
        this.getCardHeader = this.getCardHeader.bind(this)
        this.loadProjects = this.loadProjects.bind(this)

        // client.onProjects(projects => this.setState({projects}))
    }

    loadProjects() {
        const { secretStore } = this.state
        const walletAddrs = secretStore.keys.map(x => x.address)
        client.projects( walletAddrs, (_, projects) => this.setState({projects}))
    }

    getActions(project, id, mobile) {
        return [
            {
                active: false,
                content: mobile ? '' : 'Show Seed',
                icon: 'eye',
                onClick: ()=> {
                    const id = confirm({
                        cancelButton: null,
                        content: 'Seed goes here',
                        header: project.name + ' : Seed',
                        size: 'tiny'
                    })
                    setTimeout(() => closeModal(id), 5000)
                } 
            },
            {
                active: false,
                content: mobile ? '' : 'Copy',
                icon: 'copy',
                onClick: () => copyToClipboard(project.ownerAddress)
            },
            {
                active: false,
                icon: 'edit',
                onClick: ()=> showForm(
                    ProjectForm,
                    { 
                        modal: true,
                        project,
                        id,
                        onSubmit: (e, v, success) => success && setTimeout(this.loadProjects(), 2000)
                    })
            },
            {
                active: false,
                content: mobile ? '' : 'Delete',
                icon: 'trash alternate',
                onClick: toBeImplemented
            }
        ].map((x, i) => {x.key = i; return x})
    }

    getCardHeader(project, id) {
        const { actionsIndex } = this.state
        const toggleOnClick = ()=> {
            this.setState({
                actionsIndex: actionsIndex === id ? -1 : id
            })
        }
        return {
            content: project.name,
            icon: {
                color: 'grey',
                className: 'circular',
                link: true,
                name: 'angle ' + (actionsIndex === id ? 'up' : 'down'),
                onClick: toggleOnClick
            },
            image: <Icon name="flask" size="big" />,
            subheader: textEllipsis(project.address, 23)
        }
    }

    getOwner(project) {
        const {ownerAddress} = project
        const entry = addressbook.getByAddress(ownerAddress) || secretStore().find(ownerAddress)
        if (entry) return entry.name;
        return <Button content="Add Partner" onClick={ () => showForm(AddressbookEntryForm, {
            modal: true,
            values: {address: ownerAddress}
        })} />
    }

    getContent(mobile) {
        return () => {
            const { itemsPerRow, type } = this.props
            const { actionsIndex, projects, secretStore } = this.state
            const { getActions, getCardHeader } = this
            const listType = type || (mobile ? 'cardlist' : 'datatable')
            const listProps = {
                perPage: 10,
                pageNo: 1,
                type: listType,
            }
            if (projects.size === 0 && secretStore) this.loadProjects();
            switch(listType.toLowerCase()) {
                case 'cardlist' :
                    const perRow = mobile ? 1 : itemsPerRow || 1
                    listProps.items = Array.from(projects).map(item => {
                        const id = item[0]
                        const project = item[1]
                        return {
                            actions: getActions(project, id, mobile),
                            actionsVisible: actionsIndex === id,
                            description: (
                                <div>
                                    <p><b>Owner:</b></p>
                                    <p>{this.getOwner(project)}</p>
                                    <p><b>Description:</b></p>
                                    <p>{project.description}</p>
                                    <p><b>Total Time:</b></p>
                                    <p>{(project.totalTime || 0) + ' blocks'}</p>
                                </div>
                            ),
                            header: getCardHeader(project, id),
                            style: perRow === 1 ? {margin: 0} : undefined
                        }
                    })
                    listProps.itemsPerRow = perRow
                case 'datatable':
                default:
                    listProps.data = projects
                    listProps.dataKeys = [
                        { key:'name', title: 'Name'},
                        { 
                            key: 'totalTime',
                            textAlign: 'center',
                            title: 'Total Time', 
                            content: project => (project.totalTime || 0) + ' blocks' 
                        },
                        { 
                            key: 'ownerAddress', 
                            textAlign: 'center',
                            title: 'Owner', 
                            content: this.getOwner
                        },
                        { key: 'description', title: 'Description'},
                        {
                            // No key required
                            content: (project, id) => <Menu items={getActions(project, id, true)}  compact fluid />,
                            collapsing: true,
                            style: { padding : 0},
                            title: 'Actions'
                        }
                    ]
                    listProps.footerContent = (
                        <Button 
                            icon="plus" 
                            content="Create" 
                            onClick={() => showForm(
                                ProjectForm,
                                { modal: true, onSubmit: (e, v, success) => success && this.loadProjects() }
                            )} 
                        />
                    )
                    listProps.float = 'right'
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
    projects: Array(100).fill(0).map((_, i) => (
        {
            name: 'Project ' + i,
            // only save address to server. Save to addressbook as well?
            totalTime: 1000 + i,
            ownerAddress: '5CwkLTVyzjHvoeArWQbas6v9StrBo3zaKN9ZGuEVfKJRUevA',
            // 160 chars max. use textfield ??
            description: 'This is a sample project ' + i
        }
    ))
}
export default ProjectList