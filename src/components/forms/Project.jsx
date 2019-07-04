import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { addressBook, secretStore } from 'oo7-substrate'
import uuid from 'uuid'
import { dropMessages, addResponseMessage, isWidgetOpened, toggleWidget } from 'react-chat-widget'
import FormBuilder, { fillValues } from './FormBuilder'
import { sortArr, deferred, isDefined, isFn, isObj, textEllipsis } from '../utils'
import { getClient } from '../ChatClient'
import { confirm } from '../../services/modal'

class Project extends ReactiveComponent {
    constructor(props) {
        super(props, {
            secretStore: secretStore(),
            addressBook: addressBook()
        })

        this.handleClose = this.handleClose.bind(this)
        this.handleOpen = this.handleOpen.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
        this.handleAddressChange = this.handleAddressChange.bind(this)

        this.state = {
            message: {},
            open: props.open,
        }

        this.state.inputs = [
            {
                label: 'Project Name',
                name: 'name',
                minLength: 3,
                maxLength: 16,
                placeholder: 'Enter project name',
                type: 'text',
                required: true
            },
            {
                // additionLabel: 'Create new wallet: ',
                // allowAdditions: true,
                label: 'Project Address',
                name: 'address',
                onChange: this.handleAddressChange,
                placeholder: 'Select a wallet',
                selection: true,
                // search: true,
                type: 'dropdown',
                required: true
            },
            {
                label: 'Owner Address',
                name: 'ownerAddress',
                placeholder: 'Enter owner',
                type: 'dropdown',
                selection: true,
                required: true,
            },
            {
                label: 'Description',
                name: 'description',
                maxLength: 160,
                type: 'textarea',
                placeholder: 'Enter short description.... (max 160 characters)',
                required: true,
            }
        ]
    }

    handleClose(e, d) {
        const { onClose } = this.props
        this.setState({open: false})
        isFn(onClose) && onClose(e, d)
    }

    handleOpen(e, d) {
        const { onOpen } = this.props
        this.setState({open: true})
        isFn(onOpen) && onOpen(e, d)
    }

    handleSubmit(e, values) {
        alert('Not implemented')
        console.log('values', values)
    }

    handleAddressChange(e, data, i) {
        const { project } = this.props
        const { inputs } = this.state
        if (!isObj(project)) return;
        // attach a confirm dialog on change
        if (project.address !== data.value) {
            confirm({
                cancelButton: {
                    content: 'Cancel and revert change',
                    color: 'green'
                },
                confirmButton: {
                    content: 'Proceed',
                    color: 'red',
                    primary: false
                },
                content: 'You are about to re-assign owner of this project.',
                header: 'Re-assign owner?',
                onCancel: ()=> {
                    inputs[i].value = project.address
                    this.setState({inputs})
                    console.log('selected address', data.value)
                    console.log('original address', project.address)
                },
                size: 'tiny'
            })
        }
    }

    render() {
        const { header, headerIcon, modal, open: propsOpen, project, size, subheader, trigger } = this.props
        const { addressBook, inputs, message, open, secretStore } = this.state
        const abAddresses = addressBook && addressBook.accounts || []
        const isOpenControlled = modal && !trigger && isDefined(propsOpen)
        const openModal = isOpenControlled ? propsOpen : open
        const addressDD = inputs.find(input => input.name === 'address')
        const ownerDD = inputs.find(input => input.name === 'ownerAddress')
        addressDD.options = sortArr(secretStore && secretStore.keys || [] , 'name').map((wallet, i) => ({
            key: 'wallet' + wallet.address,
            text: wallet.name,
            description: textEllipsis(wallet.address, 25, 5),
            value: wallet.address
        }))

        // add wallet items to owner address dropdown
        ownerDD.options = [{
            key: 0,
            style: styles.itemHeader,
            text: 'Wallets',
        }].concat(addressDD.options)
        // Add addressbook items if available
        if (abAddresses.length > 0) {
            ownerDD.options = ownerDD.options.concat([{
                key: 1,
                style: styles.itemHeader,
                text: 'Addressbook'
            }])
            .concat(sortArr(abAddresses, 'name').map( item => ({
                key: 'addressbook' + item.address,
                text: item.name,
                description: textEllipsis(item.address, 25, 5),
                value: item.address
            })))
        }
        
        if ( isObj(project) ) {
            // prefill values if needed
            fillValues(inputs, project, false)
            
        }
        return (
            <FormBuilder
                trigger={trigger}
                header={header || (project ? 'Edit ' + project.name : 'Create a new project')}
                headerIcon={headerIcon || (project ? 'edit' : 'plus')}
                inputs={inputs}
                message={message}
                modal={modal}
                onCancel={this.handleClose}
                onClose={this.handleClose}
                onOpen={this.handleOpen}
                open={openModal}
                onSubmit={this.handleSubmit}
                size={size || 'tiny'}
                subheader={subheader}
                submitText={'Submit'}
            />
        )
    }
}
Project.propTypes = {
    modal: PropTypes.bool,
    onClose: PropTypes.func,
    onOpen: PropTypes.func,
    project: PropTypes.object, // ToDo: use this to determine whether to create or update a project
    size: PropTypes.string,
    trigger: PropTypes.element
}
Project.defaultProps = {

}
export default Project

const styles = {
    itemHeader: { 
        background: 'grey', 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: '1.5em'
    }
}