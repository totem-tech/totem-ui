import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { isFn, isStr } from '../../utils/utils'
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
const [texts, textsCap] = translated({
    customReasonLabel: 'Custom Reason',
    customReasonPlaceholder: 'Enter a reason for your request',
    formHeader: 'Request Partner Identity',
    formSubheader: 'Request one or more user(s) to share a Totem Identity with you.',
    invalidUserId: 'Invalid User ID',
    reason1: 'To add your Identity to my Partner list',
    reason2: 'Timekeeping on an Activity',
    reason3: 'custom',
    reasonPlaceholder: 'Select a reason for this request',
    successMsg: `Identity request has been sent to selected user(s). You will receive notification once they agree to share their Identity with you.`,
    successMsgHeader: 'Request sent!',
    errorMessageHeader: 'Request failed!',
    userIds: 'User ID(s)',
    userIdsNoResultsMessage: 'Type an User ID and press enter to add',
    userIdsPlaceholder: 'Enter User ID(s)',
}, true)
const reasonList = [
    textsCap.reason1,
    textsCap.reason2,
    textsCap.reason3,
]
const inputNames = {
    customReason: 'customReason',
    reason: 'reason',
    userIds: 'userIds',
}

export default class IdentityRequestForm extends Component {
    constructor(props) {
        super(props)

        const { values } = props
        values.userIds = (values.userIds || [])
        if (isStr(values.userIds)) values.userIds = values.userIds.split(',')

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
                    name: inputNames.userIds,
                    multiple: true,
                    noResultsMessage: texts.userIdsNoResultsMessage,
                    required: true,
                    placeholder: texts.userIdsPlaceholder,
                    type: 'UserIdInput',
                },
                {
                    label: wordsCap.reason,
                    maxLength: 160,
                    name: inputNames.reason,
                    onChange: (e, values, i) => {
                        const { inputs } = this.state
                        const showCustom = [texts.reason3, 'Custom']
                            .includes(values.reason)
                        findInput(inputs, inputNames.customReason).hidden = !showCustom
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
                    name: inputNames.customReason,
                    maxLength: 160,
                    placeholder: texts.customReasonPlaceholder,
                    required: true,
                    type: 'text',
                    value: '',
                }
            ]
        }

        fillValues(this.state.inputs, values)
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
        [inputNames.customReason]: PropTypes.string,
        [inputNames.reason]: PropTypes.string,
        [inputNames.userIds]: PropTypes.oneOfType([
            PropTypes.array,
            PropTypes.string,
        ])
    })
}
IdentityRequestForm.defaultProps = {
    closeText: wordsCap.close,
    header: texts.formHeader,
    size: 'tiny',
    subheader: texts.formSubheader,
    submitText: wordsCap.submit,
}