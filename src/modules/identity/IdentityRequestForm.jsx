import React from 'react'
import PropTypes from 'prop-types'
import { iUseReducer } from '../../utils/reactHelper'
import { isFn, } from '../../utils/utils'
import { statuses } from '../../components/Message'
import FormBuilder, { fillValues } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'

const notificationType = 'identity'
const childType = 'request'
export const reasons = [
    'custom',
    'to add your Identity to my Partner list',
    'timekeeping on an Activity',
]
let textsCap = {
    close: 'close',
    reason: 'reason',
    submit: 'submit',
    user: 'user',
    customReasonLabel: 'custom Reason',
    customReasonPlaceholder: 'enter a reason for your request',
    formHeader: 'request Partner Identity',
    formSubheader: 'request one or more user(s) to share a Totem Identity with you.',
    invalidUserId: 'invalid User ID',
    reason1: reasons[1],
    reason2: reasons[2],
    reason3: reasons[0],
    reasonPlaceholder: 'select a reason for this request',
    successMsg1: 'identity request has been sent to selected users.',
    successMsg2: 'you will receive notification once they agree to share their Identity with you.',
    successMsgHeader: 'request sent!',
    errorMessageHeader: 'request failed!',
    userIds: 'user IDs',
    userIdsNoResultsMessage: 'type an User ID and press enter to add',
    userIdsPlaceholder: 'enter User IDs',
}
textsCap = translated(textsCap, true)[1]
export const inputNames = {
    customReason: 'customReason',
    reason: 'reason',
    userIds: 'userIds',
}

export default function IdentityRequestForm(props) {
    const [state] = iUseReducer(null, rxSetState => {
        const { values = {} } = props
        const inputs = [
            {
                excludeOwnId: true,
                includePartners: true,
                includeFromChat: true,
                label: textsCap.user,
                name: inputNames.userIds,
                multiple: true,
                noResultsMessage: textsCap.userIdsNoResultsMessage,
                required: true,
                placeholder: textsCap.userIdsPlaceholder,
                type: 'UserIdInput',
            },
            {
                label: textsCap.reason,
                maxLength: 64,
                name: inputNames.reason,
                options: [
                    {
                        text: textsCap.reason1,
                        value: reasons[1],
                    },
                    { 
                        text: textsCap.reason2,
                        value: reasons[2],
                    },
                    {
                        text: textsCap.reason3,
                        value: reasons[0],
                    },
                ],
                placeholder: textsCap.reasonPlaceholder,
                required: true,
                search: true,
                selection: true,
                type: 'DropDown',
            },
            {
                hidden: values => values[inputNames.reason] !== reasons[0],
                label: textsCap.customReasonLabel,
                name: inputNames.customReason,
                minLength: 10,
                maxLength: 64,
                placeholder: textsCap.customReasonPlaceholder,
                required: true,
                type: 'text',
                value: '',
            },
        ]
        const state = {
            loading: false,
            message: {},
            onSubmit: handleSubmitCb(props, rxSetState),
            success: false,
            inputs: fillValues(inputs, values)
        }
        return state
    })

    return <FormBuilder {...{ ...props, ...state }} />
}
IdentityRequestForm.propTypes = {
    values: PropTypes.shape({
        [inputNames.customReason]: PropTypes.string,
        [inputNames.reason]: PropTypes.string,
        [inputNames.userIds]: PropTypes.oneOfType([
            PropTypes.array,
            PropTypes.string,
        ])
    })
}
IdentityRequestForm.defaultProps = {
    closeText: textsCap.close,
    header: textsCap.formHeader,
    size: 'tiny',
    subheader: textsCap.formSubheader,
    submitText: textsCap.submit,
}

export const handleSubmitCb = (props, rxSetState) => (_, values) => {
    const { onSubmit } = props
    let { userIds, reason, customReason } = values
    reason = reason === reasons[0]
        ? customReason
        : reason
    rxSetState.next({ loading: true })
    const handleResult = (success, err) => {
        rxSetState.next({
            loading: false,
            message: success
                ? {
                    content: `${textsCap.successMsg1} ${textsCap.successMsg2}`,
                    header: textsCap.successMsgHeader,
                    icon: true,
                    status: statuses.SUCCESS,
                }
                : {
                    header: textsCap.errorMessageHeader,
                    content: err,
                    icon: true,
                    status: statuses.ERROR,
                },
            success,
        })
        isFn(onSubmit) && onSubmit(success, values)
    }
    addToQueue({
        args: [
            userIds,
            notificationType,
            childType,
            null,
            { reason },
        ],
        description: `${textsCap.userIds}: ${userIds}`,
        func: 'notify',
        then: handleResult,
        title: textsCap.formHeader,
        type: QUEUE_TYPES.CHATCLIENT,
    })
}