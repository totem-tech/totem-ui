import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import uuid from 'uuid'
import { dropMessages, addResponseMessage, isWidgetOpened, toggleWidget } from 'react-chat-widget'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { deferred, isFn } from '../utils/utils'
import { getClient } from '../services/ChatClient'
import { textCapitalize } from '../utils/utils'

const words = {
    register: 'register',
}
const wordsCap = textCapitalize(words)
const texts = {
    formHeader: 'Register a Memorable User Name',
    formSubheader: 'Choose an unique alias for use with Totem chat messaging.',
    registrationComplete: 'Registration complete',
    registrationFailed: 'Registration failed',
    userId: 'User ID',
    userIdExists: 'An user already exists with ID:',
    userIdPlaceholder: 'Enter your desired ID',
    userIdValidationMsg: 'ID must start with a letter and must be lowercase alpha-numeric',
    welcomeMsg: 'Welcom to the Totem trollbox. Please be nice.',
}
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
                    label: texts.userId,
                    name: 'userId',
                    minLength: 3,
                    maxLength: 20,
                    onChange: deferred(this.handleIdChange, 300, this),
                    placeholder: texts.userIdPlaceholder,
                    type: 'text',
                    required: true,
                    value: '',
                    validate: (_, { value: userId }) => {
                        const { inputs } = this.state
                        const userIdIn = findInput(inputs, 'userId')
                        const valid = nameRegex.test(userId)
                        userIdIn.action = valid ? userIdIn.action : undefined
                        setTimeout(() => this.setState({ inputs }))
                        return valid ? null : texts.userIdValidationMsg
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
                content: `${texts.userIdExists} ${userId}`,
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
                header: success ? texts.registrationComplete : texts.registrationFailed,
                showIcon: true,
                status: success ? 'success' : 'error'
            }
            this.setState({ message, success: success, open: !success })
            isFn(onSubmit) && onSubmit(success, values)

            // add welcome message
            dropMessages()
            addResponseMessage(texts.welcomeMsg)
            // if (!success || !onSuccessOpenChat) return;
            // setTimeout(() => {
            //     dropMessages()
            //     addResponseMessage('Welcom to the Totem trollbox. Please be nice.')
            //     !isWidgetOpened() && toggleWidget()
            // })
        })
    }

    render() {
        return <FormBuilder {...{ ...this.props, ...this.state }} />
    }
}
// FormRegister.propTypes = {
//     onSuccessOpenChat: PropTypes.bool
// }
FormRegister.defaultProps = {
    closeOnSubmit: true,
    header: texts.formHeader,
    headerIcon: 'sign-in',
    size: 'tiny',
    subheader: texts.formSubheader,
    submitText: wordsCap.register
}
export default FormRegister
