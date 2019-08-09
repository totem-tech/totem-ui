import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent} from 'oo7-react'
import { TransformBondButton } from '../TransformBondButton'
import { deferred, IfMobile, isFn, isObj } from '../utils/utils'
import addressbook, { setPublic } from '../services/addressbook'
import FormBuilder, { fillValues } from '../components/FormBuilder'
import client from '../services/ChatClient'
import {showForm} from '../services/modal'
import CompanyForm from './Company'
// import AddressLookup from '../AddressLookup'

class Partner extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.nick = new Bond()
        this.lookup = new Bond()

        this.handleChange = this.handleChange.bind(this)
        this.checkVisibility = this.checkVisibility.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
        const doUpdate = props.index >= 0
        const values = doUpdate && isObj(props.values) ? props.values : {}
        this.state = {
            doUpdate,
            message: {},
            tags: ['partner'],
            success: false,
            values,
            inputs: [
                {
                    bond: this.lookup,
                    disabled: doUpdate,
                    label: 'Lookup account',
                    name: 'address',
                    // onChange: deferred(this.handleAddressChange, 300, this),
                    onChange: (e, values) => this.checkVisibility(values.address),
                    placeholder: 'Name or address',
                    type: 'AccountIdBond',
                    required: true,
                    validator: address => {
                        const { values: oldValues } = this.props
                        if (doUpdate && isObj(oldValues) && oldValues.address === address) return address;
                        const { inputs } = this.state
                        const exists = addressbook.getByAddress(address)
                        inputs.find(x => x.name === 'address').message = !exists ? {} : {
                            content: 'Address already exists with name: "' + exists.name + '"',
                            status: 'error'
                        }
                        inputs.find(x => x.name === 'name').disabled = address ? !!exists : false
                        this.setState({inputs})
                        return address
                    }
                },
                {
                    // allowAdditions: true,
                    label: 'Tags',
                    name: 'tags',
                    // noResultsMessage: 'Type tag and press enter to add',
                    // multiple: true,
                    // onAddItem: this.handleAddTag.bind(this),
                    // onChange: this.handleTagChange.bind(this),
                    // options: [{
                    //     key: 'partner',
                    //     text: 'partner',
                    //     value: 'partner'
                    // }],
                    placeholder: 'Enter tags',
                    type: 'hidden',
                    // search: true,
                    // selection: true,
                    value: ['partner']
                },
                {
                    inline: true,
                    label: 'Type Of Partner',
                    name: 'type',
                    options: [
                        { label: 'Personal Contact', value: 'personal' },
                        { label: 'Business Contact', value: 'business' }
                    ],
                    radio: true,
                    required: true,
                    type:'checkbox-group',
                    value: 'personal'
                },
                {
                    bond: new Bond(),
                    inline: true,
                    label: 'Partner Visibility',
                    name: 'visibility',
                    options: [
                        { label: 'Private', value: 'private' },
                        { label: 'Public', value: 'public' }
                    ],
                    radio: true,
                    required: true,
                    type:'checkbox-group',
                    value: 'private'
                },
                {
                    action: props.modal ? undefined : (
                        <TransformBondButton
                            content={doUpdate ? 'Update' : 'Add' }
                            transform={this.handleSubmit.bind(this)}
                            args={[this.nick, this.lookup]}
                            immediate
                        />
                    ),
                    bond: this.nick,
                    label: 'Name',
                    name: 'name',
                    placeholder: 'A name for this address',
                    required: true,
                    type: 'InputBond',
                    validator: name => {
                        const { values: oldValues } = this.props
                        if (doUpdate && isObj(oldValues) && oldValues.name === name) return name;
                        const { inputs } = this.state
                        const nameExists = addressbook.getByName(name)
                        const address = this.lookup._value
                        const addressExists = !doUpdate && addressbook.getByAddress(address)
                        inputs.find(x => x.name === 'name').message = !nameExists ? {} : {
                            content: 'Please choose an unique name',
                            status: 'error'
                        }
                        this.setState({inputs})
                        return name && !nameExists && address && !addressExists ? name : null
                    }
                }
            ]
        }

        isObj(props.values) && fillValues(this.state.inputs, props.values, true)
        doUpdate && values.address && this.checkVisibility(values.address)
    }

    checkVisibility(address) {
        // check if address is aleady public
        client.company(address, null, company => {
            const { doUpdate, inputs } = this.state
            const { index } = this.props
            const isPublic = isObj(company)
            const visibility = inputs.find(x => x.name === 'visibility')
            visibility.disabled = isPublic
            visibility.bond.changed(isPublic ? 'public' : 'private')
            visibility.message = !isPublic ? null : {
                content: 'Address is already publicly shared as company named: ' + company.name,
                status: 'warning'  
            }
            // make sure addressbook is also updated
            doUpdate && addressbook.setPublic(index, isPublic)
            this.setState({inputs})
        })
    }

    // handleAddTag(_, data) {
    //     const { inputs } = this.state
    //     inputs.find(x => x.name === 'tags').options.push({
    //         key: data.value,
    //         text: data.value,
    //         value: data.value
    //     })
    //     this.setState({inputs})
    // }

    // handleAddressChange(e, values, index) {
    //     const { inputs } = this.state
    //     inputs[index].message = {
    //         compact: true,
    //         content: <AddressLookup address={this.lookup} />
    //     }
    //     this.setState({inputs})
    // }

    // handleTagChange(_, values) {
    //     this.setState({tags: values.tags})
    // }

    handleChange(_, values) {
        this.setState({values})
    }

    handleSubmit() {
        const { closeOnSubmit, index, modal, onSubmit, values: oldValues } = this.props
        const { inputs, values: newValues } = this.state
        const {name, address, tags, type, visibility} = newValues
        const doUpdate = index >= 0 && isObj(oldValues)
        if (doUpdate) {
            addressbook.updateByIndex(index, name, address, tags, type, visibility)
        } else {
            addressbook.add(name, address, tags, type, visibility)
        }

        // clear inputs
        !modal && fillValues(inputs, {}, true)

        this.setState({
            inputs,
            message: closeOnSubmit ? {} : {
                content: `Partner ${doUpdate ? 'updated' : 'created'} successfully`
            },
            success: true,
        })
        // Open add partner form
        isFn(onSubmit) && onSubmit(newValues, index)
        //clear form
        this.nick.changed('')
        this.lookup.changed('')
        const addCompany = newValues.visibility === 'public' && !inputs.find(x => x.name === 'visibility').disabled
        addCompany && showForm(CompanyForm, {
            message: {
                header: `Partner ${doUpdate ? 'updated' : 'added'} successfully`,
                content: 'You have chosen to make your partner public. Please fill up the form to proceed or click cancel to return.',
                status: 'success'
            },
            onSubmit: (e, v, success) => success && addressbook.setPublic(
                addressbook.getIndex(name, address),
                true
            ),
            walletAddress: address,
        })

        return true
    }

    render() {
        const { 
            closeOnSubmit,
            header,
            headerIcon,
            index,
            subheader,
            modal,
            open,
            size,
            trigger
        } = this.props
        
        const { doUpdate, inputs, message, success } = this.state

        const getForm = (mobile) => () => (
            <FormBuilder {...{
                closeOnSubmit,
                header: header || `${doUpdate ? 'Update' : 'Add'} partner`,
                headerIcon,
                hideFooter: !modal,
                inputs: mobile || modal ? inputs : inputs.map(x => {x.width = 8; return x;}), 
                message,
                modal,
                onChange: this.handleChange,
                onSubmit: modal ? this.handleSubmit : undefined,
                open, 
                size,
                subheader,
                submitText : `${doUpdate ? 'Update' : 'Add'} partner`,
                success,
                trigger
            }} />
        )
        return <IfMobile then={getForm(true)} else={getForm(false)} />
    }
}
Partner.propTypes = {
    closeOnSubmit: PropTypes.bool,
    header: PropTypes.string,
    // index number in the addressbook list
    // determines whether to create or update
    index: PropTypes.number,
    modal: PropTypes.bool,
    onSubmit: PropTypes.func,
    open: PropTypes.bool,
    size: PropTypes.string,
    subheader: PropTypes.string,
    // values to be prefilled into inputs
    values: PropTypes.object,
}
Partner.defaultProps = {
    closeOnSubmit: true,
    size: 'tiny'
}
export default Partner