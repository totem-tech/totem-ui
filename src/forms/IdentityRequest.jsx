import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import { arrUnique, isFn } from '../utils/utils'
import client, { getUser } from '../services/chatClient'
import { translated } from '../services/language'

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
    userIdsNoResultsMessage: 'Type an User ID and press enter to add',
    userIdsPlaceholder: 'Enter User ID(s)',
})
const reasonList = [
    texts.reason1,
    texts.reason2,
    texts.reason3,
]

export default class IdentityRequestForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            loading: false,
            message: {},
            onSubmit: this.handleSubmit.bind(this),
            success: false,
            inputs: [
                {
                    includePartners: false,
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
    handleAddUser(e, data) {
        const { value: userId } = data
        const { inputs } = this.state
        const idsIn = findInput(inputs, 'userIds')
        idsIn.loading = true
        this.setState({ inputs })

        // check if User ID is valid
        client.idExists(userId, exists => {
            idsIn.loading = false
            idsIn.invalid = !exists
            idsIn.message = exists ? {} : {
                content: texts.invalidUserID,
                showIcon: true,
                status: 'error',
            }

            if (exists && (getUser() || {}).id !== userId) {
                idsIn.value = arrUnique([...idsIn.value, userId])
                idsIn.options = idsIn.value.map(id => ({
                    key: id,
                    text: id,
                    value: id,
                }))
            } else {
                // not valid or entered own userId => remove from values
                idsIn.value.splice(idsIn.value.indexOf(userId), 1)
            }

            this.setState({ inputs })
        })
    }

    handleSubmit(e, values) {
        const { onSubmit } = this.props
        const { userIds, reason, customReason } = values
        const data = { reason: reason === 'Custom' ? customReason : reason }
        this.setState({ loading: true })
        client.notify(userIds, notificationType, childType, null, data, err => {
            const success = !err
            const message = {
                content: texts.successMsg,
                header: texts.successMsgHeader,
                showIcon: true,
                status: 'success',
            }
            this.setState({
                loading: false,
                message: success ? message : {
                    header: texts.errorMessageHeader,
                    content: err,
                    showIcon: true,
                    status: 'error',
                },
                success
            })
            isFn(onSubmit) && onSubmit(success, values)
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