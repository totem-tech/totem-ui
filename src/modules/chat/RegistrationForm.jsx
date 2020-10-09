import React, { Component } from 'react'
import uuid from 'uuid'
import FormBuilder from '../../components/FormBuilder'
import { isFn } from '../../utils/utils'
import { translated } from '../../services/language'
import { getClient, getUser } from './ChatClient'

const textsCap = translated({
    formHeader: 'register a memorable user name',
    formSubheader: 'choose an unique alias for use with Totem chat messaging.',
    register: 'register',
    registrationComplete: 'registration complete',
    registrationFailed: 'registration failed',
    userId: 'User ID',
    userIdCriteria: 'please enter an User ID that meets the following criteria:',
    userIdCriteria1: 'starts with a letter',
    userIdCriteria2: 'contains minimum 3 characters',
    userIdCriteria3: 'contains only alphanumeric characters',
    userIdPlaceholder: 'enter your desired ID',
}, true)[1]

export default class RegistrationForm extends Component {
    constructor(props) {
        super(props)

        const { id } = getUser() || {}
        this.state = {
            onSubmit: this.handleSubmit,
            submitDisabled: !!id,
            success: false,
            inputs: [
                {
                    disabled: !!id,
                    label: textsCap.userId,
                    message: {
                        content: (
                            <div>
                                {textsCap.userIdCriteria}
                                <ul>
                                    <li>{textsCap.userIdCriteria1}</li>
                                    <li>{textsCap.userIdCriteria2}</li>
                                    <li>{textsCap.userIdCriteria3}</li>
                                </ul>
                            </div>
                        ),
                        status: 'warning',
                        style: { textAlign: 'left' },
                    },
                    name: 'userId',
                    multiple: false,
                    newUser: true,
                    placeholder: textsCap.userIdPlaceholder,
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
                header: success ? textsCap.registrationComplete : textsCap.registrationFailed,
                icon: true,
                status: success ? 'success' : 'error'
            }
            this.setState({ message, success: success })
            isFn(onSubmit) && onSubmit(success, values)
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
RegistrationForm.defaultProps = {
    header: textsCap.formHeader,
    headerIcon: 'sign-in',
    size: 'tiny',
    subheader: textsCap.formSubheader,
    submitText: textsCap.register
}
