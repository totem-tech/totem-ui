import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { isFn, isObj, isArr } from '../utils/utils'
import FormBuilder, { fillValues, findInput } from '../components/FormBuilder'
// services
import client from '../services/chatClient'
import identities from '../services/identity'
import { translated } from '../services/language'
import partners from '../services/partner'
import { addToQueue, QUEUE_TYPES } from '../services/queue'

const notificationType = 'identity'
const childType = 'share'
const [words, wordsCap] = translated({
    identities: 'identities',
    identity: 'identity',
    partners: 'partners',
    partner: 'partner',
}, true)
const [texts] = translated({
    failedMsgHeader: 'Submission Failed!',
    formHeader1: 'Share Identity/Partner',
    formHeader2: 'Share Identity',
    formHeader3: 'Share Partner',
    formSubheader: 'Share with one or more Totem users',
    identityLabel1: 'Partner/Identity to be shared',
    identityLabel2: 'Identity to be shared',
    identityLabel3: 'Partner to be shared',
    identityPlaceholder: 'Select an Identity',
    introducedByLabel: 'Introduced by',
    nameLabel: 'Change the partner name (this will be seen by recipients)',
    namePlaceholder: 'Enter a name to be shared',
    successMsgContent: 'Identity has been sent to selected user(s)',
    successMsgHeader: 'Identity sent!',
    userIdsLabel: 'Recipient(s)',
    userIdsNoResultMsg: 'Type user ID and press enter to add',
    userIdsPlaceholder: 'Enter User ID(s)',
})

export default class IdentityShareForm extends Component {
    constructor(props) {
        super(props)

        this.state = {
            header: texts.formHeader1,
            message: {},
            onSubmit: this.handleSubmit,
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
                    includePartners: true,
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
        const { includePartners, includeOwnIdentities, values } = this.props
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
                ...identities.getAll().map(({ address, name }) => ({
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
                ...Array.from(partners.getAll()).map(([address, { name }]) => ({
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

        // add User Ids as options if supplied in values
        if (isArr(userIds) && userIds.length > 0) {
            const userIdIn = findInput(inputs, 'userIds')
            userIdIn.options = (userIds || []).map(id => ({
                key: id,
                text: id,
                value: id,
            }))
        }

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

    handleSubmit = (e, values) => {
        const { onSubmit } = this.props
        const { inputs } = this.state
        const { address, name, userIds } = values
        const sharePartner = !identities.find(address)
        const data = {
            address,
            name: name || findInput(inputs, 'address').options.find(x => x.value === address).name,
        }
        this.setState({ loading: true })
        const callback = err => {
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
        }
        addToQueue({
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'notify',
            title: sharePartner ? texts.formHeader3 : texts.formHeader2,
            description: `${sharePartner ? wordsCap.partner : wordsCap.identity}: ${data.name}`
                + '\n' + `${texts.userIdsLabel}: ${userIds.join()}`,
            args: [
                userIds,
                notificationType,
                childType,
                null,
                data,
                callback
            ]
        })
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}

IdentityShareForm.propTypes = {
    inputsDisabled: PropTypes.arrayOf(PropTypes.string),
    // determines whether to include partner list as well as user owned identities
    includePartners: PropTypes.bool,
    includeOwnIdentities: PropTypes.bool,
    values: PropTypes.object,
}
IdentityShareForm.defaultProps = {
    inputsDisabled: [],
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