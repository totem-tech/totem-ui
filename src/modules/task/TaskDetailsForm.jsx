/*
 * Read-only form that displays task details
 */
import React from 'react'
import PropTypes from 'prop-types'
import FormBuilder from '../../components/FormBuilder'
import { translated } from '../../services/language'

const textsCap = translated({
    header: 'task details',
}, true)[1]

export default function TaskDetailsForm(props = {}) {
    const { values, id } = props
    const state = {
        submitText: null,
        inputs: [
            {
                content: (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify({ taskId: id, ...values }, null, 4)}
                    </div>
                ),
                name: 'details',
                type: 'html'
            }
        ]
    }

    return <FormBuilder {...{ ...props, ...state }} />
}
TaskDetailsForm.defaultProps = {
    header: textsCap.header,
    // size: 'tiny',
}