import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtime, secretStore } from 'oo7-substrate'
import FormBuilder, { fillValues } from './FormBuilder'
import { arrSort, generateHash, isDefined, isFn, isObj } from '../utils'
import storageService  from '../../services/storage'
import { addToQueue } from '../../services/queue'
import { Pretty } from '../../Pretty'

class Project extends ReactiveComponent {
    constructor(props) {
        super(props, {
            secretStore: secretStore(),
        })

        this.handleSubmit = this.handleSubmit.bind(this)
        const selectedWallet = secretStore().use()._value.keys[storageService.walletIndex()].address

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
                    disabled: !!props.hash,
                    label: 'Owner Address',
                    name: 'ownerAddress',
                    onChange: (_, values) => this.checkOwnerBalance(values),
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
            // Check if wallet has balance
            this.checkOwnerBalance(props.project || {ownerAddress: selectedWallet})
        })
    }

    checkOwnerBalance(values) {
        const { hash, project } = this.props
        const { ownerAddress } = values
        const { inputs } = this.state
        const isCreate = !hash
        const index = this.state.inputs.findIndex(x => x.name === 'ownerAddress')
        // minimum balance required
        const minBalance = 500
        const signer = isCreate ? ownerAddress : project.ownerAddress
        // do not check if owner address has not been changed
        if (!signer || (!isCreate && ownerAddress === project.ownerAddress)) return;
        // keep input field in invalid state until verified
        inputs[index].invalid = true
        inputs[index].message = {
            content: 'Checking balance....',
            showIcon: true,
            status: 'loading'
        }
        this.setState({inputs})
        // check if singing address has enough funds
        runtime.balances.balance(signer).then(balance => {
            const notEnought = balance <= minBalance
            inputs[index].invalid = notEnought
            inputs[index].message = !notEnought ? {} : {
                content: `You must have more than ${minBalance} Blip balance 
                        in the wallet named "${secretStore().find(signer).name}". 
                        This is requied to create a blockchain transaction.`,
                header: 'Insufficient balance',
                status: 'error',
                showIcon: true
            }
            this.setState({inputs});
        })
    }

    handleSubmit(e, values) {
        const { onSubmit, hash: existingHash } = this.props
        const create = !existingHash
        const hash = existingHash || generateHash(values)
        const { name: projectName, ownerAddress } = values
        let message = {
            content: `Your project will be ${create ? 'created': 'updated'} shortly. 
                You will received toast messages notifying you of progress. 
                You may close the dialog now.`,
            header: `Project  ${create ? 'creation': 'update'} has been queued`,
            status: 'success',
            showIcon: true
        }
        
        this.setState({closeText: 'Close', message, success: true})
        
        // Add or update project to web storage
        const clientTask = {
            type: 'ChatClient',
            func: 'project',
            args: [
                hash,
                values,
                create,
                err => isFn(onSubmit) && onSubmit(e, values, !err)
            ],
            title: `${create ? 'Create' : 'Update'} project`,
            description: 'Name: ' + projectName,
        }

        // Send transaction to blockchain first, then add to web storage
        const blockchainTask = {
            type: 'blockchain',
            func: 'addNewProject',
            args: [ownerAddress, hash],
            title: 'Create project',
            description: 'Name: ' + projectName,
            next: clientTask
        }

        addToQueue(create ? blockchainTask : clientTask)
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
        const { closeText, inputs, loading, message, open, secretStore, success } = this.state
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
            description: <Pretty value={runtime.balances.balance(ss58Decode(wallet.address))} />,
            value: wallet.address
        })))


        return (
            <FormBuilder {...{
                closeText,
                header: header || (project ? 'Edit ' + project.name : 'Create a new project'),
                headerIcon: headerIcon || (project ? 'edit' : 'plus'),
                inputs,
                loading,
                message,
                modal,
                onClose,
                onOpen,
                open: isOpenControlled ? propsOpen : open,
                onSubmit: this.handleSubmit,
                size,
                subheader,
                submitText : !!hash ? 'Update' : 'Create',
                success,
                trigger,
            }} />
        )
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
        fontSize: '1em'
    }
}