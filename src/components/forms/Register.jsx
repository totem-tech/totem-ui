import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import uuid from 'uuid'
import { dropMessages, addResponseMessage, isWidgetOpened, toggleWidget } from 'react-chat-widget'
import FormBuilder from './FormBuilder'
import { deferred, isFn } from '../utils'
import { getClient } from '../ChatClient'

const nameRegex = /^($|[a-z]|[a-z][a-z0-9]+)$/

class FormRegister extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleClose = this.handleClose.bind(this)
        this.handleIdChange = this.handleIdChange.bind(this)
        this.handleOpen = this.handleOpen.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)


        this.state = {
            inputs: [
                {
                    deferred: 300,
                    label: 'User ID',
                    name: 'userId',
                    minLength: 3,
                    maxLength: 16,
                    onChange: deferred(this.handleIdChange, 300),
                    placeholder: 'Enter your ID',
                    type: 'text',
                    required: true,
                    value: ''
                },
                {
                    label: ' I agree to the Totem Tech terms and condition',
                    name: 'agree',
                    type: 'checkbox',
                    required: true
                }
            ],
            message: {},
            open: false,
            submitDisabled: true
        }
    }

    handleClose(e, d) {
        const { onClose } = this.props
        this.setState({open: false})
        isFn(onClose) && onClose(e, d)
    }

    handleIdChange(e, values, index) {
        const { inputs } = this.state
        let { value } = e.target
        const hasMin = value.length >= 3
        const valid = nameRegex.test(value) && hasMin
        inputs[index].invalid = !valid
        // console.log('valid', valid, inputs)
        if (!valid) {
            inputs[index].message = {
                content: !hasMin ? 'minimum 3 characters required' : (
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

        this.setState({inputs})
        getClient().idExists(value, exists => {
            inputs[index].message = {
                content: 'ID ' + (exists ? 'already exists' : 'is available'),
                header: '@' + value,
                status: exists ? 'error' : 'success'
            }
            // console.log('exists', exists, inputs)
            this.setState({inputs, submitDisabled: exists})
        })
    }

    handleOpen(e, d) {
        const { onOpen } = this.props
        this.setState({open: true})
        isFn(onOpen) && onOpen(e, d)
    }

    handleSubmit(_, values) {
        const { agree, userId } =  values
        if (!agree) return this.setState({
            message: {
                content: 'You must agree to the terms and conditions',
                status: 'error'
            }
        })
        
        getClient().register(userId, uuid.v1(), err => {
            const success  = !err
            const message = {
                content: err,
                header: 'Registration ' + (success ? 'complete' : 'failed'),
                status: success ? 'success' : 'error'
            }
            this.setState({message, success: success, open: !success })
            if (!success) return;
            setTimeout(() => {
                dropMessages()
                addResponseMessage(
                    'So, you want to get started with Totem? Great! Just ping your address using the Request Funds ' +
                    'button and we\'ll send you some funds! Then you are good to go!'
                )
                !isWidgetOpened() && toggleWidget()
            })
        })
    }

    render() {
        const { modal, size, trigger } = this.props
        const { inputs, message, open, submitDisabled } = this.state
        return (
            <FormBuilder
                trigger={trigger}
                header="Register an account"
                headerIcon="sign-in"
                inputs={inputs}
                message={message}
                modal={modal}
                onClose={this.handleClose}
                onOpen={this.handleOpen}
                open={open}
                onSubmit={this.handleSubmit}
                size={size}
                subheader="To start chat and/or make faucet request"
                submitDisabled={submitDisabled}
                submitText={'Register'}
            />
        )
    }
}
FormRegister.propTypes = {
    modal: PropTypes.bool,
    onClose: PropTypes.func,
    onOpen: PropTypes.func,
    size: PropTypes.string,
    trigger: PropTypes.element
}
FormRegister.defaultProps = {
    size: 'mini'
}
export default FormRegister