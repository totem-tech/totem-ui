/*
 * Read-only form that displays task details
 */
import React, { isValidElement, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import FormBuilder from '../../components/FormBuilder'
import { translated } from '../../services/language'
import JSONView, { jsonView } from '../../components/JSONView'
import { arrSort, objClean, objWithoutKeys } from '../../utils/utils'
import { blockNumberToTS, format } from '../../utils/time'
import { getCurrentBlock } from '../../services/blockchain'
import { usePromise } from '../../utils/reactHelper'

const textsCap = translated({
    header: 'task details',
}, true)[1]

export default function TaskDetailsForm(props = {}) {
    const [state, setState] = useState({ loading: true})

    useEffect(() => { 
        getCurrentBlock().then(blockNum => {
            let { values, id } = props
            values = {...values}
            const { deadline, dueDate } = values
            values.amount = parseInt(values.amountXTX)
            values.tsUpdated = format(values.tsUpdated, true, false)
            values.deadline = blockNumberToTS(deadline, blockNum)
            values.dueDate = blockNumberToTS(dueDate, blockNum)
            values.id = id
            values = objWithoutKeys(values, [
                'allowEdit',
                'isMarket',
                'amountXTX',
                'isSell',
                'orderType',
                ...Object
                    .keys(values)
                    .filter(x => x.startsWith('_')),
            ])
            const state = {
                closeText: null,
                inputs: [{
                    content: (
                        <JSONView {...{
                            data: values,
                        }} />
                    ),
                    name: 'html',
                    type: 'html',
                }],
                // inputs: Object
                //     .keys(values)
                //     .map(key => {
                //         const value = values[key]
                //         const isEl = isValidElement(value)
                //         console.log({isEl, value})
                //         return {
                //             content: isEl ? value : undefined,
                //             label: key,
                //             name: key,
                //             type: isEl
                //                 ? 'html'
                //                 : 'text',

                //             value: isEl ? undefined : value,
                //         }
                //     }),
                loading: false,
                submitText: null,
            }
            setState(state)
        })
    }, [])

    return <FormBuilder {...{ ...props, ...state }} />
}
TaskDetailsForm.defaultProps = {
    header: textsCap.header,
    // size: 'tiny',
}