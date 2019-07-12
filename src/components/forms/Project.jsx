import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import createHash from 'create-hash'
import FormBuilder, { fillValues } from './FormBuilder'
import { sortArr, isDefined, isFn, isObj, textEllipsis } from '../utils'
import { confirm } from '../../services/modal'
import addressbook  from '../../services/addressbook'

class Project extends ReactiveComponent {
    constructor(props) {
        super(props, {
            secretStore: secretStore(),
            _: addressbook.getBond()
        })

        this.handleOwnerChange = this.handleOwnerChange.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)

        this.state = {
            closeText: 'Cancel',
            message: {},
            open: props.open,
            success: false,
            inputs: [
                {
                    label: 'Project Name',
                    name: 'name',
                    minLength: 3,
                    placeholder: 'Enter project name',
                    type: 'text',
                    required: true,
                    value: ''
                },
                {
                    label: 'Owner Address',
                    name: 'ownerAddress',
                    placeholder: 'Select owner',
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
    }

    handleOwnerChange(e, data, i) {
        const { project } = this.props
        const { inputs } = this.state
        if (!isObj(project) || !project.ownerAddress) return;
        // attach a confirm dialog on change
        if (project.ownerAddress === data.value) return;
        confirm({
            cancelButton: {
                content: 'Cancel',
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
                // revert to original address
                inputs[i].value = project.ownerAddress
                this.setState({inputs})
            },
            size: 'tiny'
        })
    }

    handleSubmit(e, values) {
        const { onSubmit, project } = this.props
        const success = true
        isFn(onSubmit) && onSubmit(e, values, success)
        values.hash = createHash('sha256')

        const message = {
            header: `Project ${isObj(project) ? 'updated' : 'created'} successfully`,
            status: 'success'
        }
        this.setState({closeText: 'Close', message, success})
    }

    render() {
        const {
            header,
            headerIcon,
            modal,
            onOpen,
            onClose,
            open: propsOpen,
            project, 
            size,
            subheader,
            submitText,
            trigger
        } = this.props
        const { closeText, inputs, message, open, secretStore, success } = this.state
        const addrs = addressbook.getAll()
        const isOpenControlled = modal && !trigger && isDefined(propsOpen)
        const openModal = isOpenControlled ? propsOpen : open
        const ownerDD = inputs.find(x => x.name === 'ownerAddress')

        // add tittle item
        ownerDD.options = [{
            key: 0,
            style: styles.itemHeader,
            text: 'Wallets',
            value: '' // keep
        }]
        // add wallet items to owner address dropdown
        .concat(sortArr(secretStore && secretStore.keys || [] , 'name').map((wallet, i) => ({
            key: 'wallet-'+i+ wallet.address,
            text: wallet.name,
            description: textEllipsis(wallet.address, 25, 5),
            value: wallet.address
        })))
        if (addrs.length > 0) {
            // add title item
            ownerDD.options = ownerDD.options.concat([{
                key: 1,
                style: styles.itemHeader,
                text: 'Addressbook',
                value: '' // keep
            }])
            // Add addressbook items
            .concat(sortArr(addrs, 'name').map((item, i) => ({
                key: 'addressbook-' + i + item.address,
                text: item.name,
                description: textEllipsis(item.address, 25, 5),
                value: item.address
            })))
        }
        
        if ( isObj(project) ) {
            // prefill values if needed
            fillValues(inputs, project, true)
            ownerDD.onChange = this.handleOwnerChange
        }

        return (
            <FormBuilder
                closeText={closeText}
                header={header || (project ? 'Edit ' + project.name : 'Create a new project')}
                headerIcon={headerIcon || (project ? 'edit' : 'plus')}
                inputs={inputs}
                message={message}
                modal={modal}
                onCancel={onClose}
                onClose={onClose}
                onOpen={onOpen}
                open={openModal}
                onSubmit={this.handleSubmit}
                size={size}
                subheader={subheader}
                submitText={submitText}
                success={success}
                trigger={trigger}
            />
        )
    }
}
Project.propTypes = {
    modal: PropTypes.bool,
    onClose: PropTypes.func,
    onOpen: PropTypes.func,
    project: PropTypes.object, // if supplied prefill form
    size: PropTypes.string,
    submitText: PropTypes.string,
    trigger: PropTypes.element
}
Project.defaultProps = {
    modal: false,
    size: 'tiny',
    submitText: 'Submit'
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