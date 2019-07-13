import React from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { ReactiveComponent} from 'oo7-react'
import { TransformBondButton } from '../../TransformBondButton'
import { deferred, IfMobile, isFn, isObj } from '../utils'
import addressbook from '../../services/addressbook'
import FormBuilder, { fillValues } from './FormBuilder'
import AddressLookup from '../AddressLookup'

class AddressbookEntry extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.nick = new Bond()
        this.lookup = new Bond()

        this.state = {
            message: {},
            tags: ['partner'],
            success: false,
            inputs: [
                {
                    bond: this.lookup,
                    label: 'Lookup account',
                    name: 'address',
                    // onChange: deferred(this.handleAddressChange, 300, this),
                    placeholder: 'Name or address',
                    type: 'AccountIdBond',
                    required: true,
                    validator: address => {
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
                    allowAdditions: true,
                    label: 'Tags',
                    name: 'tags',
                    noResultsMessage: 'Type tag and press enter to add',
                    multiple: true,
                    onAddItem: this.handleAddTag.bind(this),
                    onChange: this.handleTagChange.bind(this),
                    options: [{
                        key: 'partner',
                        text: 'partner',
                        value: 'partner'
                    }],
                    placeholder: 'Enter tags',
                    type: 'hidden',
                    search: true,
                    selection: true,
                    value: ['partner']
                },
                {
                    action: (
                        <TransformBondButton
                            content="Add"
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
                        const { inputs } = this.state
                        const nameExists = addressbook.getByName(name)
                        const address = this.lookup._value
                        const addressExists = addressbook.getByAddress(address)
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

        if (isObj(props.preFillValues)) { 
            fillValues(this.state.inputs, props.preFillValues, true)
        }
    }

    handleAddTag(_, data) {
        const { inputs } = this.state
        inputs.find(x => x.name === 'tags').options.push({
            key: data.value,
            text: data.value,
            value: data.value
        })
        this.setState({inputs})
    }

    // handleAddressChange(e, values, index) {
    //     const { inputs } = this.state
    //     inputs[index].message = {
    //         compact: true,
    //         content: <AddressLookup address={this.lookup} />
    //     }
    //     this.setState({inputs})
    // }

    handleTagChange(_, values) {
        this.setState({tags: values.tags})
    }

    handleSubmit(name, account) {
        const { onSubmit } = this.props
        const { tags } = this.state
        addressbook.add(name, account, tags)
        this.setState({success: true})
        setTimeout(()=> isFn(onSubmit) && onSubmit({name, account, tags}))
        return true
    }

    render() {
        const { 
            closeOnSubmit,
            header,
            headerIcon,
            subheader,
            modal,
            open,
            size,
            trigger
        } = this.props
        
        const { inputs, success } = this.state

        const getForm = (mobile) => () => (
            <FormBuilder {...{
                closeOnSubmit,
                header,
                headerIcon,
                hideFooter: true,
                inputs: mobile || modal ? inputs : inputs.map(x => {x.width = 8; return x;}), 
                modal, 
                open, 
                size,
                subheader,
                success,
                trigger
            }} />
        )
        return <IfMobile then={getForm(true)} else={getForm(false)} />
    }
}
AddressbookEntry.propTypes = {
    closeOnSubmit: PropTypes.bool,
    // values to be prefilled into inputs
    preFillValues: PropTypes.object,
    header: PropTypes.string,
    subheader: PropTypes.string,
    modal: PropTypes.bool,
    onSubmit: PropTypes.func,
    open: PropTypes.bool,
    size: PropTypes.string
}
AddressbookEntry.defaultProps = {
    closeOnSubmit: true,
    header: 'Add partner',
    size: 'tiny'
}
export default AddressbookEntry