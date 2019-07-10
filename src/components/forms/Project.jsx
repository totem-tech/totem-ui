import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { secretStore } from 'oo7-substrate'
import { Button } from 'semantic-ui-react'
import FormBuilder, { fillValues } from './FormBuilder'
import { sortArr, deferred, isDefined, isFn, isObj, textEllipsis } from '../utils'
import { confirm, showForm } from '../../services/modal'
import addressbook  from '../../services/addressbook'
import WalletForm from './Wallet'

class Project extends ReactiveComponent {
    constructor(props) {
        super(props, {
            secretStore: secretStore(),
            _: addressbook.getBond()
        })

        this.handleClose = this.handleClose.bind(this)
        this.handleOpen = this.handleOpen.bind(this)
        this.handleOwnerChange = this.handleOwnerChange.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
        this.handleWalletCreate = this.handleWalletCreate.bind(this)

        this.state = {
            message: {},
            open: props.open,
            success: false,
            inputs: [
                {
                    label: 'Project Name',
                    name: 'name',
                    minLength: 3,
                    maxLength: 16,
                    placeholder: 'Enter project name',
                    type: 'text',
                    required: true,
                    value: ''
                },
                {
                    action: <Button icon="plus" content="New" onClick={ this.handleWalletCreate }/>,
                    label: 'Project Address',
                    name: 'address',
                    placeholder: 'Generate a new address',
                    readOnly: true,
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
        const { onSubmit } = this.props
        const success = true
        isFn(onSubmit) && onSubmit(e, values, success)
        this.setState({success})
        alert('Not implemented')
    }

    handleOwnerChange(e, data, i) {
        const { project } = this.props
        const { inputs } = this.state
        if (!isObj(project)) return;
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

    handleWalletCreate(e) {
        e.preventDefault()
        const { inputs } = this.state
        showForm( WalletForm, {
            modal: true,
            closeOnSubmit: true,
            onSubmit: (values) => {
                const newWallet = secretStore().find(values.name)
                inputs.find(x => x.name === 'address').value = newWallet.address
                this.setState({inputs})
            }
        })
    }

    render() {
        const {
            header,
            headerIcon,
            modal,
            open: propsOpen,
            project, 
            size,
            subheader,
            submitText,
            trigger
        } = this.props
        const { inputs, message, open, secretStore, success } = this.state
        const addrs = addressbook.getAll()
        const isOpenControlled = modal && !trigger && isDefined(propsOpen)
        const openModal = isOpenControlled ? propsOpen : open
        const ownerDD = inputs.find(x => x.name === 'ownerAddress')
        const addressInput = inputs.find(x => x.name === 'address')

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
            // add tittle item
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
            addressInput.disabled = true
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
                size={size}
                subheader={subheader}
                submitText={submitText}
                success={success}
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