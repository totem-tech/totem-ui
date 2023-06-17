import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { BehaviorSubject } from 'rxjs'
import {
    arrSort,
    arrUnique,
    isArr,
    isFn,
    isStr,
    isSubjectLike,
    objWithoutKeys,
} from '../utils/utils'
import FormInput from './FormInput'
import { getChatUserIds } from '../modules/chat/chat'
import client, { getUser } from '../utils/chatClient'
import { translated } from '../utils/languageHelper'
import partners from '../modules/partner/partner'
import PromisE from '../utils/PromisE'
import { copyRxSubject } from '../utils/reactjs'

const textsCap = {
    add: 'add',
    enterUserId: 'enter user ID',
    enterUserIds: 'enter user IDs',
    fromChatHistory: 'from recent chats',
    idCheckError: 'failed to check if user ID exists!',
    idCrAlphaNum: 'contains only letters and numbers',
    idCrHeader: 'Enter an username matching the following criteria:',
    idCrLength: 'between 3 and 16 characters',
    idCrStart: 'start with a letter',
    invalidUserId: 'invalid user ID',
    noResultsMessage: 'type a User ID and press enter to add',
    partner: 'partner',
    validatingUserId: 'checking if user ID exists...',
    ownIdEntered: 'please enter an ID other than your own',
}
translated(textsCap, true)
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
const invalidIcon = {
    color: 'red',
    name: 'warning circle',
    size: 'large'
}
const validIcon = {
    color: 'green',
    name: 'check circle',
    size: 'large'
}
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
            label,
            multiple,
            newUser,
            options,
            placeholder,
            reject = [],
            rxValue,
            searchQuery,
            value,
        } = props
        const useDropwdown = multiple || includeFromChat || includePartners || options
        placeholder = placeholder || textsCap.enterUserId
        rxValue = isSubjectLike(rxValue)
            ? rxValue
            : new BehaviorSubject(value)
        if (useDropwdown) {
            value = isStr(rxValue.value)
                ? value.split(',')
                : value || []
            if (!multiple) value = value[0]
            options = arrUnique([
                ...isArr(value)
                    ? value
                    : [value].filter(Boolean),
                (options || []).map(x => x.value),
            ])
                .filter(isStr)
                .sort()
                .map(id => ({
                    key: id,
                    text: id,
                    value: id,
                }))
            rxValue.next(value)
        }
        const ownId = (getUser() || {}).id
        let input = !useDropwdown
            ? {
                customMessages: {
                    regex: true, // turns input color to red but no message displayed
                    reject: textsCap.ownIdEntered,
                },
                inlineLabel: { icon: { className: 'no-margin', name: 'at' } },
                labelPosition: 'left',
                maxLength: MAX_LENGTH,
                minLength: MIN_LENGTH,
                placeholder,
                regex: userIdRegex,
                reject: [excludeOwnId && ownId, ...reject].filter(Boolean),
                rxValue, ///: copyRxSubject(rxValue, new BehaviorSubject()),
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
                additionLabel: `${textsCap.add}: @`,
                allowAdditions,
                clearable,
                multiple: multiple,
                noResultsMessage: textsCap.noResultsMessage,
                onAddItem: this.handleAddUser,
                onClose: () => this.setState({ open: false }),
                onOpen: () => this.setState({ open: true }),
                onSearchChange: this.handleSearchChange,
                options,
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
        let {
            options = [],
            rxValue,
            type,
        } = this.state
        if (type !== 'dropdown') return

        let {
            excludeOwnId,
            includeFromChat,
            includePartners,
        } = this.props

        let userIds = []
        let chatOptions = []
        // include user IDs from partners list
        let partnerOptions = !includePartners
            ? []
            : [...partners.getAll().values()]
                .map(({ name, userId }) => {
                    if (!userId || userIds.includes(userId)) return

                    userIds.push(userId)
                    return {
                        description: name,
                        icon: 'users',
                        key: userId,
                        text: userId,
                        title: textsCap.partner,
                        value: userId,
                    }
                })
                .filter(Boolean)

        // include user IDs from chat history
        if (includeFromChat) {
            chatOptions = getChatUserIds(false)
                .filter(id => !userIds.includes(id))
                .map(id => ({
                    icon: 'chat',
                    key: id,
                    text: id,
                    title: textsCap.fromChatHistory,
                    value: id,
                }))
        }
        userIds = userIds.concat(chatOptions.map(x => x.value))
        options = [
            ...options.filter(x =>
                !userIds.includes(x.value)
            ),
            ...partnerOptions,
            ...chatOptions,
        ]
        // prevents user from selecting their own ID
        if (excludeOwnId) {
            const { id: ownId } = getUser() || {}
            options = options.filter(x =>
                x.value !== ownId
            )
        }
        // sort by user ID
        options = arrSort(options, 'value')
        this.setState({ options })
    }

    componentWillUnmount() {
        this._mounted = false
    }

    handleAddUser = async (e, data) => {
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
            message: isOwnId && {
                content: textsCap.ownIdEntered,
                icon: true,
                status: 'warning'
            },
            noResultsMessage: isOwnId
                ? textsCap.noResultsMessage
                : textsCap.validatingUserId,
            open: !isOwnId,
            searchQuery: '',
            value,
        })
        isFn(onChange) && onChange(e, {
            ...data,
            invalid: true,
            value,
        })
        // trigger a value change
        if (isOwnId) return

        // check if User ID is valid
        let error
        const exists = await client
            .idExists(userId)
            .catch(err => {
                error = err
                return false
            })
        const input = this.state
        input.loading = false
        input.message = !exists && {
            content: error || `${textsCap.invalidUserId}: ${userId}`,
            header: error && textsCap.idCheckError,
            icon: true,
            status: !!error
                ? 'error'
                : 'warning',
        }

        console.log({ exists })
        if (exists !== true) {
            // not valid => remove from values
            removeNewValue()
        } else {
            // required to prevent Semantic's unexpected behaviour!!
            value = !multiple
                ? value
                : arrUnique([...value, userId])
            const optionExists = input
                .options
                .find(x => x.value === userId)
            // add newly added user id as an option
            !optionExists && input
                .options
                .push({
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
    }

    handleChange = (e, data) => {
        const { onChange } = this.props
        const { type } = this.state
        const isDD = type == 'dropdown'
        data.value = isDD
            ? data.value
            : getRawUserID(data.value)
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
        const exists = await client.idExists(getRawUserID(value))
        const invalid = newUser
            ? exists
            : !exists
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
        const props = {
            ...objWithoutKeys(
                this.props,
                !multiple
                    ? noAttrsTextField
                    : noAttrs
            ),
            ...this.state,
            loading,
            options,
        }
        return <FormInput {...props} />
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