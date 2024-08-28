import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import FormInput from '../../components/FormInput'
import { translated } from '../../utils/languageHelper'
import { closeModal, confirm } from '../../services/modal'
import { statuses } from '../../utils/reactjs'
import storage from '../../utils/storageHelper'
import {
    arrSort,
    deferred,
    isBool,
    isFn,
} from '../../utils/utils'
import identities from '../identity/identity'
import partners from '../partner/partner'
// import { get, remove, set } from './formService' // Replace with actual service

const textsCap = {
    field1Label: 'Field 1',
    field1Placeholder: 'Enter field 1',
    field2Label: 'Field 2',
    field2Placeholder: 'Enter field 2',
    formHeaderCreate: 'Add New Form',
    formHeaderUpdate: 'Update Form',
    formSubheaderUpdate: 'Changes will be auto-saved',
    remove: 'Remove',
    removeForm: 'Remove Form',
    saved: 'Saved',
    saveForm: 'Save Form',
}

translated(textsCap, true)

export const requiredFields = {
    field1: 'field1',
    field2: 'field2',
}
export const optionalFields = {
    field3: 'field3',
    field4: 'field4',
}
export const inputNames = {
    ...requiredFields,
    ...optionalFields,
    autoSave: 'autoSave',
}

export default class CustomForm extends Component {
    constructor(props) {
        super(props)
        this.state = {
            inputs: [],
            values: {},
        }
        this.rxAutoSave = new BehaviorSubject(!!props.autoSave)
    }

    componentWillMount = () => {
        this._mounted = true
        const { inputs, values } = this.state

        fillValues(inputs, values, true)
        this.setState({ inputs })
    }

    componentWillUnmount = () => (this._mounted = false)

    handleFieldChange = (e, values) => {
        const { inputs } = this.state
        const field1 = values[inputNames.field1]
        const field2 = values[inputNames.field2]
        const field1In = findInput(inputs, inputNames.field1)
        const field2In = findInput(inputs, inputNames.field2)

        field1In.value = field1
        field2In.value = field2

        this.setState({ inputs })
    }

    render() {
        const { inputs, values } = this.state
        return (
            <FormBuilder
                {...this.props}
                inputs={inputs}
                values={values}
                onChange={this.handleFieldChange}
            />
        )
    }
}

CustomForm.propTypes = {
    autoSave: PropTypes.bool,
}

CustomForm.defaultProps = {
    autoSave: true,
}