import React, { Component } from 'react'
import PropTypes from 'prop-types'
import FormBuilder from '../components/FormBuilder'
import { translated } from '../services/language'
import client from '../services/chatClient'
import { validate, TYPES } from '../utils/validator'

const textsCap = translated({
    emailError: 'please enter a valid email address',
    emailLabel: 'email',
    emailPlaceholder: 'enter your email address',
    header: 'newsletter signup',
    firstNameLabel: 'first name',
    firstNamePlaceholder: 'enter your name',
    lastNameLabel: 'family name',
    lastNamePlaceholder: 'enter your family name',
    signup: 'signup',
    successMsg: 'thank you for signing up! Don\'t forget to check out our live testnet application at',
    subheader: 'We promise to not spam you and we will NEVER give your personal details to any third-party without your explicit conscent',
}, true)[1]

export default class NewsletteSignup extends Component {
    constructor(props) {
        super(props)

        this.state = {
            onSubmit: this.handleSubmit,
            inputs: [
                {
                    name: 'names',
                    inline: true,
                    type: 'group',
                    widths: 'equal',
                    inputs: [
                        {
                            label: textsCap.firstNameLabel,
                            minLength: 4,
                            name: 'firstName',
                            placeholder: textsCap.firstNamePlaceholder,
                            required: true,
                            type: 'text',
                            value: '',
                        },
                        {
                            label: textsCap.lastNameLabel,
                            minLength: 4,
                            name: 'lastName',
                            placeholder: textsCap.lastNamePlaceholder,
                            required: true,
                            type: 'text',
                            value: '',
                        },
                    ]
                },
                {
                    defer: null,
                    label: textsCap.emailLabel,
                    name: 'email',
                    placeholder: textsCap.emailPlaceholder,
                    required: true,
                    type: 'email',
                    value: '',
                    validate: (_, { value }) => validate(
                        value,
                        { type: TYPES.email },
                        // custom error message when email is invalid
                        { email: textsCap.emailError },
                    )
                }
            ]
        }

        if (!props.modal) {
            this.state.message = { content: textsCap.subheader }
        }
        if (window.isInFrame) {
            this.state.style = { maxWidth: 400, margin: 'auto', ...props.style }
        }
    }

    handleSubmit = async (_, values) => {
        this.setState({
            loading: true,
            submitDisabled: true,
        })
        let error = null
        try {
            await client.newsletterSignup.promise(values)
        } catch (err) {
            error = err
        }
        this.setState({
            loading: false,
            submitDisabled: !error,
            message: {
                content: error ? `${error}` : (
                    <span>
                        {textsCap.successMsg}
                        <a href='https://totem.live' target='_blank'> https://totem.live</a>
                    </span>
                ),
                showIcon: true,
                status: error ? 'error' : 'success'
            },
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
NewsletteSignup.propTypes = {
    values: PropTypes.object,
}
NewsletteSignup.defaultProps = {
    header: textsCap.header,
    size: 'tiny',
    subheader: textsCap.subheader,
    submitText: textsCap.signup,
}