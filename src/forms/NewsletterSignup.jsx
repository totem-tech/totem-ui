import React, { Component } from 'react'
import PropTypes from 'prop-types'
import FormBuilder, { fillValues } from '../components/FormBuilder'
import { translated } from '../utils/languageHelper'
import client from '../utils/chatClient'
import Message from '../components/Message'
import { isFn, isObj } from '../utils/utils'

const prodUrl = 'https://totem.live'
const textsCap = translated({
    emailError: 'please enter a valid email address',
    emailLabel: 'email',
    emailPlaceholder: 'enter your email address',
    header: 'early adopter signup',
    firstNameLabel: 'first name',
    firstNamePlaceholder: 'enter your name',
    lastNameLabel: 'family name',
    lastNamePlaceholder: 'enter your family name',
    signup: 'signup',
    successHeader: 'thank you for signing up!',
    successMsg: 'now that you are here, why not check out the test application and provide us with any feedback you may have? It\'s completely free',
    successMsgIframe: 'don\'t forget to check out our live and free test application:',
    subheader: 'We promise to not spam you and we will NEVER give your personal details to any third-party without your explicit consent',
}, true)[1]

export default class NewsletteSignup extends Component {
    constructor(props) {
        super(props)

        const { modal, style, values } = props

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
                            maxLength: 30,
                            name: 'firstName',
                            placeholder: textsCap.firstNamePlaceholder,
                            required: true,
                            type: 'text',
                            value: '',
                        },
                        {
                            label: textsCap.lastNameLabel,
                            maxLength: 30,
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
                }
            ]
        }

        if (isObj(values)) fillValues(this.state.inputs, values)
        if (!modal) {
            this.state.message = { content: textsCap.subheader }
        }
        if (window.isInIFrame) {
            this.state.style = { maxWidth: 400, margin: 'auto', ...style }
        }
    }

    handleSubmit = async (_, values) => {
        const { onSubmit } = this.props
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
            success: !error,
            message: {
                content: error ? `${error}` : textsCap.successMsg,
                header: textsCap.successHeader,
                icon: true,
                status: error ? 'error' : 'success'
            },
        })
        isFn(onSubmit) && onSubmit(!error)
    }

    render = () => {
        let { message, success } = this.state
        message = message || this.props.message

        if (success && message && window.isInIFrame) return (
            <Message {...{
                ...message,
                className: 'success-message',
                content: (
                    <span>
                        {textsCap.successMsgIframe}
                        <div>
                            <a href={prodUrl} target='_blank'>
                                {prodUrl}
                            </a>
                        </div>
                    </span>
                ),
                icon: false,
                status: 'basic',
            }} />
        )
        return <FormBuilder {...{ ...this.props, ...this.state, message }} />
    }
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