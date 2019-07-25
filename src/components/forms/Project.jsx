import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { addCodecTransform, secretStore } from 'oo7-substrate'
import FormBuilder, { fillValues } from './FormBuilder'
import { arrSort, generateHash, isDefined, isFn, isObj, textEllipsis } from '../utils'
import { confirm } from '../../services/modal'
import addressbook  from '../../services/addressbook'
import storageService  from '../../services/storage'
import client from '../../services/ChatClient'
import { addNewProject } from '../../services/project'

class Project extends ReactiveComponent {
    constructor(props) {
        super(props, {
            secretStore: secretStore(),
            _: addressbook.getBond()
        })
        
        // Tells the blockchain to to handle custom runtime function??
        addCodecTransform('ProjectHash', 'Hash')

        this.handleSubmit = this.handleSubmit.bind(this)

        this.state = {
            closeText: 'Cancel',
            loading: false,
            message: {},
            keepOpen: false,
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
                    onChange: this.handleOwnerChange.bind(this),
                    placeholder: 'Select owner',
                    type: 'dropdown',
                    search: true,
                    selection: true,
                    required: true,
                    value: props.id ? undefined : secretStore().use()._value.keys[storageService.walletIndex()].address
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

        // prefill values if needed
        isObj(props.project) && fillValues(this.state.inputs, props.project, true)
    }

    handleOwnerChange(e, values, i) {
        const { project } = this.props
        const walletAddrs = this.state.secretStore.keys.map(x => x.address)
        const { ownerAddress } = values
        // Confirm if selected owner address is not owned by user
        if (!ownerAddress || walletAddrs.indexOf(ownerAddress) >= 0) return;
        confirm({
            cancelButton: { content: 'Cancel', color: 'green' },
            confirmButton: { content: 'Proceed', color: 'red', primary: false },
            content: 'You are about to assign owner of this project to an address that does not belong to you.'
                + ' If you continue, you will no longer be able to update this project.',
            header: 'Are you sure?',
            onCancel: ()=> {
                const { inputs } = this.state
                // revert to original address
                inputs[i].value = (project || {}).ownerAddress
                this.setState({inputs})
            },
            size: 'tiny'
        })
    }

    handleSubmit(e, values) {
        const { onSubmit, id } = this.props
        const create = !id
        const hash = id || generateHash(values)
        const successIcon = 'check circle outline'
        const errIcon = 'exclamation circle'
        // prevent modal from being closed
        let keepOpen = true
        let message = {
            header: {
                content: 'Creating project'
            },
            icon: { name: 'circle notched', loading: true },
            status: 'warning'
        }
        this.setState({loading: true, success: true, message, keepOpen})
        client.project(hash, values, create, (err, exists) => {
            let success = !err
            isFn(onSubmit) && onSubmit(e, values, success)
            if (!success || !create) {
                // fail or update success
                message = {
                    content: err,
                    header: !success ? (
                        `Failed to ${create ? 'create' : 'update'} project`
                     ) : 'Project updated successfully',
                    icon: !success  ? errIcon : successIcon,
                    status: success ? 'success' : 'error'
                }
                return this.setState({ 
                    closeText: success ? 'Close' : 'Cancel',
                    loading: false,
                    message,
                    keepOpen: false,
                    success
                })
            }
            // Project created
            message.header.content = 'Storing project on blockchain'
            message.content = 'Hold tight. This will take a moment.'
            this.setState({message})

            // Send to blockchain
            const bond = addNewProject(values.ownerAddress, hash).tie((result, tieId) => {
                if (!isObj(result)) return;
                const { failed, finalized, sending, signing } = result
                message.header = finalized ? 'Project created successfully' : (
                    signing ? 'Signing transaction' : (
                        sending ? 'Sending transaction' : 'Error!'
                    )
                )

                if (finalized || failed) {
                    message.content = !failed ? 'You may close the dialog now' : (
                        `Error Code: ${failed.code}. Message: ${failed.message}`
                    )
                    message.icon = failed ? errIcon : successIcon
                    message.status = failed ? 'error' : 'success'
                    keepOpen = false
                    bond.untie(tieId)
                }
                this.setState({
                    loading: !finalized,
                    message,
                    closeText: finalized ? 'Close' : null,
                    keepOpen,
                    status: finalized ? 'warning' : 'success'
                })
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
        const { closeText, inputs, keepOpen, loading, message, open, secretStore, success } = this.state
        const addrs = addressbook.getAll()
        const isOpenControlled = modal && !trigger && isDefined(propsOpen)
        const ownerDD = inputs.find(x => x.name === 'ownerAddress')

        // add tittle item
        ownerDD.options = [{
            key: 0,
            style: styles.itemHeader,
            text: 'Wallets',
            value: '' // keep
        }]
        // add wallet items to owner address dropdown
        .concat(arrSort(secretStore && secretStore.keys || [] , 'name').map((wallet, i) => ({
            key: 'wallet-'+i+ wallet.address,
            text: wallet.name,
            description: textEllipsis(wallet.address, 25, 5),
            value: wallet.address
        })))
        // Add addressbook items only when updating the project
        if (!!id && addrs.length > 0) {
            // add title item
            ownerDD.options = ownerDD.options.concat([{
                key: 1,
                style: styles.itemHeader,
                text: 'Addressbook',
                value: '' // keep
            }])
            // Add addressbook items
            .concat(arrSort(addrs, 'name').map((item, i) => ({
                key: 'addressbook-' + i + item.address,
                text: item.name,
                description: textEllipsis(item.address, 25, 5),
                value: item.address
            })))
        }

        const formProps = {
            closeText,
            header: header || (project ? 'Edit ' + project.name : 'Create a new project'),
            headerIcon: headerIcon || (project ? 'edit' : 'plus'),
            inputs,
            loading,
            message,
            modal,
            // Prevent closing by passing an empty function
            onClose: keepOpen ? () => {} : onClose,
            onOpen,
            open: isOpenControlled ? propsOpen : open,
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