import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import uuid from 'uuid'
import { dropMessages, addResponseMessage } from 'react-chat-widget'
import FormBuilder from '../components/FormBuilder'
import { isFn } from '../utils/utils'
import { getClient } from '../services/chatClient'
import { translated } from '../services/language'

const [words, wordsCap] = translated({
    register: 'register',
}, true)
const [texts] = translated({
    formHeader: 'Register a Memorable User Name',
    formSubheader: 'Choose an unique alias for use with Totem chat messaging.',
    registrationComplete: 'Registration complete',
    registrationFailed: 'Registration failed',
    userId: 'User ID',
    userIdCriteria: 'Please enter an User ID that meets the following criteria:',
    userIdCriteria1: 'starts with a letter',
    userIdCriteria2: 'contains minimum 3 characters',
    userIdCriteria3: 'contains only alphanumeric characters',
    userIdPlaceholder: 'Enter your desired ID',
    welcomeMsg: 'Welcome to the Totem trollbox. Please be nice.',
})

export default class FormRegister extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            message: undefined,
            onSubmit: this.handleSubmit,
            success: false,
            inputs: [
                {
                    label: texts.userId,
                    message: {
                        content: (
                            <div>
                                {texts.userIdCriteria}
                                <ul>
                                    <li>{texts.userIdCriteria1}</li>
                                    <li>{texts.userIdCriteria2}</li>
                                    <li>{texts.userIdCriteria3}</li>
                                </ul>
                            </div>
                        ),
                        status: 'warning',
                        style: { textAlign: 'left' },
                    },
                    name: 'userId',
                    multiple: false,
                    newUser: true,
                    placeholder: texts.userIdPlaceholder,
                    type: 'UserIdInput',
                    required: true,
                    value: '',
                }
            ],
        }
    }

    handleSubmit = (_, values) => {
        const { onSubmit } = this.props
        const { userId } = values

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
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
FormRegister.defaultProps = {
    closeOnSubmit: true,
    header: texts.formHeader,
    headerIcon: 'sign-in',
    size: 'tiny',
    subheader: texts.formSubheader,
    submitText: wordsCap.register
}
