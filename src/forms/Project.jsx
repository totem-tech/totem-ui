import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtime } from 'oo7-substrate'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import { arrSort, generateHash, isDefined, isFn, isObj, objCopy } from '../utils/utils'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { Pretty } from '../Pretty'
import addressbook from '../services/partners';
import { confirm } from '../services/modal'
import identityService from '../services/identity'

// Create or update project form
class Project extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleSubmit = this.handleSubmit.bind(this)
        this.checkOwnerBalance = checkBalance.bind(this)
        const { address: selectedAddress } = identityService.getSelected()

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
                    label: 'Select a Project Owner Identity',
                    name: 'ownerAddress',
                    onChange: (_, values) => {
                        const { hash, project } = this.props
                        const isCreate = !hash
                        const signerAddress = isCreate ? values.ownerAddress : project.ownerAddress
                        // do not check if owner address has not been changed
                        if (!signerAddress) return;
                        this.checkOwnerBalance(signerAddress, 'ownerAddress')
                    },
                    placeholder: 'Select owner',
                    type: 'dropdown',
                    search: true,
                    selection: true,
                    required: true,
                    value: props.hash ? undefined : selectedAddress
                },
                {
                    label: 'Project Description',
                    name: 'description',
                    maxLength: 160,
                    type: 'textarea',
                    placeholder: 'Enter short description of the project... (max 160 characters)',
                    required: true,
                }
            ]
        }

        // prefill values if needed
        if (isObj(props.project)) fillValues(this.state.inputs, props.project, true)
        setTimeout(() => {
            // Check if wallet has balance
            this.checkOwnerBalance(props.project ? props.project.ownerAddress : selectedAddress, 'ownerAddress')
        })
    }

    handleSubmit(e, values) {
        const { onSubmit, hash: existingHash } = this.props
        const create = !existingHash
        const hash = existingHash || generateHash(values)
        const { name: projectName, ownerAddress } = values
        let message = {
            content: `Your project will be ${create ? 'created' : 'updated'} shortly. 
                You will received  messages notifying you of progress. 
                You may close the dialog now.`,
            header: `Project  ${create ? 'creation' : 'update'} has been queued`,
            status: 'success',
            showIcon: true
        }

        this.setState({ closeText: 'Close', message, success: true })

        // Add or update project to web storage
        const clientTask = {
            type: QUEUE_TYPES.CHATCLIENT,
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
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'addNewProject',
            args: [ownerAddress, hash],
            address: ownerAddress,
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
        const { closeText, inputs, loading, message, open, success } = this.state
        const isOpenControlled = modal && !trigger && isDefined(propsOpen)
        const ownerDD = inputs.find(x => x.name === 'ownerAddress')

        // add tittle item
        ownerDD.options = [{
            key: 0,
            style: styles.itemHeader,
            text: 'Identities',
            value: '' // keep
            // add wallet items to owner address dropdown
        }].concat(arrSort(identityService.getAll(), 'name').map((wallet, i) => ({
            key: 'wallet-' + i + wallet.address,
            text: wallet.name,
            description: <Pretty value={runtime.balances.balance(ss58Decode(wallet.address))} />,
            value: wallet.address
        })))


        return (
            <FormBuilder {...{
                closeText,
                header: header || (project ? 'Edit : ' + project.name : 'Create a new project'),
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
                submitText: !!hash ? 'Update' : 'Create',
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

// todo: deprecate
function checkBalance(address, inputName) {
    const { inputs } = this.state
    const index = this.state.inputs.findIndex(x => x.name === inputName)
    const wallet = identityService.find(address)
    // minimum balance required
    const minBalance = 500
    // keep input field in invalid state until verified
    inputs[index].invalid = true

    if (!wallet) {
        inputs[index].message = {
            header: 'This Identity does not belong to you!',
            showIcon: true,
            status: 'error'
        }

        return this.setState({ inputs })
    }
    inputs[index].message = {
        content: 'Checking balance...',
        showIcon: true,
        status: 'loading'
    }
    this.setState({ inputs })
    // check if singing address has enough funds
    runtime.balances.balance(address).then(balance => {
        const notEnought = balance <= minBalance
        inputs[index].invalid = notEnought
        inputs[index].message = !notEnought ? {} : {
            content: `The selected identity "${wallet.name}" must have more than ${minBalance} Transactions balance 
                    to be able to create an entry on the Totem blockchain.`,
            header: 'Insufficient balance',
            status: 'error',
            showIcon: true
        }
        this.setState({ inputs });
    })
}