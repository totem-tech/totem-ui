import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import uuid from 'uuid'
import { dropMessages, addResponseMessage, isWidgetOpened, toggleWidget } from 'react-chat-widget'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { deferred, isFn, objWithoutKeys } from '../utils/utils'
import { getClient } from '../services/ChatClient'

const nameRegex = /^($|[a-z]|[a-z][a-z0-9]+)$/

class FormRegister extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            disableSubmit: undefined,
            loading: undefined,
            message: undefined,
            onSubmit: this.handleSubmit.bind(this),
            success: undefined,
            inputs: [
                {
                    action: undefined,
                    label: 'User ID',
                    name: 'userId',
                    minLength: 3,
                    maxLength: 16,
                    onChange: deferred(this.handleIdChange, 300, this),
                    placeholder: 'Enter your ID',
                    type: 'text',
                    required: true,
                    value: '',
                    validate: (_, { value: userId }) => {
                        const { inputs } = this.state
                        const userIdIn = findInput(inputs, 'userId')
                        const valid = nameRegex.test(userId)
                        userIdIn.action = valid ? userIdIn.action : undefined
                        setTimeout(() => this.setState({ inputs }))
                        return valid ? null : 'ID must start with a letter and must be lowercase alpha-numeric'
                    },
                }
            ],
        }
    }

    handleIdChange(e, values, index) {
        const { inputs } = this.state
        const userId = (values.userId || '').toLowerCase().trim()
        inputs[index].message = undefined
        inputs[index].action = undefined
        this.setState({ inputs, disableSubmit: true })
        if (!userId) return

        getClient().idExists(userId, exists => {
            inputs[index].invalid = exists
            inputs[index].message = !exists ? undefined : {
                content: `An user already exists with ID: ${userId}`,
                status: exists ? 'error' : 'success'
            }
            inputs[index].action = exists ? undefined : { color: 'green', icon: 'check' }
            this.setState({ inputs, disableSubmit: !exists })
        })
    }

    handleSubmit(_, values) {
        const { onSubmit, onSuccessOpenChat } = this.props
        let { userId } = values

        getClient().register(userId, uuid.v1(), err => {
            const success = !err
            const message = {
                content: err,
                header: 'Registration ' + (success ? 'complete' : 'failed'),
                showIcon: true,
                status: success ? 'success' : 'error'
            }
            this.setState({ message, success: success, open: !success })
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
        return <FormBuilder {...{ ...this.props, ...this.state }} />
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