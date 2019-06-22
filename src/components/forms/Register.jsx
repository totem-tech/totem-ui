import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import ModalForm from '../ModalForm'
import { isFn } from '../utils'
import { getClient } from '../ChatClient'
import { deferred } from '../utils'
import { Item } from 'semantic-ui-react';

const nameRegex = /^($|[a-z]|[a-z][a-z0-9]+)$/

class Register extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            open: undefined,
            inputs: [
                {
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
                    labelAfter: ' I agree to the Totem Tech terms and condition',
                    name: 'agree',
                    type: 'checkbox',
                    required: true
                }
            ]
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

    handleIdChange(value) {
        // const valid = nameRegex.test(value) && value.length <= 16
        // const { inputs } = this.state
        // const hasMin = value.length < 1 || value.length >= 3
        // inputs[0].message = hasMin ? {} : { 
        //     color: 'red',
        //     text: 'minimum 3 characters required'
        // }
        // if (!hasMin) return this.setState({inputs});
        if (value.length < 3) return;
        const { inputs } = this.state
        getClient().idExists(value, (exists) => {
            inputs[0].message = {
                color: exists ? 'red' : 'green',
                text: 'ID `' + value + '`' + (exists ? 'already exists' : 'available')
            }
            this.setState({inputs})
        })
    }

    handleOpen(e, d) {
        const { onOpen } = this.props
        this.setState({open: true})
        isFn(onOpen) && onOpen(e, d)
    }

    handleSubmit() {
        const { idDraft } = this.state
        getClient().register(idDraft, uuid.v1(), err => {
            if (err) return this.setState({ idValid: false, message: {error: true, text: err} });

            this.setState({ id: idDraft })
            dropMessages()
            addResponseMessage(
                'So, you want to get started with Totem? Great! Just ping your address using the Request Funds ' +
                'button and we\'ll send you some funds! Then you are good to go!'
            )
            !isWidgetOpened() && toggleWidget()
        })
    }

    render() {
        const { trigger } = this.props
        const { inputs, open } = this.state
        return (
            <ModalForm
                  trigger={trigger}
                  header="Register an account"
                  headerIcon="sign-in"
                  inputs={inputs}
                  onCancel={this.handleClose}
                  onClose={this.handleClose}
                  onOpen={this.handleOpen}
                  onSubmit={this.handleSubmit}
                  open={open}
                  onSubmit={()=> console.log('Submit clicked', arguments)}
                  subheader="To start chat and/or make faucet request"
                  submitText={'Register'}
                />
        )
    }
}

export default Register