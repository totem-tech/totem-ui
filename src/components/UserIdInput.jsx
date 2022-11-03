import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { arrUnique, isFn, objWithoutKeys, arrSort, isStr, deferred } from '../utils/utils'
import FormInput from './FormInput'
import { getChatUserIds } from '../modules/chat/chat'
import client, { getUser } from '../modules/chat/ChatClient'
import { translated } from '../services/language'
import partners from '../modules/partner/partner'
import PromisE from '../utils/PromisE'

const textsCap = translated({
    add: 'add',
    enterUserId: 'enter user ID',
    enterUserIds: 'enter user IDs',
    fromChatHistory: 'from recent chats',
    idCrAlphaNum: 'contains only letters and numbers',
    idCrHeader: 'Enter an username matching the following criteria:',
    idCrLength: 'between 3 and 16 characters',
    idCrStart: 'start with a letter',
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
const MAX_LENGTH = 16
const MIN_LENGTH = 3
const invalidIcon = { color: 'red', name: 'warning circle', size: 'large' }
const validIcon = { color: 'green', name: 'check circle', size: 'large' }
const userIdRegex = /^[a-z][a-z0-9]+$/
// removes surrounding whitespaces, removes '@' at the beginning and transforms to lowercase
export const getRawUserID = userId => !isStr(userId)
    ? ''
    : userId
        .trim()
        .replace('@', '')
        .toLowerCase()

class UserIdInput extends Component {
    constructor(props) {
        super(props)

        let {
            allowAdditions,
            clearable,
            excludeOwnId,
            includePartners,
            includeFromChat,
            multiple,
            newUser,
            options,
            placeholder,
            reject = [],
            rxValue,
            searchQuery,
            value,
        } = props
        placeholder = placeholder || textsCap.enterUserId
        rxValue = rxValue || new BehaviorSubject(value || (multiple ? [] : ''))
        const useDropwdown = multiple || includeFromChat || includePartners || options
        const ownId = (getUser() || {}).id
        let input = !useDropwdown
            ? {
                customMessages: {
                    regex: true, // turns input color to red but no message displayed
                    reject: textsCap.ownIdEntered,
                },
                inlineLabel: { icon: { className: 'no-margin', name: 'at' } },
                labelPosition: 'left',
                minLength: MIN_LENGTH,
                maxLength: MAX_LENGTH,
                placeholder,
                regex: userIdRegex,
                reject: [excludeOwnId && ownId, ...reject].filter(Boolean),
                rxValue,
                type: 'text',
                useInput: true,
                ...(!newUser
                    ? {}
                    : {
                        criteria: [
                            {
                                regex: /^.{3,16}$/,
                                text: textsCap.idCrLength,
                            },
                            {
                                regex: /^[a-z]+/,
                                text: textsCap.idCrStart,
                            },
                            {
                                regex: /^[a-z0-9]+$/,
                                text: textsCap.idCrAlphaNum,
                            },
                        ],
                        criteriaHeader: textsCap.idCrHeader,
                        minLength: undefined,
                        regex: undefined,
                    }),
            }
            : {
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
                placeholder,
                rxValue,
                search: true,
                searchQuery,
                selection: true,
                type: 'dropdown',
            }

        this.state = {
            ...input,
            onChange: this.handleChange,
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
        this.validateDeferred = PromisE.deferred()
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
        const isDD = type == 'dropdown'
        data.value = isDD ? data.value : getRawUserID(data.value)
        const { invalid, value } = data
        const s = { value }
        this.invalid = invalid
        // only for dropdown
        if (isDD) {
            s.message = undefined
            s.searchQuery = ''
        } else {
            s.icon = invalid
                ? invalidIcon
                : undefined
            if (value && !invalid) {
                s.loading = true
                this.validateTextField(value)
            }
        }
        this.setState(s)
        isFn(onChange) && onChange(e, data)
    }

    handleSearchChange = (_, { searchQuery: s }) => this.setState({ searchQuery: getRawUserID(s) })

    validateTextField = async (value) => {
        if (!value) return

        this.validateCount = (this.validateCount || 0) + 1
        await PromisE.delay(300)
        this.validateCount--
        if (this.validateCount > 0) return

        const { newUser } = this.props
        const exists = await client.idExists.promise(getRawUserID(value))
        const invalid = newUser ? exists : !exists
        this.setState({
            icon: invalid
                ? invalidIcon
                : validIcon,
            invalid,
            loading: false,
        })
    }

    render() {
        const { multiple } = this.props
        let { loading, options } = this.state
        loading = loading || this.props.loading
        return (
            <FormInput {...{
                ...objWithoutKeys(
                    this.props,
                    !multiple ? noAttrsTextField : noAttrs
                ),
                ...this.state,
                loading,
                options,
            }} />
        )
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
export default React.memo(UserIdInput)