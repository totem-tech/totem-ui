import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import uuid from 'uuid'
import { isFn } from '../../utils/utils'
import FormBuilder, { fillValues } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { setActiveStep } from '../../views/GettingStartedView'
import { getClient, getUser } from './ChatClient'

const textsCap = translated({
    alreadyRegistered: 'you have already registered!',
    formHeader: 'register a memorable user name',
    formSubheader: 'choose an unique alias for use with Totem chat messaging.',
    referredByLabel: 'referred by',
    referredByPlaceholder: 'ID of the user who referred you',
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
        const { values = {}} = props
        this.state = {
            onSubmit: this.handleSubmit,
            submitDisabled: !!id,
            success: false,
            inputs: fillValues([
                {
                    disabled: !!id,
                    label: textsCap.userId,
                    message: {
                        content: !!id ? '' : (
                            <div>
                                {textsCap.userIdCriteria}
                                <ul>
                                    <li>{textsCap.userIdCriteria1}</li>
                                    <li>{textsCap.userIdCriteria2}</li>
                                    <li>{textsCap.userIdCriteria3}</li>
                                </ul>
                            </div>
                        ),
                        header: !id ? '' : textsCap.alreadyRegistered,
                        icon: !!id,
                        status: !!id ? 'error' : 'warning',
                        style: { textAlign: 'left' },
                    },
                    name: 'userId',
                    multiple: false,
                    newUser: true,
                    placeholder: textsCap.userIdPlaceholder,
                    type: 'UserIdInput',
                    required: true,
                    value: '',
                },
                {
                    label: textsCap.referredByLabel,
                    name: 'referredBy',
                    placeholder: textsCap.referredByPlaceholder,
                    rxValue: new BehaviorSubject(''),
                    type: 'UserIdInput',
                },
            ], values),
        }
    }

    handleSubmit = (_, values) => {
        const { onSubmit } = this.props
        const { referredBy, userId } = values
        const secret = uuid.v1()

        this.setState({ submitDisabled: true })
        getClient().register(userId, secret, referredBy, err => {
            const success = !err
            const message = {
                content: err,
                header: success ? textsCap.registrationComplete : textsCap.registrationFailed,
                icon: true,
                status: success ? 'success' : 'error'
            }
            this.setState({
                message,
                submitDisabled: false,
                success,
            })
            isFn(onSubmit) && onSubmit(success, values)

            success && setActiveStep(1)
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}

RegistrationForm.propsTypes = {
    values: PropTypes.object,
}
RegistrationForm.defaultProps = {
    header: textsCap.formHeader,
    headerIcon: 'sign-in',
    size: 'tiny',
    subheader: textsCap.formSubheader,
    submitText: textsCap.register
}
