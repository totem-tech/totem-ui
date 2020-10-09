// ToDo: move to modules/chat
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { isFn } from '../../utils/utils'
import { translated } from '../../services/language'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'

const [_, textsCap] = translated({
    addedToQueueContent: 'you will be notified once request is processed',
    addedToQueueHeader: 'request has been added to queue',
    introducingUserIdConflict: 'you cannot introduce a user to themselves!',
    header: 'partner introduction',
    recipients: 'recipients',
    subheader: 'recipients will receive a request for permission to share their identity with this user',
    submitSuccessHeader: 'submitted successfully',
    submitSuccessMessage: 'notification sent to recipients',
    submitErrorHeader: 'submission failed',
    userId: 'User ID',
    userToIntroduce: 'user to introduce',
}, true)
// notificaiton types for user introduction
const TYPE = 'identity'
const CHILD_TYPE = 'introduce'

export default class IntroduceUserForm extends Component {
    constructor(props) {
        super(props)

        this.state = {
            message: undefined,
            onChange: this.handleChange,
            onSubmit: this.handleSubmit,
            inputs: [
                {
                    includeFromChat: true,
                    includePartners: true,
                    label: textsCap.userToIntroduce,
                    multiple: false,
                    name: 'userId',
                    required: true,
                    type: 'UserIdInput'
                },
                {
                    includePartners: true,
                    label: textsCap.recipients,
                    multiple: true,
                    name: 'recipients',
                    options: [],
                    required: true,
                    type: 'UserIdInput'
                }
            ],
        }
    }

    componentWillMount() {
        const { inputs } = this.state
        fillValues(inputs, this.props.values)
        this.setState({ inputs })
    }

    // prevent user id being on the recipient list
    handleChange = (_, { userId, recipients }) => {
        const { inputs } = this.state
        const invalid = userId && recipients && recipients.includes(userId)
        const recipientIn = findInput(inputs, 'recipients')
        recipientIn.invalid = invalid
        recipientIn.message = !invalid ? undefined : {
            content: textsCap.introducingUserIdConflict,
            status: 'error',
        }
        this.setState({ inputs })
    }

    handleSubmit = (_, values) => {
        const { userId, recipients } = values
        const { onSubmit } = this.props
        this.setState({
            loading: true,
            message: {
                content: textsCap.addedToQueueContent,
                header: textsCap.addedToQueueHeader,
                icon: true,
                status: 'success',
            },
        })
        addToQueue({
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'notify',
            title: textsCap.header,
            description: `${textsCap.userId}: ${userId} | ${textsCap.recipients}: ${recipients.join()}`,
            args: [recipients, TYPE, CHILD_TYPE, null, { userId }, err => {
                const success = !err
                const message = {
                    content: success ? textsCap.submitSuccessMessage : err,
                    header: success ? textsCap.submitSuccessHeader : textsCap.submitErrorHeader,
                    icon: true,
                    status: success ? 'success' : 'error',
                }
                this.setState({ loading: false, message, success })
                isFn(onSubmit) && onSubmit(success, values)
            }]
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
IntroduceUserForm.propTypes = {
    values: PropTypes.shape({
        recipients: PropTypes.array,
        userId: PropTypes.string,
    }),
}
IntroduceUserForm.defaultProps = {
    header: textsCap.header,
    size: 'tiny',
    subheader: textsCap.subheader,
}