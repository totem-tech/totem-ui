import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { isFn, isObj } from '../utils/utils'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import { handleAddUser } from './IdentityRequest'
import addressbook from '../services/partners'
import client from '../services/ChatClient'
import identityService from '../services/identity'

const notificationType = 'identity'
const childType = 'share'

export default class IdentityShareForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            message: {},
            onSubmit: this.handleSubmit.bind(this),
            success: false,
            inputs: [
                {
                    label: 'Partner to be shared',
                    name: 'address',
                    placeholder: 'Select an identity',
                    required: true,
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: '',
                },
                {
                    label: 'Enter new partner name (will be seen by recipients)',
                    name: 'name',
                    placeholder: 'Enter a name to be shared',
                    required: false,
                    type: 'text',
                    value: '',
                },
                {
                    allowAdditions: true,
                    clearable: true,
                    label: 'Recipient(s)',
                    multiple: true,
                    name: 'userIds',
                    noResultsMessage: 'Type user ID and press enter to add',
                    onAddItem: handleAddUser.bind(this),
                    options: [],
                    placeholder: 'Enter User ID(s)',
                    required: true,
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: [],
                },
            ]
        }
    }

    componentWillMount() {
        // prefill and disable fields 
        const { disabledFields, includePartners, includeOwnIdentities, values } = this.props
        const { address, userIds } = values
        const { inputs } = this.state
        const identityIn = findInput(inputs, 'address')
        // add identity options
        identityIn.options = []
        if (includeOwnIdentities) {
            identityIn.options.push(
                {
                    key: 0,
                    style: styles.itemHeader,
                    text: 'Identities',
                    value: '' // keep
                },
                ...identityService.getAll().map(({ address, name }) => ({
                    key: address,
                    name, // keep
                    text: name,
                    value: address
                })))
        }
        if (includePartners) {
            identityIn.options.push(
                {
                    key: 0,
                    style: styles.itemHeader,
                    text: 'Partners',
                    value: '' // keep
                },
                ...Array.from(addressbook.getAll()).map(([address, { name }]) => ({
                    key: address,
                    name, // keep
                    text: name,
                    value: address
                }))
            )
        }

        // disable fields
        inputs.forEach(input => input.disabled = disabledFields.includes(input.name))

        // add User Ids as options if supplied in values
        findInput(inputs, 'userIds').options = (userIds || []).map(id => ({
            key: id,
            text: id,
            value: id,
        }))

        // prefill values
        fillValues(inputs, values)
        this.setState({ inputs })

        if (!address) return
        // hide name input if public company is being shared
        identityIn.loading = true
        client.company(address, null, (_, company) => {
            identityIn.loading = false
            if (isObj(company)) findInput(inputs, 'name').hidden = true
            this.setState({ inputs })
        })
    }

    handleSubmit(e, values) {
        const { onSubmit } = this.props
        const { inputs } = this.state
        const { address, name, userIds } = values
        const data = {
            address,
            name: name || findInput(inputs, 'address').options.find(x => x.value === address).name,
        }
        this.setState({ loading: true })
        client.notify(userIds, notificationType, childType, null, data, err => {
            const success = !err
            const message = {
                content: `Identity has been sent to ${userIds.length === 1 ? '@' + userIds[0] : 'selected users'}`,
                header: 'Identity sent!',
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
                success,
            })
            isFn(onSubmit) && onSubmit(success, values)
        })
    }

    render() {
        return <FormBuilder {...{ ...this.props, ...this.state }} />
    }
}

IdentityShareForm.propTypes = {
    disabledFields: PropTypes.arrayOf(PropTypes.string),
    // determines whether to include partner list as well as user owned identities
    includePartners: PropTypes.bool,
    includeOwnIdentities: PropTypes.bool,
    values: PropTypes.object,
}

IdentityShareForm.defaultProps = {
    disabledFields: [],
    header: 'Share Identity',
    includePartners: false,
    includeOwnIdentities: true,
    size: 'tiny',
    subheader: 'Share an Identity with one or more Totem users',
}

const styles = {
    itemHeader: {
        background: 'grey',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1em'
    }
}