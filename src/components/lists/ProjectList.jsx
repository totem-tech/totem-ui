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

const toBeImplemented = ()=> alert('To be implemented')

class ProjectList extends ReactiveComponent {
    constructor() {
        super(['projects'], {
            _: addressbook.getBond(),
            secretStore: secretStore()
        })
        this.state = {
            actionsIndex: -1
        }

        this.getActions = this.getActions.bind(this)
        this.getContent = this.getContent.bind(this)
        this.getCardHeader = this.getCardHeader.bind(this)
    }

    getActions(project, i, mobile) {
        return [
            {
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
                content: mobile ? '' : 'Copy',
                icon: 'copy',
                onClick: () => copyToClipboard(project.address)
            },
            {
                icon: 'edit',
                onClick: ()=> showForm(ProjectForm, {
                    modal: true,
                    onSubmit: this.refresh,
                    project
                })
            },
            {
                content: mobile ? '' : 'Delete',
                icon: 'trash alternate',
                onClick: toBeImplemented
            }
        ].map((x, i) => {x.key = i; return x})
    }

    getCardHeader(project, i) {
        const { actionsIndex } = this.state
        const toggleOnClick = ()=> {
            this.setState({
                actionsIndex: actionsIndex === i ? -1 : i
            })
        }
        return {
            content: project.name,
            icon: {
                color: 'grey',
                className: 'circular',
                link: true,
                name: 'angle ' + (actionsIndex === i ? 'up' : 'down'),
                onClick: toggleOnClick
            },
            image: <Icon name="flask" size="big" />,
            subheader: textEllipsis(project.address, 23)
        }
    }

    refresh() {
        console.info('ToDo: update project list')
    }

    getOwner(project) {
        const {ownerAddress} = project
        const entry = addressbook.getByAddress(ownerAddress) || secretStore().find(ownerAddress)
        if (entry) return entry.name;
        console.log('entry', entry)
        return <Button content="Add Partner" onClick={ () => showForm(AddressbookEntryForm, {
            modal: true,
            preFillValues: {address: ownerAddress}
        })} />
    }

    getContent(mobile) {
        return () => {
            const { itemsPerRow, type } = this.props
            const { actionsIndex, projects } = this.state
            const { getActions, getCardHeader } = this
            const listType = mobile ? 'cardlist' : type || 'datatable'
            const listProps = {
                perPage: 10,
                pageNo: 1,
                type: listType,
            }
            switch(listType.toLowerCase()) {
                case 'cardlist' :
                    const perRow = mobile ? 1 : itemsPerRow || 1
                    listProps.items = projects.map((project, i) => ({
                        actions: getActions(project, i, mobile),
                        actionsVisible: actionsIndex === i,
                        description: (
                            <div>
                                <p><b>Owner:</b></p>
                                <p>{this.getOwner(project)}</p>
                                <p><b>Description:</b></p>
                                <p>{project.description}</p>
                            </div>
                        ),
                        header: getCardHeader(project, i),
                        style: perRow === 1 ? {margin: 0} : undefined
                    }))
                    listProps.itemsPerRow = perRow
                case 'datatable':
                default:
                    listProps.data = projects
                    listProps.dataKeys = [
                        { key:'name', title: 'Name'},
                        { 
                            key: 'totalTime', 
                            title: 'Total Time', 
                            content: (project) => project.totalTime + ' blocks' 
                        },
                        { 
                            key: 'ownerAddress', 
                            title: 'Owner', 
                            content: this.getOwner
                        },
                        { key: 'description', title: 'Description'},
                        {
                            // No key required
                            content: (project, i) => <Menu items={getActions(project, i, true)}  compact fluid />,
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
                                {
                                    modal: true,
                                    onSubmit: this.refresh
                                }
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