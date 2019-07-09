import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button, Icon, Menu } from 'semantic-ui-react'
import ListFactory from './ListFactory'
import ProjectForm from '../forms/Project'
import { copyToClipboard, IfMobile, textEllipsis } from '../utils'
import WalletForm from '../forms/Wallet'

const toBeImplemented = ()=> alert('To be implemented')

class ProjectList extends ReactiveComponent {
    constructor() {
        super(['projects'])
        this.state = {
            actionsIndex: -1,
            pageNo: 1,
            projectEdit: undefined,
            secretIndex: -1
        }

        this.getActions = this.getActions.bind(this)
        this.getContent = this.getContent.bind(this)
        this.getCardHeader = this.getCardHeader.bind(this)
    }

    getActions(project, i, mobile) {
        const { secretIndex } = this.state

        return [
            {
                content: mobile ? '' : (secretIndex === i ? 'Hide' : 'Show') + ' Seed',
                icon: 'eye' + (secretIndex === i ? ' slash' : ''),
                onClick: toBeImplemented 
            },
            {
                content: mobile ? '' : 'Copy',
                icon: 'copy',
                onClick: () => copyToClipboard(project.address)
            },
            {
                icon: 'edit',
                onClick: ()=> this.setState({
                    projectEdit: project,
                    showEditModal: true
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

    getContent(mobile) {
        return () => {
            const { itemsPerRow, type } = this.props
            const { actionsIndex, projectEdit, projects, showEditModal } = this.state
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
                    listProps.items = projects.map((projects, i) => ({
                        actions: getActions(projects, i, mobile),
                        actionsVisible: actionsIndex === i,
                        description: (
                            <div>
                                <p><b>Owner Address:</b></p>
                                <p>{textEllipsis(projects.ownerAddress, 28)}</p>
                                <p><b>Description:</b></p>
                                <p>{projects.description}</p>
                            </div>
                        ),
                        header: getCardHeader(projects, i),
                        style: perRow === 1 ? {margin: 0} : undefined
                    }))
                    listProps.itemsPerRow = perRow
                case 'datatable':
                default:
                    listProps.data = projects
                    listProps.dataKeys = [
                        { key:'name', title: 'Name'},
                        { 
                            key: 'address', 
                            title: 'Address', 
                            content: item => textEllipsis(item.address, 12)
                        },
                        { 
                            key: 'ownerAddress', 
                            title: 'Owner', 
                            content: item => textEllipsis(item.ownerAddress, 12)
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
                    listProps.footerContent = <ProjectForm modal={true} trigger={<Button icon="plus" content="Create" />} />
                    listProps.float = 'right'
                    break;
            }
            return (
                <React.Fragment>
                    <ListFactory {...listProps} />
                    {showEditModal && (
                        <ProjectForm
                            modal={true}
                            open={showEditModal}
                            onClose={()=> this.setState({showEditModal: false})}
                            // FOR DEMO ONLY
                            onSubmit={(e, newProject) => this.setState({projects: this.state.project.concat([newProject])})}
                            project={projectEdit} 
                        />
                    )}
                </React.Fragment>
            )
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
            address: '5EJTCCb2rnyk3SNocZTG3M4gwmfigi8f4QdzvA9AhUt2HT3R',
            ownerAddress: '5EHvFvPmoAHvWJ8f5VuHqQA5Rb2Noqx4ZsdR4rM2N89BxLU3',
            // 160 chars max. use textfield ??
            description: 'This is a sample project ' + i
        }
    ))
}
export default ProjectList