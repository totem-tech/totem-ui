import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { runtime, secretStore } from 'oo7-substrate'
import FormBuilder, { fillValues } from '../components/FormBuilder'
import { arrSort, generateHash, isDefined, isFn, isObj, objCopy } from '../utils/utils'
import storageService from '../services/storage'
import { addToQueue, QUEUE_TYPES } from '../services/queue'
import { Pretty } from '../Pretty'
import addressbook from '../services/addressbook';
import { confirm } from '../services/modal'

// Create or update project form
class Project extends ReactiveComponent {
    constructor(props) {
        super(props, {
            secretStore: secretStore(),
        })

        this.handleSubmit = this.handleSubmit.bind(this)
        this.checkOwnerBalance = checkBalance.bind(this)
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
            this.checkOwnerBalance(props.project ? props.project.ownerAddress : selectedWallet, 'ownerAddress')
        })
    }

    handleSubmit(e, values) {
        const { onSubmit, hash: existingHash } = this.props
        const create = !existingHash
        const hash = existingHash || generateHash(values)
        const { name: projectName, ownerAddress } = values
        let message = {
            content: `Your project will be ${create ? 'created' : 'updated'} shortly. 
                You will received toast messages notifying you of progress. 
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
        const { closeText, inputs, loading, message, open, secretStore, success } = this.state
        const isOpenControlled = modal && !trigger && isDefined(propsOpen)
        const ownerDD = inputs.find(x => x.name === 'ownerAddress')

        // add tittle item
        ownerDD.options = [{
            key: 0,
            style: styles.itemHeader,
            text: 'Wallets',
            value: '' // keep
            // add wallet items to owner address dropdown
        }].concat(arrSort(secretStore && secretStore.keys || [], 'name').map((wallet, i) => ({
            key: 'wallet-' + i + wallet.address,
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

function checkBalance(address, inputName) {
    const { inputs } = this.state
    const index = this.state.inputs.findIndex(x => x.name === inputName)
    const wallet = secretStore().find(address)
    // minimum balance required
    const minBalance = 500
    // keep input field in invalid state until verified
    inputs[index].invalid = true

    if (!wallet) {
        inputs[index].message = {
            header: 'Address does not belong to you!',
            showIcon: true,
            status: 'error'
        }

        return this.setState({ inputs })
    }
    inputs[index].message = {
        content: 'Checking balance....',
        showIcon: true,
        status: 'loading'
    }
    this.setState({ inputs })
    // check if singing address has enough funds
    runtime.balances.balance(address).then(balance => {
        const notEnought = balance <= minBalance
        inputs[index].invalid = notEnought
        inputs[index].message = !notEnought ? {} : {
            content: `You must have more than ${minBalance} Blip balance 
                    in the wallet named "${wallet.name}". 
                    This is requied to create a blockchain transaction.`,
            header: 'Insufficient balance',
            status: 'error',
            showIcon: true
        }
        this.setState({ inputs });
    })
}

export class ReassignProjectForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleSubmit = this.handleSubmit.bind(this)
        this.checkOwnerBalance = checkBalance.bind(this)

        this.state = {
            message: {},
            success: false,
            inputs: [
                {
                    label: 'Project Name',
                    name: 'name',
                    readOnly: true,
                    required: true,
                    type: 'text',
                    value: props.project.name
                },
                {
                    label: 'Project Hash',
                    name: 'hash',
                    readOnly: true,
                    required: true,
                    type: 'text',
                    value: props.hash
                },
                {
                    disabled: true,
                    label: 'Current Owner',
                    name: 'ownerAddress',
                    required: true,
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: props.project.ownerAddress
                },
                {
                    label: 'New Owner',
                    name: 'newOwnerAddress',
                    onChange: this.handleNewOwnerChange,
                    placeholder: 'Select owner',
                    search: true,
                    selection: true,
                    required: true,
                    type: 'dropdown',

                }
            ]
        }
    }

    componentWillMount() {
        const { ownerAddress } = this.props.project || {}
        this.checkOwnerBalance(ownerAddress, 'ownerAddress')
    }

    handleSubmit(e, values) {
        const { project, onSubmit } = this.props
        const { hash, name, ownerAddress, newOwnerAddress } = values
        const walletExists = secretStore().find(newOwnerAddress)
        const task = {
            type: QUEUE_TYPES.BLOCKCHAIN,
            func: 'reassignProject',
            args: [ownerAddress, newOwnerAddress, hash],
            address: ownerAddress,
            title: 'Re-assign project owner',
            description: 'Project Name: ' + name,
            next: {
                type: 'chatclient',
                func: 'project',
                args: [
                    hash,
                    objCopy({ ownerAddress: newOwnerAddress }, project, true),
                    false,
                    (err) => isFn(onSubmit) && onSubmit(values, !err)
                ]
            }
        }
        const proceed = () => addToQueue(task) | this.setState({
            message: {
                header: 'Re-assign request added to queue',
                content: 'Your request has been added to queue. ',
                status: 'success',
                showIcon: true
            },
            success: true
        })

        !!walletExists ? proceed() : confirm({
            cancelButton: { content: 'Cancel', color: 'green' },
            confirmButton: { content: 'Proceed', negative: true },
            content: 'You are about to assign owner of this project to an address that does not belong to you.'
                + ' If you proceed, you will no longer be able to update this project.',
            header: 'Are you sure?',
            onConfirm: () => proceed(),
            size: 'tiny'
        })
    }

    render() {
        const { header, modal, onClose, open, size, subheader } = this.props
        const { closeText, inputs, message, success } = this.state
        const wallets = secretStore()._value.keys || []
        const partners = addressbook.getAll()
        let options = [{
            key: 0,
            style: styles.itemHeader,
            text: 'Wallets',
            value: '' // keep
        }]
            // add wallet items to owner address dropdown
            .concat(arrSort(wallets, 'name').map((wallet, i) => ({
                key: 'wallet-' + i + wallet.address,
                text: wallet.name,
                description: <Pretty value={runtime.balances.balance(ss58Decode(wallet.address))} />,
                value: wallet.address
            })))

        if (partners.length > 0) {
            options = options.concat({
                key: 1,
                style: styles.itemHeader,
                text: 'Partners',
                value: '' // keep
            })
                .concat(arrSort(partners, 'name').map((partner, i) => ({
                    key: 'partner-' + i + partner.address,
                    text: partner.name,
                    description: <Pretty value={runtime.balances.balance(ss58Decode(partner.address))} />,
                    value: partner.address
                })))
        }

        inputs.filter(x => x.type.toLowerCase() === 'dropdown').forEach(input => input.options = options)

        return (
            <FormBuilder {...{
                closeText,
                header: header || 'Re-assign Project Owner',
                subheader,
                inputs,
                message,
                modal,
                onClose,
                onSubmit: this.handleSubmit,
                open,
                size,
                success
            }} />
        )
    }
}