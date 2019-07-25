import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { addCodecTransform, runtime, secretStore } from 'oo7-substrate'
import FormBuilder, { fillValues } from './FormBuilder'
import { arrSort, generateHash, isDefined, isFn, isObj, textEllipsis } from '../utils'
import { confirm } from '../../services/modal'
import addressbook  from '../../services/addressbook'
import storageService  from '../../services/storage'
import client from '../../services/ChatClient'
import { addNewProject } from '../../services/project'

// message icons
const successIcon = 'check circle outline'
const errIcon = 'exclamation circle'
const loadingIcon = { name: 'circle notched', loading: true }

class Project extends ReactiveComponent {
    constructor(props) {
        super(props, {
            secretStore: secretStore(),
            _: addressbook.getBond()
        })
        
        // Tells the blockchain to to handle custom runtime function??
        addCodecTransform('ProjectHash', 'Hash')

        this.handleSubmit = this.handleSubmit.bind(this)
        const selectedWallet = secretStore().use()._value.keys[storageService.walletIndex()].address

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
                    value: props.hash ? undefined : selectedWallet
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
        if (isObj(props.project)) fillValues(this.state.inputs, props.project, true)
        setTimeout(() => {
            const index = this.state.inputs.findIndex(x => x.name === 'ownerAddress')
            // Trigger on change to check balance
            this.checkBalance(props.project || {ownerAddress: selectedWallet}, index)
        })
    }
    checkBalance(values, i) {
        const { hash, project } = this.props
        const { ownerAddress } = values
        const { inputs } = this.state
        const isCreate = !hash
        // minimum balance required
        const minBalance = 500
        const signer = isCreate ? values.ownerAddress : project.ownerAddress
        // do not check if owner address has not been changed
        if (!signer || (!isCreate && ownerAddress === project.ownerAddress)) return;
        // keep input field in invalid state until verified
        inputs[i].invalid = true
        inputs[i].message = {
            content: 'Checking balance....',
            icon: loadingIcon,
            status: 'warning'
        }
        this.setState({inputs})
        // check if singing address has enough funds
        runtime.balances.balance(signer).then(balance => {
            const notEnought = balance <= minBalance
            inputs[i].invalid = notEnought
            inputs[i].message = !notEnought ? {} : {
                content: `You must have more than ${minBalance} rockets balance 
                        in the wallet named "${secretStore().find(signer).name}". 
                        This is requied to create a blockchain transaction.`,
                header: 'Insufficient balance',
                status: 'error',
                icon: errIcon
            }
            this.setState({inputs});
        })
    }
    handleOwnerChange(_, values, i) {
        const { hash, project } = this.props
        const walletAddrs = this.state.secretStore.keys.map(x => x.address)
        const { ownerAddress } = values
        const { inputs } = this.state
        const isCreate = !hash
        // Confirm if selected owner address is not owned by user
        const doConfirm = !ownerAddress || walletAddrs.indexOf(ownerAddress) < 0
        
        !doConfirm ? this.checkBalance(values, i) : confirm({
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
            onConfirm: () => this.checkBalance(values, i),
            size: 'tiny'
        })
    }

    handleSubmit(e, values) {
        const { onSubmit, hash: existingHash } = this.props
        const create = !existingHash
        const hash = existingHash || generateHash(values)
        // prevent modal from being closed
        let keepOpen = true
        let loading = true
        let closeText = null
        let message = {
            content: 'Hold tight. This will take a moment.',
            header: 'Creating blockchain transaction',
            icon: loadingIcon,
            status: 'warning'
        }
        
        this.setState({closeText, loading, message, success: true, keepOpen})

        const saveData = ()=> client.project(hash, values, create, (err, exists) => {
            let success = !err
            // fail or update success
            isFn(onSubmit) && onSubmit(e, values, success)
            const actionText = create ? 'create' : 'update'
            message = success ? {
                content: 'You may close the dialog now',
                header: `Project ${actionText}d successfully`, 
                icon: successIcon,
                status: 'success'
            } : {
                content: err,
                header:`Failed to ${actionText} project`,
                icon: errIcon,
                status: 'error'
            }
            return this.setState({ 
                closeText: success ? 'Close' : 'Cancel',
                loading: false,
                message,
                keepOpen: false,
                success
            })
        })

        if (!create) return saveData();

        // Send to blockchain
        const bond = addNewProject(values.ownerAddress, hash)
        bond.tie((result, tieId) => {
            if (!isObj(result)) return;
            const { failed, finalized, sending, signing } = result
            const done = finalized || failed
            message.header = finalized ? 'Storing project data' : (
                signing ? 'Signing transaction' : (
                    sending ? 'Sending transaction' : `Error: ${failed && failed.code}`
                )
            )

            if (failed) {
                message.content = `${failed.message}. Make sure you have enough funds in your wallet`
                message.icon = errIcon
                message.status = 'error'
                keepOpen = false
                loading = false
                closeText = 'Cancel'
            }

            // Remove callback from bond
            if (done) bond.untie(tieId)

            this.setState({
                closeText,
                keepOpen,
                loading,
                message,
                success: !failed
            })
            // update project status to 1/open
            finalized && saveData()
        })
    }

    handleSubmitOld(e, values) {
        const { onSubmit, hash: existingHash } = this.props
        const create = !existingHash
        const hash = existingHash || generateHash(values)
        const successIcon = 'check circle outline'
        const errIcon = 'exclamation circle'
        // prevent modal from being closed
        let keepOpen = true
        let loading = true
        let message = {
            header: {
                content: 'Creating project'
            },
            icon: { name: 'circle notched', loading: true },
            status: 'warning'
        }
        this.setState({loading, success: true, message, keepOpen})
        client.project(hash, values, create, (err, exists) => {
            let success = !err
            if (!success || !create) {
                // fail or update success
                isFn(onSubmit) && onSubmit(e, values, success)
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
            const bond = addNewProject(values.ownerAddress, hash)
            bond.tie((result, tieId) => {
                if (!isObj(result)) return;
                const { failed, finalized, sending, signing } = result
                message.header = finalized ? 'Project created successfully' : (
                    signing ? 'Signing transaction' : (
                        sending ? 'Sending transaction' : 'Error: ' + (failed && failed.code)
                    )
                )

                if (finalized || failed) {
                    message.content = !failed ? 'You may close the dialog now' : failed.message
                    message.icon = failed ? errIcon : successIcon
                    message.status = failed ? 'error' : 'success'
                    keepOpen = false
                    loading = false
                    bond.untie(tieId)
                }
                this.setState({
                    loading,
                    message,
                    closeText: finalized ? 'Close' : 'Cancel',
                    keepOpen,
                    status: finalized ? 'warning' : 'success'
                })

                // update project status to 1/open
                finalized && client.projectStatus(hash, 1, (err) => {
                    isFn(onSubmit) && onSubmit(e, values, success)
                })
            })
        })
    }

    render() {
        const {
            header,
            headerIcon,
            hash,
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
            description: textEllipsis(wallet.address, 15),
            value: wallet.address
        })))
        // Add addressbook items only when updating the project
        if (!!hash && addrs.length > 0) {
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
                description: textEllipsis(item.address, 15),
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
            submitText : !!hash ? 'Update' : 'Create',
            success,
            trigger,
        }

        return <FormBuilder {...formProps}/>
    }
}
Project.propTypes = {
    // Project hash
    hash: PropTypes.string,
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