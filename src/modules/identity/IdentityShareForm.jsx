import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { isFn, isObj, isArr, isStr } from '../../utils/utils'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import client from '../chat/ChatClient'
import { getAll as getPartners } from '../partner/partner'
import { find as findIdentity, getAll as getIdentities } from './identity'
import { Button } from 'semantic-ui-react'
import { showForm } from '../../services/modal'
import LocationForm, { inputNames as locFormInputNames } from '../location/LocationForm'
import { get as getLocation } from '../location/location'

const notificationType = 'identity'
const childType = 'share'
const textsCap = translated({
    identities: 'identities',
    identity: 'identity',
    partners: 'partners',
    partner: 'partner',

    failedMsgHeader: 'submission failed!',
    formHeader1: 'share identity/partner',
    formHeader2: 'share identity',
    formHeader3: 'share partner',
    formSubheader: 'with one or more Totem users',
    identityLabel1: 'partner/identity to be shared',
    identityLabel2: 'identity to be shared',
    identityLabel3: 'partner to be shared',
    identityPlaceholder: 'select an identity',
    includeLocation: 'include contact address',
    introducedByLabel: 'introduced by',
    nameLabel: 'change partner name (this will be seen by recipients)',
    namePlaceholder: 'enter a name to be shared',
    successMsgContent: 'identity has been sent to selected users',
    successMsgHeader: 'identity sent!',
    updateLocation: 'update contact address',
    userIdsLabel: 'recipients',
    userIdsNoResultMsg: 'type user ID and press enter to add',
    userIdsPlaceholder: 'enter user IDs',
}, true)[1]

export const inputNames = {
    address: 'address',
    includeLocation: 'includeLocation',
    introducedBy: 'introducedBy',
    name: 'name',
    userIds: 'userIds',
}
export default class IdentityShareForm extends Component {
    constructor(props) {
        super(props)

        this.state = {
            header: textsCap.formHeader1,
            message: {},
            onSubmit: this.handleSubmit,
            success: false,
            inputs: [
                {
                    label: textsCap.identityLabel1,
                    name: inputNames.address,
                    onChange: this.handleAddressChange,
                    placeholder: textsCap.identityPlaceholder,
                    required: true,
                    rxValue: new BehaviorSubject(),
                    search: true,
                    selection: true,
                    type: 'dropdown',
                },
                {
                    name: inputNames.includeLocation,
                    options: [],
                    type: 'checkbox-group',
                    toggle: true,
                    value: false
                },
                {
                    label: textsCap.nameLabel,
                    name: inputNames.name,
                    placeholder: textsCap.namePlaceholder,
                    required: false,
                    type: 'text',
                },
                {
                    includePartners: true,
                    label: textsCap.userIdsLabel,
                    name: inputNames.userIds,
                    multiple: true,
                    noResultsMessage: textsCap.userIdsLabel,
                    placeholder: textsCap.userIdsPlaceholder,
                    required: true,
                    type: 'UserIdInput',
                },
                {
                    hidden: true,
                    label: textsCap.introducedByLabel,
                    multiple: false,
                    name: inputNames.introducedBy,
                    readOnly: true,
                    type: 'UserIdInput',
                },
            ],
        }
    }

    componentWillMount() {
        // prefill and disable fields 
        const { includePartners, includeOwnIdentities, values } = this.props

        values.userIds = (values.userIds || [])
        if (isStr(values.userIds)) values.userIds = values.userIds.split(',')

        const address = values[inputNames.address]
        const userIds = values[inputNames.userIds]
        const { inputs } = this.state
        const identityIn = findInput(inputs, inputNames.address)
        // add identity options
        identityIn.options = []
        if (includeOwnIdentities) {
            includePartners && identityIn.options.push({
                key: 0,
                style: styles.itemHeader,
                text: textsCap.identities,
                value: '' // keep
            })
            identityIn.options.push(
                ...getIdentities().map(({ address, name }) => ({
                    key: address,
                    name, // keep
                    text: name,
                    value: address,
                })))
        }
        if (includePartners) {
            includeOwnIdentities && identityIn.options.push({
                key: 0,
                style: styles.itemHeader,
                text: textsCap.partners,
                value: '' // keep
            })
            identityIn.options.push(...Array.from(getPartners())
                .map(([address, { name }]) => ({
                    key: address,
                    name, // keep
                    text: name,
                    value: address,
                }))
            )
        }

        let header = textsCap.formHeader1
        if (!includePartners) {
            identityIn.label = textsCap.identityLabel2
            header = textsCap.formHeader2
        } else if (!includeOwnIdentities) {
            identityIn.label = textsCap.identityLabel3
            header = textsCap.formHeader3
        }

        // add User Ids as options if supplied in values
        if (isArr(userIds) && userIds.length > 0) {
            const userIdIn = findInput(inputs, inputNames.userIds)
            userIdIn.options = (userIds || []).map(id => ({
                key: id,
                text: id,
                value: id,
            }))
        }

        // prefill values
        fillValues(inputs, values)

        // show introducedBy only if value exists
        findInput(inputs, inputNames.introducedBy).hidden = !values[inputNames.introducedBy]
        this.setState({ header, inputs })

        if (!address) return
        // hide name input if public company is being shared
        identityIn.loading = true
        client.company(address, null, (_, company) => {
            identityIn.loading = false
            if (isObj(company)) findInput(inputs, inputNames.name).hidden = true
            this.setState({ inputs })
        })
    }

    handleAddressChange = (_, values) => {
        const { inputs } = this.state
        const includeLocationIn = findInput(inputs, inputNames.includeLocation)
        const address = values[inputNames.address]
        const { locationId } = findIdentity(address) || {}
        includeLocationIn.hidden = !locationId
        includeLocationIn.options = [{
            label: (
                <div style={{ marginTop: -5 }}>
                    {textsCap.includeLocation + ' '}
                    <Button {...{
                        // circular: true,
                        icon: 'pencil',
                        onClick: e => {
                            e.stopPropagation()
                            e.preventDefault()
                            showForm(LocationForm, {
                                autoSave: true,
                                id: locationId,
                                // disable remove button prevent location being deleted from here
                                inputsHidden: [locFormInputNames.removeBtn],
                            })
                        },
                        size: 'mini',
                        title: textsCap.updateLocation,
                    }} />
                </div>
            ),
            value: true,
        }]
        this.setState({ inputs })
    }

    handleSubmit = (e, values) => {
        const { onSubmit } = this.props
        const { inputs } = this.state
        const addressIn = findInput(inputs, inputNames.address)
        const address = values[inputNames.address]
        const identity = findIdentity(address)
        const sharePartner = !identity
        const includeLocation = values[inputNames.includeLocation]
        const name = values[inputNames.name] || addressIn.options.find(x => x.value === address).name
        const userIds = values[inputNames.userIds]
        const location = includeLocation && identity ? getLocation(identity.locationId) : undefined
        const data = { address, name, location }

        this.setState({ loading: true })
        const callback = err => {
            const success = !err
            const message = {
                content: textsCap.successMsgContent,
                header: textsCap.successMsgHeader,
                icon: true,
                status: 'success',
            }
            this.setState({
                loading: false,
                message: success ? message : {
                    header: textsCap.failedMsgHeader,
                    content: err,
                    icon: true,
                    status: 'error',
                },
                success,
            })
            isFn(onSubmit) && onSubmit(success, values)
        }
        addToQueue({
            type: QUEUE_TYPES.CHATCLIENT,
            func: 'notify',
            title: sharePartner ? textsCap.formHeader3 : textsCap.formHeader2,
            description: `${sharePartner ? textsCap.partner : textsCap.identity}: ${data.name}`
                + '\n' + `${textsCap.userIdsLabel}: ${userIds.join()}`,
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
    // determines whether to include partner list as well as user owned identities
    includePartners: PropTypes.bool,
    includeOwnIdentities: PropTypes.bool,
    values: PropTypes.shape({
        [inputNames.address]: PropTypes.string,
        [inputNames.includeLocation]: PropTypes.bool,
        [inputNames.introducedBy]: PropTypes.string,
        [inputNames.name]: PropTypes.string,
        [inputNames.userIds]: PropTypes.oneOfType([
            PropTypes.array,
            PropTypes.string,
        ])
    }),
}
IdentityShareForm.defaultProps = {
    includePartners: false,
    includeOwnIdentities: true,
    size: 'tiny',
    subheader: textsCap.formSubheader,
}

const styles = {
    itemHeader: {
        background: 'grey',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1em'
    }
}