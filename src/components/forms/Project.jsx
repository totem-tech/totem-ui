import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import uuid from 'uuid'
import { dropMessages, addResponseMessage, isWidgetOpened, toggleWidget } from 'react-chat-widget'
import FormBuilder from './FormBuilder'
import { deferred, isDefined, isFn } from '../utils'
import { getClient } from '../ChatClient'

class Project extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            message: {},
            open: isDefined(props.open) ? props.open : false,
        }

        this.inputs = [
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
                // additionLabel: <p>Create new wallet with name:</p>,
                // allowAdditions: true,
                label: 'Project Address',
                name: 'address',
                options: Array(10).fill(0).map((_, i) => ({
                    key: 'wallet_'+i,
                    text: 'wallet_'+i,
                    value: 'wallet_'+i
                })),
                placeholder: 'Select a wallet',
                selection: true,
                search: true,
                type: 'dropdown',
                required: true
            },
            {
                fluid: true,
                label: 'Owner',
                name: 'ownerAddress',
                type: 'dropdown',
                options: Array(10).fill(0).map((_, i) => ({
                    key: 'Owner_Address_'+i,
                    text: 'Owner_Address_'+i,
                    value: 'Owner_Address_'+i
                })),
                placeholder: 'Select owner',
                required: true,
                selection: true
                // value: true
            },
            {
                label: 'Description',
                name: 'description',
                maxLength: 160,
                type: 'textarea',
                placeholder: 'Enter short description.... (max 160 characters)',
                required: true,
                // value: true
            }
        ]

        // this.handleCancel = this.handleCancel.bind(this)
        this.handleClose = this.handleClose.bind(this)
        this.handleOpen = this.handleOpen.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
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
    }

    render() {
        const { header, headerIcon, modal, project, size, subheader, trigger } = this.props
        const { message, open } = this.state
        const { inputs } = this
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
                open={open}
                onSubmit={this.handleSubmit}
                size={size || 'tiny'}
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