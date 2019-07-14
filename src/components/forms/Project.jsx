import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import FormBuilder, { fillValues } from './FormBuilder'
import { generateHash, isDefined, isFn, isObj, sortArr, textEllipsis } from '../utils'
import { confirm } from '../../services/modal'
import addressbook  from '../../services/addressbook'
import client from '../ChatClient'

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
            loading: false,
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
                    search: true,
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

    handleOwnerChange(e, values, i) {
        const { project } = this.props
        if (!isObj(project) || !project.ownerAddress) return;
        // attach a confirm dialog on change
        if (project.ownerAddress === values.ownerAddress) return;
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
            content: 'You are about to re-assign owner of this project. You will no longer be able to update this project. Are you sure?',
            header: 'Re-assign owner?',
            onCancel: ()=> {
                const { inputs } = this.state
                // revert to original address
                inputs[i].value = project.ownerAddress
                this.setState({inputs})
            },
            size: 'tiny'
        })
    }

    handleSubmit(e, values) {
        const { onSubmit, id } = this.props
        this.setState({loading: true, success: true})
        const hash = id || generateHash(JSON.stringify(values))
        client.project(hash, values, (err, exists) => {
            const success = !err
            isFn(onSubmit) && onSubmit(e, values, success)
            let message = {}
            if(!success) {
                // Error
                message = {
                    content: err,
                    header: 'Failed to create project',
                    status: 'error'
                }
            } else if (!id && exists) {
                // Attempt to create a new project with exact same details of an existing project
                message = {
                    content: 'Please use a different address/name',
                    header: 'Project already exists',
                    status: 'error'
                }
            } else {
                // success
                message = {
                    header: `Project ${!!exists ? 'updated' : 'created'} successfully`,
                    status: 'success'
                }
            }
            
            this.setState({
                closeText: success ? 'Close' : 'Cancel', 
                loading: false,
                message, 
                success
            })
        })
    }

    render() {
        const {
            header,
            headerIcon,
            id,
            modal,
            onOpen,
            onClose,
            open: propsOpen,
            project, 
            size,
            subheader,
            trigger
        } = this.props
        const { closeText, inputs, loading, message, open, secretStore, success } = this.state
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

        const formProps = {
            closeText,
            header: header || (project ? 'Edit ' + project.name : 'Create a new project'),
            headerIcon: headerIcon || (project ? 'edit' : 'plus'),
            inputs,
            loading,
            message,
            modal,
            onClose,
            onOpen,
            open: openModal,
            onSubmit: this.handleSubmit,
            size,
            subheader,
            submitText : !!id ? 'Update' : 'Create',
            success,
            trigger,
        }

        return <FormBuilder {...formProps}/>
    }
}
Project.propTypes = {
    // Project ID/hash
    id: PropTypes.string,
    modal: PropTypes.bool,
    onClose: PropTypes.func,
    onOpen: PropTypes.func,
    project: PropTypes.object, // if supplied prefill form
    size: PropTypes.string,
    // Element to 'trigger'/open the modal, modal=true required
    trigger: PropTypes.element
}
Project.defaultProps = {
    modal: false,
    size: 'tiny'
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