import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { isFn, isObj, textCapitalize } from '../utils/utils'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
import addressbook from '../services/partners'
import client from '../services/ChatClient'
import identityService from '../services/identity'

const notificationType = 'identity'
const childType = 'share'
const words = {
    identities: 'identities',
    partners: 'partners',
}
const wordsCap = textCapitalize(words)
const texts = {
    failedMsgHeader: 'Submission Failed!',
    formHeader1: 'Share Identity/Partner',
    formHeader2: 'Share Identity',
    formHeader3: 'Share Partner',
    formSubheader: 'Share with one or more Totem users',
    identityLabel1: 'Partner/identity to be shared',
    identityLabel2: 'Identity to be shared',
    identityLabel3: 'Partner to be shared',
    identityPlaceholder: 'Select an identity',
    introducedByLabel: 'Introduced by',
    nameLabel: 'Enter new partner name (will be seen by recipients)',
    namePlaceholder: 'Enter a name to be shared',
    successMsgContent: 'Identity has been sent to selected user(s)',
    successMsgHeader: 'Identity sent!',
    userIdsLabel: 'Recipient(s)',
    userIdsNoResultMsg: 'Type user ID and press enter to add',
    userIdsPlaceholder: 'Enter User ID(s)',
}

export default class IdentityShareForm extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            header: texts.formHeader1,
            message: {},
            onSubmit: this.handleSubmit.bind(this),
            success: false,
            inputs: [
                {
                    label: texts.identityLabel1,
                    name: 'address',
                    placeholder: texts.identityPlaceholder,
                    required: true,
                    search: true,
                    selection: true,
                    type: 'dropdown',
                    value: '',
                },
                {
                    label: texts.nameLabel,
                    name: 'name',
                    placeholder: texts.namePlaceholder,
                    required: false,
                    type: 'text',
                    value: '',
                },

                {
                    label: texts.userIdsLabel,
                    name: 'userIds',
                    multiple: true,
                    noResultsMessage: texts.userIdsLabel,
                    placeholder: texts.userIdsPlaceholder,
                    required: true,
                    type: 'UserIdInput',
                },
                {
                    hidden: true,
                    label: texts.introducedByLabel,
                    multiple: false,
                    name: 'introducedBy',
                    readOnly: true,
                    type: 'UserIdInput',
                    value: '',
                }
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
            includePartners && identityIn.options.push({
                key: 0,
                style: styles.itemHeader,
                text: wordsCap.identities,
                value: '' // keep
            })
            identityIn.options.push(
                ...identityService.getAll().map(({ address, name }) => ({
                    key: address,
                    name, // keep
                    text: name,
                    value: address
                })))
        }
        if (includePartners) {
            includeOwnIdentities && identityIn.options.push({
                key: 0,
                style: styles.itemHeader,
                text: wordsCap.partners,
                value: '' // keep
            })
            identityIn.options.push(
                ...Array.from(addressbook.getAll()).map(([address, { name }]) => ({
                    key: address,
                    name, // keep
                    text: name,
                    value: address
                }))
            )
        }

        let header = texts.formHeader1
        if (!includePartners) {
            identityIn.label = texts.identityLabel2
            header = texts.formHeader2
        } else if (!includeOwnIdentities) {
            identityIn.label = texts.identityLabel3
            header = texts.formHeader3
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

        // show introducedBy only if value exists
        findInput(inputs, 'introducedBy').hidden = !values.introducedBy
        this.setState({ header, inputs })

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
                content: texts.successMsgContent,
                header: texts.successMsgHeader,
                showIcon: true,
                status: 'success',
            }
            this.setState({
                loading: false,
                message: success ? message : {
                    header: texts.failedMsgHeader,
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
    includePartners: false,
    includeOwnIdentities: true,
    size: 'tiny',
    subheader: texts.formSubheader,
}

const styles = {
    itemHeader: {
        background: 'grey',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1em'
    }
}