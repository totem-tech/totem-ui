import React, { Component } from 'react'
import { Bond } from 'oo7'
import PropTypes from 'prop-types'
import FormInput from './FormInput'
import { arrUnique, deferred, isFn, hasValue, objWithoutKeys, textCapitalize, arrSort } from '../utils/utils'
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
    'required',
    'validate',
]
const noAttrsTextField = [
    ...noAttrs,
    'allowAdditions',
    'clearable',
]

export default class UserIdInput extends Component {
    constructor(props) {
        super(props)

        const { allowAdditions, clearable, includePartners, multiple, options, value } = props
        let input = {
            inlineLabel: { icon: { className: 'no-margin', name: 'at' } },
            labelPosition: 'left',
            placeholder: texts.enterUserId,
            type: 'text',
            value: '',
            useInput: true,
        }
        if (multiple || includePartners) input = {
            additionLabel: `${wordsCap.add} @`,
            allowAdditions,
            clearable,
            multiple: multiple,
            noResultsMessage: texts.noResultsMessage,
            onAddItem: this.handleAddUser.bind(this),
            onClose: () => this.setState({ open: false }),
            onOpen: () => this.setState({ open: true }),
            options: options || [],
            placeholder: texts.enterUserIds,
            search: true,
            selection: true,
            type: 'dropdown',
            value: multiple ? [] : value,
        }

        this.state = {
            ...input,
            bond: props.bond || new Bond(),
            onChange: this.handleChange.bind(this),
        }

        this.handleTextChange = deferred(this.handleTextChange, 300, this)
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

    handleChange(e, data) {
        const { includePartners, multiple, onChange } = this.props
        this.setState({ value: data.value, message: undefined })
        isFn(onChange) && onChange(e, data)
        !multiple && !includePartners && this.handleTextChange(e, data)
    }

    handleAddUser(e, data) {
        const { value: userId } = data
        const { excludeOwnId, multiple, onChange } = this.props
        const isOwnId = excludeOwnId && (getUser() || {}).id === userId
        let { value } = this.state
        const removeInvalidValue = () => {
            if (multiple) {
                value.splice(value.indexOf(userId), 1)
            } else {
                value = undefined
            }
        }
        isOwnId && removeInvalidValue()
        this.setState({
            loading: !isOwnId,
            message: !isOwnId ? undefined : {
                content: texts.ownIdEntered,
                showIcon: true,
                status: 'warning'
            },
            open: !isOwnId,
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
                removeInvalidValue()
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

    handleTextChange(e, data) {
        const { value } = data
        const { excludeOwnId, onChange } = this.props
        const isOwnId = excludeOwnId && (getUser() || {}).id === value
        if (isOwnId) return this.setState({
            invalid: true,
            message: {
                content: texts.ownIdEntered,
                showIcon: true,
                status: 'error'
            }
        })

        if (!value) return this.setState({ icon: undefined, message: undefined })

        client.idExists(value, exists => {
            const invalid = !exists
            this.setState({
                icon: {
                    color: exists ? 'green' : 'red',
                    name: `${exists ? 'check' : 'warning'} circle`,
                    size: 'large',
                },
                invalid,
                message: undefined,
            })
            // trigger a value change
            isFn(onChange) && onChange(e, { ...data, invalid, value })
        })
    }

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
}
UserIdInput.defaultProps = {
    allowAdditions: true,
    clearable: true,
    excludeOwnId: true,
    includePartners: false,
    multiple: false,
}