import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Icon } from 'semantic-ui-react'
import ListFactory from './ListFactory'
import { copyToClipboard, IfNotMobile, IfMobile, setState } from '../utils'

class ProjectList extends ReactiveComponent {
    constructor() {
        super()
        this.state = {
            actionsIndex: -1,
            draftName: '',
            editIndex: -1,
            secretIndex: -1
        }

        this.getContent = this.getContent.bind(this)
    }

    getContent(mobile) {
        const { items, itemsPerRow, type } = this.props
        const { actionsIndex, draftName, editIndex, secretIndex } = this.state
        const numItemsPerRow = mobile ? 1 : itemsPerRow || 1
        const toBeImplemented = ()=> alert('To be implemented')

        const getActions = (item, i) => (
            [
                {
                    content: <IfNotMobile then={(secretIndex === i ? 'Hide' : 'Show') + ' Seed'} />,
                    icon: 'eye' + (secretIndex === i ? ' slash' : ''),
                    onClick: toBeImplemented 
                },
                {
                    content: <IfNotMobile then={'Copy'} />,
                    icon: 'copy',
                    onClick: () => copyToClipboard(item.address)
                },
                {
                    content: <IfNotMobile then={editIndex !== i ? 'Edit' : 'Cancel'} />,
                    icon: editIndex !== i ? 'edit' : 'reply',
                    onClick: ()=> setState(this, 'editIndex', editIndex === i ? -1 : i)
                },
                {
                    content: <IfNotMobile then={'Delete'} />,
                    icon: 'trash alternate',
                    onClick: toBeImplemented
                }
            ]
        )

        const getHeader = (item, i) => ({
            content: item.name,
            icon: {
                color: 'grey',
                className: 'circular',
                link: true,
                name: 'angle ' + (actionsIndex === i ? 'up' : 'down'),
                onClick: ()=> {
                    setState(this, 'actionsIndex', actionsIndex === i ? -1 : i)
                    setState(this, 'draftName', editIndex === i ? '' : item.name)
                }
            },
            input: {
                action: {
                    color: 'black',
                    icon: 'save',
                    onClick: toBeImplemented,
                    size: 'tiny'
                },
                name: 'projectName',
                onChange: (e)=> setState(this, 'draftName', e.target.value),
                size: 'mini',
                value: draftName
            },
            inputVisible: editIndex === i,
            image: <Icon name="flask" size="big" />,
            subheader: item.ownerAddress + ' > ' + item.address
        })

        return (
            <ListFactory
                type={type || 'CardList'}
                items={(items || []).map((item, i) => ({
                    actions: getActions(item, i),
                    actionsVisible: actionsIndex === i,
                    description: item.description,
                    header: getHeader(item, i),
                    style: numItemsPerRow === 1 ? {margin: 0} : undefined
                }))}
                itemsPerRow={numItemsPerRow}
            />
        )
    }

    render() {
        return <IfMobile then={this.getContent(true)} else={this.getContent(false)} />
    }
}
ProjectList.propTypes = {
    items: PropTypes.arrayOf(PropTypes.object),
    type: PropTypes.string
}
ProjectList.defaultProps = {
    items: [
        {
            name: 'Project 1',
            // only save address to server. Save to addressbook as well?
            address: 'address_1',
            ownerAddress: 'project1_owner_address',
            // 160 chars max. use textfield ??
            description: 'This is project 1'
        },
        {
            name: 'Project 2',
            // only save address to server. Save to addressbook as well?
            address: 'address_2',
            ownerAddress: 'project2_owner_address',
            // 160 chars max. use textfield ??
            description: 'This is project 2'
        },
        {
            name: 'Project 3',
            // only save address to server. Save to addressbook as well?
            address: 'address_3',
            ownerAddress: 'project3_owner_address',
            // 160 chars max. use textfield ??
            description: 'This is project 3'
        },
        {
            name: 'Project 4',
            // only save address to server. Save to addressbook as well?
            address: 'address_4',
            ownerAddress: 'project4_owner_address',
            // 160 chars max. use textfield ??
            description: 'This is project 4'
        },
        {
            name: 'Project 5',
            // only save address to server. Save to addressbook as well?
            address: 'address_5',
            ownerAddress: 'project5_owner_address',
            // 160 chars max. use textfield ??
            description: 'This is project 5'
        },
        {
            name: 'Project 6',
            // only save address to server. Save to addressbook as well?
            address: 'address_6',
            ownerAddress: 'project6_owner_address',
            // 160 chars max. use textfield ??
            description: 'This is project 6'
        },
        {
            name: 'Project 7',
            // only save address to server. Save to addressbook as well?
            address: 'address_7',
            ownerAddress: 'project7_owner_address',
            // 160 chars max. use textfield ??
            description: 'This is project 7'
        },
        {
            name: 'Project 8',
            // only save address to server. Save to addressbook as well?
            address: 'address_8',
            ownerAddress: 'project8_owner_address',
            // 160 chars max. use textfield ??
            description: 'This is project 8'
        },
        {
            name: 'Project 9',
            // only save address to server. Save to addressbook as well?
            address: 'address_9',
            ownerAddress: 'project9_owner_address',
            // 160 chars max. use textfield ??
            description: 'This is project 9'
        },
        {
            name: 'Project 10',
            // only save address to server. Save to addressbook as well?
            address: 'address_10',
            ownerAddress: 'project10_owner_address',
            // 160 chars max. use textfield ??
            description: 'This is project 10'
        },
    ]
}
export default ProjectList

export class ProjectItem extends ReactiveComponent {
    constructor() {
        super()
    }

    render() {
        const { type } = this.props
        return (
            <div></div>
        )
    }
}

ProjectItem.propTypes = {
    type: PropTypes.string // type of list
}