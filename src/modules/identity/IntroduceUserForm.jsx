// ToDo: move to modules/chat
import React from 'react'
import PropTypes from 'prop-types'
import FormBuilder, { fillValues } from '../../components/FormBuilder'
import { isFn, isStr } from '../../utils/utils'
import { translated } from '../../utils/languageHelper'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { iUseReducer } from '../../utils/reactjs'
import { statuses } from '../../components/Message'

let textsCap = {
    introducingUserIdConflict: 'you cannot introduce a user to themselves!',
    header: 'partner introduction',
    recipients: 'recipients',
    subheader: 'recipients will receive a request for permission to share their identity with this user',
    submitSuccessHeader: 'submitted successfully',
    submitSuccessMessage: 'notification sent to recipients',
    submitErrorHeader: 'submission failed',
    userId: 'User ID',
    userToIntroduce: 'user to introduce',
}
textsCap = translated(textsCap, true)[1]
const inputNames = {
    recipients: 'recipients',
    userId: 'userId',
}

export default function IntroduceUserForm(props) {
    const [state] = iUseReducer(null, rxSetState => {
        const { values = {} } = props
        let recipients = values[inputNames.recipients]
        recipients = isStr(recipients)
            ? recipients.split(',')
            : recipients || []

        return {
            onSubmit: handleSubmit(props, rxSetState),
            inputs: fillValues([
                {
                    excludeOwnId: true,
                    includeFromChat: true,
                    includePartners: true,
                    label: textsCap.userToIntroduce,
                    multiple: false,
                    name: inputNames.userId,
                    required: true,
                    type: 'UserIdInput'
                },
                {
                    excludeOwnId: true,
                    includeFromChat: true,
                    includePartners: true,
                    label: textsCap.recipients,
                    multiple: true,
                    name: inputNames.recipients,
                    options: [],
                    required: true,
                    type: 'UserIdInput',
                    // prevent userId being on the recipient list
                    validate: (_, values = {}) => {
                        const recipients = values[inputNames.recipients]
                        const userId = values[inputNames.userId]
                        const invalid = userId
                            && recipients
                            && recipients.includes(userId)
                        return invalid && {
                            content: textsCap.introducingUserIdConflict,
                            status: 'error',
                        }
                    }
                }
            ], values),
        }
    })

    return <FormBuilder {...{ ...props, ...state }} />
}
IntroduceUserForm.propTypes = {
    values: PropTypes.shape({
        recipients: PropTypes.oneOfType([
            PropTypes.arrayOf(PropTypes.string),
            PropTypes.string,
        ]),
        userId: PropTypes.string,
    }),
}
IntroduceUserForm.defaultProps = {
    header: textsCap.header,
    size: 'mini',
    subheader: textsCap.subheader,
}

const handleSubmit = (props, rxSetState) => (_, values) => {
    const { onSubmit } = props
    const recipients = values[inputNames.recipients]
    const userId = values[inputNames.userId]
    // notificaiton types for user introduction
    const TYPE = 'identity'
    const CHILD_TYPE = 'introduce'
    rxSetState.next({ loading: true })
    const description = [
        `${textsCap.userId}: ${userId}`,
        `${textsCap.recipients}: ${recipients.join()}`
    ].join('\n')
    const handleResult = (success, err) => {
        const message = {
            content: success
                ? textsCap.submitSuccessMessage
                : err,
            header: success
                ? textsCap.submitSuccessHeader
                : textsCap.submitErrorHeader,
            icon: true,
            status: success
                ? statuses.SUCCESS
                : statuses.ERROR,
        }
        rxSetState.next({
            loading: false,
            message,
            success,
        })
        isFn(onSubmit) && onSubmit(success, values)
    }
    addToQueue({
        args: [
            recipients,
            TYPE,
            CHILD_TYPE,
            null,
            { userId },
        ],
        description,
        func: 'notify',
        then: handleResult,
        title: textsCap.header,
        type: QUEUE_TYPES.CHATCLIENT,
    })
}