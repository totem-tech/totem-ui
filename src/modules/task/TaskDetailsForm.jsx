/*
 * Read-only form that displays task details
 */
import React from 'react'
import PropTypes from 'prop-types'
import FormBuilder from '../../components/FormBuilder'
import { translated } from '../../services/language'

const textsCap = translated({
    
}, true)[1]

export default function TaskDetailsForm({ task, taskId }) {
    const props = {

    }

    return <FormBuilder {...props} />
}