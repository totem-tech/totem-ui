import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { ss58Decode } from '../../utils/convert'
import storage from '../../utils/storageHelper'
import { deferred, isFn, generateHash } from '../../utils/utils'
import FormBuilder, { findInput, fillValues } from '../../components/FormBuilder'
import { translated } from '../../utils/languageHelper'
import client from '../../utils/chatClient'
import { setPublic } from './partner'

const textsCap = translated({
    companyExistsMsg: 'An entity already exists with the following name. You cannot resubmit.',
    countryLabel: 'country of registration',
    countryPlaceholder: 'select a country',
    header: 'make partner public',
    identity: 'identity',
    identityValidationMsg: 'pelease enter a valid Totem identity',
    nameLabel: 'company or entity Name',
    namePlaceholder: 'enter the trading name',
    regNumLabel: 'registered number',
    regNumPlaceholder: 'enter national registered number of entity',
    submitSuccessMsg: 'company added successfully',
    submitErrorHeader: 'submission failed',
    subheader: 'warning: doing this makes this partner visible to all Totem users',
    success: 'success',
}, true)[1]

export default class CompanyForm extends Component {
    constructor(props) {
        super(props)

        const { identity } = props.values || {}
        this.state = {
            message: props.message || {},
            success: false,
            onSubmit: this.handleSubmit,
            submitDisabled: {},
            inputs: [
                {
                    label: textsCap.identity,
                    name: 'identity',
                    onChange: deferred(this.handleIdentityChange, 300),
                    readOnly: !!identity,
                    rxValue: new BehaviorSubject(),
                    type: 'text',
                    validate: (e, { value }) => !value ? undefined : (
                        !ss58Decode(value) ? textsCap.identityValidationMsg : null
                    ),
                    value: ''
                },
                {
                    label: textsCap.nameLabel,
                    name: 'name',
                    placeholder: textsCap.namePlaceholder,
                    required: true,
                    rxValue: new BehaviorSubject(),
                    type: 'text',
                    value: ''
                },
                {
                    label: textsCap.regNumLabel,
                    name: 'registrationNumber',
                    placeholder: textsCap.regNumPlaceholder,
                    required: true,
                    type: 'text',
                    value: ''
                },
                {
                    label: textsCap.countryLabel,
                    name: 'countryCode',
                    options: Array.from(storage.countries.getAll())
                        .map(([_, { code, name }]) => ({
                            description: code,
                            key: code,
                            text: name,
                            value: code
                        })),
                    placeholder: textsCap.countryPlaceholder,
                    required: true,
                    selection: true,
                    search: ['text', 'description'],
                    type: 'dropdown'
                },
            ]
        }
        fillValues(this.state.inputs, props.values)
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount = ()=> this._mounted = true
    componentWillUnmount = ()=> this._mounted = true

    handleIdentityChange = (_, { identity }) => {
        // check if a company already exists with address
        const { inputs, submitDisabled } = this.state
        const input = findInput(inputs, 'identity')
        input.loading = true
        input.message = null
        submitDisabled.identity = true
        this.setState({ inputs, submitDisabled })

        client.companySearch(identity, true, (_, result) => {
            const exists = result.size > 0
            input.loading = false
            input.invalid = !!exists
            input.message = !exists ? null : {
                content: (
                    <div>
                        {textsCap.companyExistsMsg}
                        <div><b>{Array.from(result)[0][1].name}</b></div>
                    </div>
                ),
                icon: true,
                status: 'error',
            }
            submitDisabled.identity = false
            this.setState({ inputs, submitDisabled })
            // if a company already exists associated with this address
            // update partner accordingly
            exists && setPublic(identity)
        })
    }

    handleSubmit = async (e, values) => {
        const { onSubmit } = this.props
        const companyId = generateHash(values)
        const err = await client.company.promise(companyId, values)
        const success = !err
        const message = {
            content: success ? textsCap.submitSuccessMsg : err,
            header: success ? textsCap.success : textsCap.submitErrorHeader,
            icon: true,
            status: success ? 'success' : 'error'
        }
        this.setState({ success, message })

        isFn(onSubmit) && onSubmit(e, values, success)
    }

    render = () => <FormBuilder {...{ ...this.props, ...this.state }} />
}
CompanyForm.propTypes = {
    values: PropTypes.shape({
        countryCode: PropTypes.string,
        name: PropTypes.string,
        registrationNumber: PropTypes.string,
        identity: PropTypes.string.isRequired
    })
}
CompanyForm.defaultProps = {
    header: textsCap.header,
    size: 'tiny',
    subheader: textsCap.subheader,
}