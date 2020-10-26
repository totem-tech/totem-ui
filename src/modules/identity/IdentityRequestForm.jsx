import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { isFn } from '../../utils/utils'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'

const notificationType = 'identity'
const childType = 'request'
const [words, wordsCap] = translated({
    close: 'close',
    reason: 'reason',
    submit: 'submit',
    user: 'user',
}, true)
const [texts] = translated({
    customReasonLabel: 'Custom Reason',
    customReasonPlaceholder: 'Enter a reason for your request',
    formHeader: 'Request Partner Identity',
    formSubheader: 'Request one or more user(s) to share a Totem Identity with you.',
    invalidUserId: 'Invalid User ID',
    reason1: 'To add your Identity to my Partner list',
    reason2: 'Timekeeping on an Activity',
    reason3: 'Custom',
    reasonPlaceholder: 'Select a reason for this request',
    successMsg: `Identity request has been sent to selected user(s). You will receive notification once they agree to share their Identity with you.`,
    successMsgHeader: 'Request sent!',
    errorMessageHeader: 'Request failed!',
    userIds: 'User ID(s)',
    userIdsNoResultsMessage: 'Type an User ID and press enter to add',
    userIdsPlaceholder: 'Enter User ID(s)',
})
const reasonList = [
    texts.reason1,
    texts.reason2,
    texts.reason3,
]

export default class IdentityRequestForm extends Component {
    constructor(props) {
        super(props)

        this.state = {
            loading: false,
            message: {},
            onSubmit: this.handleSubmit,
            success: false,
            inputs: [
                {
                    includePartners: true,
                    includeFromChat: true,
                    label: wordsCap.user,
                    name: 'userIds',
                    multiple: true,
                    noResultsMessage: texts.userIdsNoResultsMessage,
                    required: true,
                    placeholder: texts.userIdsPlaceholder,
                    type: 'UserIdInput',
                },
                {
                    label: wordsCap.reason,
                    maxLength: 160,
                    name: 'reason',
                    onChange: (e, values, i) => {
                        const { inputs } = this.state
                        const showCustom = values.reason === texts.reason3
                        findInput(inputs, 'customReason').hidden = !showCustom
                        this.setState({ inputs })
                    },
                    options: reasonList.map(r => ({
                        key: r,
                        text: r,
                        value: r
                    })),
                    placeholder: texts.reasonPlaceholder,
                    required: true,
                    search: true,
                    selection: true,
                    type: 'DropDown',
                },
                {
                    hidden: true,
                    label: texts.customReasonLabel,
                    name: 'customReason',
                    maxLength: 160,
                    placeholder: texts.customReasonPlaceholder,
                    required: true,
                    type: 'text',
                    value: '',
                }
            ]
        }

        fillValues(this.state.inputs, props.values)
    }

    handleSubmit = (e, values) => {
        const { onSubmit } = this.props
        const { userIds, reason, customReason } = values
        const data = { reason: reason === 'Custom' ? customReason : reason }
        this.setState({ loading: true })
        const callback = err => {
            const success = !err
            const message = {
                content: texts.successMsg,
                header: texts.successMsgHeader,
                icon: true,
                status: 'success',
            }
            this.setState({
                loading: false,
                message: success ? message : {
                    header: texts.errorMessageHeader,
                    content: err,
                    icon: true,
                    status: 'error',
                },
                success
            })
            isFn(onSubmit) && onSubmit(success, values)
        }
        addToQueue({
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'notify',
            title: texts.formHeader,
            description: `${texts.userIds} : ${userIds}`,
            args: [
                userIds,
                notificationType,
                childType,
                null,
                data,
                callback,
            ]
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
IdentityRequestForm.propTypes = {
    values: PropTypes.shape({
        userIds: PropTypes.array
    })
}
IdentityRequestForm.defaultProps = {
    closeText: wordsCap.close,
    header: texts.formHeader,
    size: 'tiny',
    subheader: texts.formSubheader,
    submitText: wordsCap.submit,
}