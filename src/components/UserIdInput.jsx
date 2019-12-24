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
// eliminates any characters that are not allowed, including digits at the beginning
export const getId = str => str.toLowerCase().replace(/(^[0-9]+)|[^a-z0-9]/gi, '')

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
        if (multiple || includePartners) input = {
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
            bond: props.bond || new Bond(),
            onChange: this.handleChange,
        }
    }

    componentWillMount() {
        const { includePartners, multiple, value } = this.props
        hasValue(value) && this.state.bond.changed(value)
        if (!multiple && !includePartners) return

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

        this.setState({ options })
    }

    handleAddUser = (e, data) => {
        const { value: userId } = data
        const { excludeOwnId, multiple, onChange } = this.props
        const isOwnId = excludeOwnId && (getUser() || {}).id === userId
        let { value } = this.state
        const removeNewValue = () => {
            if (multiple) return value.splice(value.indexOf(userId), 1)
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
                // add newly added user id as an option
                input.options.push({
                    key: userId,
                    text: userId,
                    value: userId,
                })
            }
            // trigger a value change
            isFn(onChange) && onChange(e, { ...data, value })
            this.setState({
                ...input,
                open: exists && multiple,
                value
            })
        })
    }

    handleChange = (e, { value }) => this.setState({ value, message: undefined })

    handleSearchChange = (_, { searchQuery: q }) => this.setState({ searchQuery: getId(q) })

    validateTextField = (e, data) => new Promise(resolve => {
        data.value = getId(data.value)
        const { value } = data
        const { excludeOwnId, newUser, onChange } = this.props
        const isOwnId = excludeOwnId && (getUser() || {}).id === value
        // trigger a value change
        const triggerChagne = invalid => {
            this.setState({ icon: invalid ? invalidIcon : validIcon, value })
            isFn(onChange) && onChange(e, { ...data, invalid })
        }
        if (isOwnId || value.length < 3) return triggerChagne(true) | resolve(isOwnId ? texts.ownIdEntered : true)

        client.idExists(value, exists => {
            const invalid = newUser ? exists : !exists
            triggerChagne(invalid)
            resolve(invalid)
        })
    })

    render() {
        const { includeParners, multiple } = this.props
        let { invalid, loading } = this.state
        invalid = invalid || this.props.invalid
        loading = loading || this.props.loading
        return <FormInput {...{
            ...objWithoutKeys(
                this.props,
                !includeParners && !multiple ? noAttrsTextField : noAttrs
            ),
            ...this.state,
            invalid,
            loading,
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
    // Applicable only when (When multiple = false && includePartners = false)
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