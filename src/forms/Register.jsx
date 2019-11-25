import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import uuid from 'uuid'
import { dropMessages, addResponseMessage, isWidgetOpened, toggleWidget } from 'react-chat-widget'
import FormBuilder from '../components/FormBuilder'
import { deferred, isFn, objWithoutKeys } from '../utils/utils'
import { getClient } from '../services/ChatClient'

const nameRegex = /^($|[a-z]|[a-z][a-z0-9]+)$/

class FormRegister extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.handleIdChange = this.handleIdChange.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)

        this.state = {
            message: {},
            inputs: [
                {
                    label: 'User ID',
                    name: 'userId',
                    minLength: 3,
                    maxLength: 16,
                    onChange: deferred(this.handleIdChange, 300),
                    placeholder: 'Enter your UserID',
                    type: 'text',
                    required: true,
                    value: ''
                // },
                // {
                //     label: ' I agree to the Totem Tech terms and condition',
                //     name: 'agree',
                //     type: 'checkbox',
                //     required: true
                }
            ],
        }
    }

    handleIdChange(e, values, index) {
        const { inputs } = this.state
        let { userId } = values
        const valid = nameRegex.test(userId)
        inputs[index].invalid = !valid
        if (!valid) {
            inputs[index].message = {
                content: 'Lowercase alpha-numeric only, User ID must start with a letter.',
                header: 'Invalid ID',
                showIcon: true,
                status: 'error'
            }
            return this.setState({inputs})
        }

        this.setState({inputs})
        getClient().idExists(userId, exists => {
            inputs[index].invalid = exists
            inputs[index].message = {
                content: 'ID ' + (exists ? 'already exists' : 'is available'),
                header: '@' + userId,
                showIcon: true,
                status: exists ? 'error' : 'success'
            }
            this.setState({inputs})
        })
    }

    handleSubmit(_, values) {
        const { onSubmit, onSuccessOpenChat } = this.props
        const { agree, userId } =  values
        // if (!agree) return this.setState({
        //     message: {
        //         content: 'You must agree to the terms and conditions',
        //         showIcon: true,
        //         status: 'error'
        //     }
        // })
        
        getClient().register(userId, uuid.v1(), err => {
            const success  = !err
            const message = {
                content: err,
                header: 'Registration ' + (success ? 'complete' : 'failed'),
                showIcon: true,
                status: success ? 'success' : 'error'
            }
            this.setState({message, success: success, open: !success })
            isFn(onSubmit) && onSubmit(success, values)
            if (!success || !onSuccessOpenChat) return;
            setTimeout(() => {
                dropMessages()
                addResponseMessage(
                    'Welcom to the Totem trollbox. Please be nice.'
                )
                !isWidgetOpened() && toggleWidget()
            })
        })
    }

    render() {
        const { inputs, message, success } = this.state
        return <FormBuilder {...this.props} {...{ inputs, message, onSubmit: this.handleSubmit, success }} />
    }
}
FormRegister.propTypes = {
    onSuccessOpenChat: PropTypes.bool
}
FormRegister.defaultProps = {
    closeOnSubmit: true,
    header: 'Register a messaging UserID',
    headerIcon: 'sign-in',
    onSuccessOpenChat: true,
    size: 'mini',
    subheader: 'Lets you message and share.',
    subHeaderDetails: 'Choose a short, unique and memorable user name.',
    submitText: 'Register'
}
export default FormRegister