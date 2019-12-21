import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import { isFn, textCapitalize } from '../utils/utils'
import { addToQueue, QUEUE_TYPES } from '../services/queue'

// const words = {}
// const wordsCap = textCapitalize(words)
const texts = {
    addedToQueueContent: 'You will be notified once request is processed',
    addedToQueueHeader: 'Request has been added to queue',
    introducingUserIdConflict: 'Introducing user cannot not be a recipient',
    header: 'Introduce partner',
    recipients: 'Recipient(s)',
    subheader: 'Recipients will receive notification so that they can share their identity with the introduced user',
    submitSuccessHeader: 'Submitted successfully',
    submitSuccessMessage: 'Notification sent to recipient(s)',
    submitErrorHeader: 'Submit failed',
    userId: 'User ID',
    userToIntroduce: 'User to introduce',
}
const type = 'identity'
const childType = 'introduce'

export default class IntroduceUser extends Component {
    constructor(props) {
        super(props)

        this.state = {
            inputs: [
                {
                    bond: new Bond(),
                    includePartners: true,
                    label: texts.userToIntroduce,
                    multiple: false,
                    name: 'userId',
                    required: true,
                    type: 'UserIdInput'
                },
                {
                    bond: new Bond(),
                    includePartners: true,
                    label: texts.recipients,
                    multiple: true,
                    name: 'recipients',
                    options: [],
                    required: true,
                    type: 'UserIdInput'
                }
            ],
            message: undefined,
            onChange: this.handleChange.bind(this),
            onSubmit: this.handleSubmit.bind(this),
        }
    }

    componentWillMount() {
        const { inputs } = this.state
        fillValues(inputs, this.props.values)
        this.setState({ inputs })
    }

    // prevent user id being on the recipient list
    handleChange(_, { userId, recipients }) {
        const { inputs } = this.state
        const invalid = userId && recipients && recipients.includes(userId)
        const recipientIn = findInput(inputs, 'recipients')
        recipientIn.invalid = invalid
        recipientIn.message = !invalid ? undefined : {
            content: texts.introducingUserIdConflict,
            status: 'error',
        }
        this.setState({ inputs })
    }

    handleSubmit(_, values) {
        const { userId, recipients } = values
        const { onSubmit } = this.props
        this.setState({
            loading: true,
            message: {
                content: texts.addedToQueueContent,
                header: texts.addedToQueueHeader,
                showIcon: true,
                status: 'success',
            },
        })
        addToQueue({
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'notify',
            title: texts.header,
            description: `${texts.userId}: ${userId} | ${texts.recipients}: ${recipients.join()}`,
            args: [recipients, type, childType, null, { userId }, err => {
                const success = !err
                const message = {
                    content: success ? texts.submitSuccessMessage : err,
                    header: success ? texts.submitSuccessHeader : texts.submitErrorHeader,
                    showIcon: true,
                    status: success ? 'success' : 'error',
                }
                this.setState({ loading: false, message, success })
                isFn(onSubmit) && onSubmit(success, values)
            }]
        })
    }

    render() {
        return <FormBuilder {...{ ...this.props, ...this.state }} />
    }
}
IntroduceUser.propTypes = {
    values: PropTypes.shape({
        recipients: PropTypes.array,
        userId: PropTypes.string,
    }),
}
IntroduceUser.defaultProps = {
    header: texts.header,
    size: 'tiny',
    subheader: texts.subheader,
}