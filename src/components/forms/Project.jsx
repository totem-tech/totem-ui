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
import { addNewProject } from '../../services/blockchain'
import { addToQueue } from '../../services/queue'
import { Pretty } from '../../Pretty'

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
        
        // Transaction Bonds
		this.txAddress = new Bond; 
        this.txHash = new Bond; 
        
        this.txAddress.changed(ss58Decode(secretStore().use()._value.keys[storageService.walletIndex()].address));

        this.debugValues = this.debugValues.bind(this)

        // Tells the blockchain to to handle custom runtime function??
        addCodecTransform('ProjectHash', 'Hash')

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
            // Check if wallet has balance
            this.checkOwnerBalance(props.project || {ownerAddress: selectedWallet})
        })
    }
    debugValues() {
		let that = this;
		console.log(
			 "this.txAddress: ", 
			 this.txAddress,  "is ready?: ", this.txAddress.isReady(), 
			 "\n  this.txHash: ", 
			 this.txHash, "is ready?: ", this.txHash.isReady()
			)
	}

    checkOwnerBalance(values) {
        const { hash, project } = this.props
        const { ownerAddress } = values
        const { inputs } = this.state
        const isCreate = !hash
        const index = this.state.inputs.findIndex(x => x.name === 'ownerAddress')
        // minimum balance required
        const minBalance = 500
        const signer = isCreate ? values.ownerAddress : project.ownerAddress
        // do not check if owner address has not been changed
        if (!signer || (!isCreate && ownerAddress === project.ownerAddress)) return;
        // keep input field in invalid state until verified
        inputs[index].invalid = true
        inputs[index].message = {
            content: 'Checking balance....',
            icon: loadingIcon,
            status: 'warning'
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
                icon: errIcon
            }
            this.setState({inputs});
        })
    }

    handleOwnerChange(_, values, i) {
        const { project } = this.props
        const walletAddrs = this.state.secretStore.keys.map(x => x.address)
        const { ownerAddress } = values
        // Confirm if selected owner address is not owned by user
        const doConfirm = !ownerAddress || walletAddrs.indexOf(ownerAddress) < 0
        
        !doConfirm ? this.checkOwnerBalance(values) : confirm({
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
            onConfirm: () => this.checkOwnerBalance(values),
            size: 'tiny'
        })
    }

    handleSubmit(e, values) {
        const { onSubmit, hash: existingHash } = this.props
        const create = !existingHash
        const hash = existingHash || generateHash(values)
        console.log('Original Hash : ', hash)
        this.txHash.changed(hash)
        console.log('Bond Hash : ', this.txHash)
        
        // prevent modal from being closed
        let closeText = 'Close'
        let message = {
            content: `Your project will be created shortly. 
                You will received toast messages notifying you of progress. 
                You may close the dialog now.`,
            header: 'Project creation has been queued',
            status: 'success'
        }
        
        this.setState({closeText, message, success: true})
        
        this.debugValues()

        addToQueue({
            type: 'blockchain',
            func: 'addNewProject',
            // args: [values.ownerAddress, hash],
            args: [this.txAddress, this.txHash],
            title: 'Create project',
            description: 'Name: ' + values.name,
            next: {
                type: 'ChatClient',
                func: 'project',
                args: [
                    hash,
                    values,
                    create,
                    (err, exists) => isFn(onSubmit) && onSubmit(e, values, !err)
                ]
            }
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
        const { closeText, inputs, loading, message, open, secretStore, success } = this.state
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
            // description: textEllipsis(wallet.address, 15),
            description: <Pretty value={runtime.balances.balance(ss58Decode(wallet.address))} />,
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
            onClose,
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
        fontSize: '1em'
    }
}