import React, { Component } from 'react'
import { Bond } from 'oo7'
import PropTypes from 'prop-types'
import FormInput from './FormInput'
import { arrUnique, deferred, isFn, hasValue, objWithoutKeys, textCapitalize, arrSort, search } from '../utils/utils'
import client, { getUser } from '../services/ChatClient'
import partners from '../services/partners'

const words = {
    add: 'add'
}
const wordsCap = textCapitalize(words)
const texts = {
    enterUserId: 'Enter User ID',
    enterUserIds: 'Enter User ID(s)',
    invalidUserId: 'Invalid User ID',
    noResultsMessage: 'Type a User ID and press enter to add',
    ownIdEntered: 'Please enter an ID other than your own',
}
const noAttrs = [
    'excludeOwnId',
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
// eliminates any characters that are not allowed, including digits at the beginning
const getId = str => str.toLowerCase().replace(/(^[0-9]+)|[^a-z0-9]/gi, '')

export default class UserIdInput extends Component {
    constructor(props) {
        super(props)

        const { allowAdditions, clearable, includePartners, multiple, options, value } = props
        let input = {
            defer: null,
            inlineLabel: { icon: { className: 'no-margin', name: 'at' } },
            labelPosition: 'left',
            maxLength: 16,
            placeholder: texts.enterUserId,
            type: 'text',
            validate: this.validateTextField,
            value: '',
            useInput: true,
        }

        // use dropdown
        if (multiple || includePartners || options) input = {
            additionLabel: `${wordsCap.add} @`,
            allowAdditions,
            clearable,
            multiple: multiple,
            noResultsMessage: texts.noResultsMessage,
            onAddItem: this.handleAddUser,
            onClose: () => this.setState({ open: false }),
            onOpen: () => this.setState({ open: true }),
            onSearchChange: this.handleSearchChange,
            options: options || [],
            placeholder: texts.enterUserIds,
            search: true,
            searchQuery: props.searchQuery || '',
            selection: true,
            type: 'dropdown',
            value: multiple ? [] : value,
        }

        this.state = {
            ...input,
            // bond: props.bond || new Bond(),
            onChange: this.handleChange,
        }
    }

    componentWillMount() {
        this._mounted = true
        let { includePartners, multiple, value } = this.props
        value = value || (multiple ? [] : '')
        if (!includePartners) return this.setState({ value })

        let { options } = this.state
        const userIds = options.map(({ userId }) => userId)
        const partnersArr = Array.from(partners.getAll())
            .map(([_, p]) => p)
            .filter(({ userId }) => {
                if (!userId || userIds.includes(userId)) return
                userIds.push(userId)
                return true
            })
        options.push(...partnersArr.map(({ name, userId }) => ({
            key: userId,
            text: userId,
            description: name,
            value: userId,
        })))

        // sort by userId
        options = arrSort(options, 'text')
        this.setState({ options, value })
    }

    componentWillUnmount() {
        this._mounted = false
    }

    handleAddUser = (e, data) => {
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
                content: texts.ownIdEntered,
                showIcon: true,
                status: 'warning'
            },
            open: !isOwnId,
            searchQuery: '',
            value,
        })

        // trigger a value change
        if (isOwnId) return isFn(onChange) && onChange(e, { ...data, invalid: isOwnId, value })

        // check if User ID is valid
        client.idExists(userId, exists => {
            const input = this.state
            input.loading = false
            input.message = exists ? undefined : {
                content: `${texts.invalidUserId}: ${userId}`,
                showIcon: true,
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
                    text: userId,
                    value: userId
                })
            }
            // trigger a value change
            isFn(onChange) && onChange(e, { ...data, value })
            this.setState({
                ...input,
                open: exists && multiple,
                value,
                searchQuery: '',
            })
        })
    }

    handleChange = (e, data) => {
        const { onChange } = this.props
        const { type } = this.state
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

    handleSearchChange = (_, { searchQuery: s }) => this.setState({ searchQuery: s.toLowerCase() })

    validateTextField = (e, data) => {
        data.value = data.value.toLowerCase()
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
            return isOwnId ? texts.ownIdEntered : true
        }
        if (!userIdRegex.test(value)) {
            triggerChagne(true)
            return true
        }
        const cb = exists => {
            const invalid = newUser ? exists : !exists
            triggerChagne(invalid)
            return invalid
        }
        client.idExists.promise(value).then(cb, cb)
    }

    render() {
        let { invalid, loading, options } = this.state
        invalid = invalid || this.props.invalid
        loading = loading || this.props.loading
        // options = this.props.options || options
        return <FormInput {...{
            ...objWithoutKeys(
                this.props,
                !options ? noAttrsTextField : noAttrs
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
    includePartners: false,
    multiple: false,
    newUser: false,
}