import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import client, { getUser } from '../services/chatClient'
import { arrUnique, isFn, textCapitalize } from '../utils/utils'

const notificationType = 'identity'
const childType = 'request'
const reasonList = [
    'To add your Identity to my Partner list',
    'Project timekeeping',
    // add anything else here
    'Custom'
]

const words = {
    user: 'user',
}
const wordsCap = textCapitalize(words)
const texts = {
    userIdsNoResultsMessage: 'Type a UserID and press enter to add',
    userIdsPlaceholder: 'Enter User ID(s)',
}

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
                    label: 'Reason',
                    name: 'reason',
                    onChange: (e, values, i) => {
                        const { inputs } = this.state
                        const showCustom = values.reason === 'Custom'
                        findInput(inputs, 'customReason').hidden = !showCustom
                        this.setState({ inputs })
                    },
                    options: reasonList.map(r => ({
                        key: r,
                        text: r,
                        value: r
                    })),
                    placeholder: 'Select a reason for this request',
                    required: true,
                    search: true,
                    selection: true,
                    type: 'DropDown',
                },
                {
                    hidden: true,
                    label: 'Custom Reason',
                    name: 'customReason',
                    maxLength: 160,
                    placeholder: 'Enter a reason for your request',
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
                content: `User ID "${userId}" not found`,
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
                content: `Identity request has been sent to ${userIds.length === 1 ? '@' + userIds[0] : 'selected users'}. 
                    You will receive notification once they agree to share their Identity with you.`,
                header: 'Request sent!',
                showIcon: true,
                status: 'success',
            }
            this.setState({
                loading: false,
                message: success ? message : {
                    header: 'Submission Failed!',
                    content: err,
                    showIcon: true,
                    status: 'error',
                },
                success
            })
            isFn(onSubmit) && onSubmit(success, values)
        })
    }

    render() {
        return (
            <FormBuilder {...{ ...this.props, ...this.state }} />
        )
    }
}
IdentityRequestForm.propTypes = {
    values: PropTypes.shape({
        userIds: PropTypes.array
    })
}
IdentityRequestForm.defaultProps = {
    closeText: 'Close',
    header: 'Request Partner Identity',
    size: 'tiny',
    subheader: 'Request one or more user(s) to share a Totem Identity with you.',
    submitText: 'Submit',
}