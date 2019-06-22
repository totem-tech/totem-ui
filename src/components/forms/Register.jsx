import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import uuid from 'uuid'
import { dropMessages, addResponseMessage, isWidgetOpened, toggleWidget } from 'react-chat-widget'
import ModalForm from '../ModalForm'
import { deferred, isFn } from '../utils'
import { getClient } from '../ChatClient'

const nameRegex = /^($|[a-z]|[a-z][a-z0-9]+)$/

class Register extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            inputs: [
                {
                    fluid: true,
                    label: 'User ID',
                    name: 'userId',
                    minLength: 3,
                    maxLength: 16,
                    onChange: deferred(this.handleIdChange, 300, this),
                    pattern: '^($|[a-z]|[a-z][a-z0-9]+)$',
                    placeholder: 'Enter your ID',
                    type: 'text',
                    required: true
                },
                {
                    label: ' I agree to the Totem Tech terms and condition',
                    name: 'agree',
                    type: 'checkbox',
                    required: true,
                    value: 'yes'
                }
            ],
            message: {},
            open: false,
        }

        // this.handleCancel = this.handleCancel.bind(this)
        this.handleClose = this.handleClose.bind(this)
        this.handleIdChange = this.handleIdChange.bind(this)
        this.handleOpen = this.handleOpen.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
    }

    handleClose(e, d) {
        const { onClose } = this.props
        this.setState({open: false})
        isFn(onClose) && onClose(e, d)
    }

    handleIdChange(e) {
        const { inputs } = this.state
        const index = 0
        let value = e.target.value
        if (value.length === 0) return;
        const valid = nameRegex.test(value)
        if (!valid) {
            inputs[index].message = {
                content: (
                    <p>
                        Only lowercase alpha-numeric characters allowed <br />
                        Must start with an alphabet
                    </p>
                ),
                header: 'Invalid ID',
                status: 'error'
            }
            return this.setState({inputs})
        }
        const hasMin = value.length >= 3
        if (!hasMin) {
            inputs[index].message = hasMin ? {} : { 
                content: 'minimum 3 characters required',
                status: 'error'
            }
            return this.setState({inputs});
        }
        this.setState({inputs})
        getClient().idExists(value, exists => {
            inputs[index].message = {
                content: 'ID ' + (exists ? 'already exists' : 'is available'),
                header: '@' + value,
                status: exists ? 'error' : 'success'
            }
            this.setState({inputs})
        })
    }

    handleOpen(e, d) {
        const { onOpen } = this.props
        this.setState({open: true})
        isFn(onOpen) && onOpen(e, d)
    }

    handleSubmit(e, values) {
        const { open } = this.state
        const { agree, userId: idDraft } = values
        if (!agree) return this.setState({
            message: {
                content: 'You must agree to the terms and conditions',
                status: 'error'
            }
        })
        
        getClient().register(idDraft, uuid.v1(), err => {
            const success  = !err
            const message = {
                content: err,
                header: 'Registration ' + (success ? 'complete' : 'failed'),
                status: success ? 'success' : 'error'
            }
            this.setState({message, success: success, open: success ? false : open})
            if (!success) return;
            dropMessages()
            addResponseMessage(
                'So, you want to get started with Totem? Great! Just ping your address using the Request Funds ' +
                'button and we\'ll send you some funds! Then you are good to go!'
            )
            !isWidgetOpened() && toggleWidget()
        })
    }

    render() {
        const { modal, size, trigger } = this.props
        const { inputs, message, open } = this.state
        return (
            <ModalForm
                trigger={trigger}
                header="Register an account"
                headerIcon="sign-in"
                inputs={inputs}
                message={message}
                modal={modal}
                onCancel={this.handleClose}
                onClose={this.handleClose}
                onOpen={this.handleOpen}
                open={open}
                onSubmit={this.handleSubmit}
                size={size || 'mini'}
                subheader="To start chat and/or make faucet request"
                submitText={'Register'}
            />
        )
    }
}

export default Register