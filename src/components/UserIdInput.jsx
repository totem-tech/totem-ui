import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { arrUnique, isFn, objWithoutKeys, arrSort, isStr } from '../utils/utils'
import FormInput from './FormInput'
import { getChatUserIds } from '../modules/chat/chat'
import client, { getUser } from '../modules/chat/ChatClient'
import { translated } from '../services/language'
import partners from '../modules/partner/partner'

const textsCap = translated({
    add: 'add',
    enterUserId: 'enter user ID',
    enterUserIds: 'enter user IDs',
    fromChatHistory: 'from recent chats',
    invalidUserId: 'invalid user ID',
    noResultsMessage: 'type a User ID and press enter to add',
    partner: 'partner',
    validatingUserId: 'checking if user ID exists...',
    ownIdEntered: 'please enter an ID other than your own',
}, true)[1]
const noAttrs = [
    'excludeOwnId',
    'includeFromChat',
    'includePartners',
    'message',
    'multiple',
    'newUser',
    'required',
    'validate',
]
const noAttrsTextField = [
    ...noAttrs,
    'allowAdditions',
    'clearable',
]
const invalidIcon = { color: 'red', name: 'warning circle', size: 'large' }
const validIcon = { color: 'green', name: 'check circle', size: 'large' }
const userIdRegex = /^[a-z][a-z0-9]+$/
// removes surrounding whitespaces, removes '@' at the beginning and transforms to lowercase
export const getRawUserID = userId => !isStr(userId) ? '' : userId.trim().replace('@', '').toLowerCase()

export default class UserIdInput extends Component {
    constructor(props) {
        super(props)

        const { allowAdditions, clearable, includePartners, includeFromChat, multiple, options, value } = props
        let input = {
            defer: null,
            inlineLabel: { icon: { className: 'no-margin', name: 'at' } },
            labelPosition: 'left',
            maxLength: 16,
            placeholder: textsCap.enterUserId,
            type: 'text',
            validate: this.validateTextField,
            value: '',
            useInput: true,
        }

        // use dropdown
        if (multiple || includeFromChat || includePartners || options) input = {
            additionLabel: `${textsCap.add} @`,
            allowAdditions,
            clearable,
            multiple: multiple,
            noResultsMessage: textsCap.noResultsMessage,
            onAddItem: this.handleAddUser,
            onClose: () => this.setState({ open: false }),
            onOpen: () => this.setState({ open: true }),
            onSearchChange: this.handleSearchChange,
            options: options || [],
            placeholder: textsCap.enterUserIds,
            search: true,
            searchQuery: props.searchQuery || '',
            selection: true,
            type: 'dropdown',
            value: multiple ? [] : value,
        }

        this.state = {
            ...input,
            onChange: this.handleChange,
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        let { options } = this.state
        let { excludeOwnId, includeFromChat, includePartners, multiple, value } = this.props
        value = value || (multiple ? [] : '')
        if (!options) return this.setState({ value })

        const userIds = options.map(x => x.value)
        if (includePartners) {
            const partnerOptions = []
            Array.from(partners.getAll())
                .forEach(([_, { name, userId }]) => {
                    if (!userId || userIds.includes(userId)) return
                    userIds.push(userId) // prevents dupplicates
                    partnerOptions.push({
                        description: name,
                        icon: 'users',
                        key: userId,
                        text: userId,
                        title: textsCap.partner,
                        value: userId,
                    })
                    return true
                })
            options = options.concat(arrSort(partnerOptions, 'text'))
        }
        if (includeFromChat) {
            const historyUserIds = getChatUserIds()
                .filter(id => !userIds.includes(id))
            const huiOptions = arrSort(historyUserIds.map(id => ({
                icon: 'chat',
                key: id,
                text: id,
                title: textsCap.fromChatHistory,
                value: id,
            })), 'text')
            options = options.concat(huiOptions)
        }
        if (excludeOwnId) options = options.filter(x => x.value !== (getUser() || {}).id)
        this.setState({ options, value })
    }

    componentWillUnmount() {
        this._mounted = false
    }

    handleAddUser = (e, data) => {
        data.value = getRawUserID(data.value)
        const { value: userId } = data
        const { excludeOwnId, multiple, onChange } = this.props
        const isOwnId = excludeOwnId && (getUser() || {}).id === userId
        let { value } = this.state
        const removeNewValue = () => {
            const index = value.indexOf(userId)
            if (multiple && index >= 0) return value.splice(index, 1)
            value = undefined
        }
        isOwnId && removeNewValue()
        this.setState({
            loading: !isOwnId,
            message: !isOwnId ? undefined : {
                content: textsCap.ownIdEntered,
                icon: true,
                status: 'warning'
            },
            noResultsMessage: isOwnId ? textsCap.noResultsMessage : textsCap.validatingUserId,
            open: !isOwnId,
            searchQuery: '',
            value,
        })
        isFn(onChange) && onChange(e, { ...data, invalid: true, value })
        // trigger a value change
        if (isOwnId) return

        // check if User ID is valid
        client.idExists(userId, (err, exists) => {
            const input = this.state
            input.loading = false
            input.message = exists ? undefined : {
                content: `${textsCap.invalidUserId}: ${userId}`,
                icon: true,
                status: 'warning',
            }

            if (!exists) {
                // not valid => remove from values
                removeNewValue()
            } else {
                // required to prevent Semantic's unexpected behaviour!!
                value = !multiple ? value : arrUnique([...value, userId])
                const optionExists = input.options.find(x => x.value === userId)
                // add newly added user id as an option
                !optionExists && input.options.push({
                    key: userId,
                    text: '@' + userId,
                    value: userId
                })
            }
            // trigger a value change
            isFn(onChange) && onChange(e, { ...data, invalid: false, value })
            this.setState({
                ...input,
                noResultsMessage: textsCap.noResultsMessage,
                open: exists && multiple,
                value,
                searchQuery: '',
            })
        })
    }

    handleChange = (e, data) => {
        const { onChange } = this.props
        const { type } = this.state
        if (type !== 'dropdown') data.value = getRawUserID(data.value)
        const { value } = data
        const s = { value }
        if (type === 'dropdown') {
            // only for dropdown
            s.message = undefined
            s.searchQuery = ''
        }
        this.setState(s)
        isFn(onChange) && onChange(e, data)
    }

    handleSearchChange = (_, { searchQuery: s }) => this.setState({ searchQuery: getRawUserID(s) })

    validateTextField = (e, data) => {
        data.value = getRawUserID(data.value)
        const { value } = data
        const { excludeOwnId, newUser, onChange } = this.props
        const isOwnId = excludeOwnId && (getUser() || {}).id === value
        // trigger a value change
        const triggerChagne = invalid => {
            this.setState({
                icon: !value ? undefined : (invalid ? invalidIcon : validIcon),
            })
            isFn(onChange) && onChange(e, {
                ...data,
                invalid,
            })
        }
        if (isOwnId || value.length < 3) {
            triggerChagne(true)
            return isOwnId ? textsCap.ownIdEntered : true
        }
        if (!userIdRegex.test(value)) {
            triggerChagne(true)
            return true
        }
        client.idExists(value, (err, exists) => {
            const invalid = err ? true : (
                newUser ? exists : !exists
            )
            triggerChagne(invalid)
        })
    }

    render() {
        let { invalid, loading, options } = this.state
        const { multiple } = this.props
        invalid = invalid || this.props.invalid
        loading = loading || this.props.loading
        return <FormInput {...{
            ...objWithoutKeys(
                this.props,
                !multiple ? noAttrsTextField : noAttrs
            ),
            ...this.state,
            invalid,
            loading,
            options,
        }} />
    }
}
UserIdInput.propTypes = {
    allowAdditions: PropTypes.bool,
    clearable: PropTypes.bool,
    excludeOwnId: PropTypes.bool,
    // if `@multiple` === true, include user ids from chat history
    includeFromChat: PropTypes.bool,
    // if `@multiple` === true, include partners with user ids
    includePartners: PropTypes.bool,
    multiple: PropTypes.bool,
    // Reverses validation for single user and textfield
    // Applicable only when (When multiple = false && includePartners = false && options is undefined)
    newUser: PropTypes.bool,
}
UserIdInput.defaultProps = {
    allowAdditions: true,
    clearable: true,
    excludeOwnId: true,
    includeFromChat: false,
    includePartners: false,
    multiple: false,
    newUser: false,
}