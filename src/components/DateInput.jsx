import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Dropdown as DD, Icon } from 'semantic-ui-react'
import { isDate, isFn, isStr, objWithoutKeys, strFill } from '../utils/utils'
// import FormBuilder from './FormBuilder'
// import { showForm } from '../services/modal'

export default function DateInput(props) {
    const { clearable, disabled, ignoreAttributes, rxValue, value } = props
    const [[yearOptions, monthOptions, dayOptions]] = useState(() => [years, months, days]
        .map((arr, i) =>
            arr.map(value => {
                value = `${i === 0 ? value : strFill(value, 2, '0')}`
                return { text: value, value}
            })
        )
    )
    let [[yyyy, mm, dd], setValue] = useState([])

    useEffect(() => {
        let mounted = true
        const updateValue = newValue => {
            if (!mounted) return
            let arr = !isDate(new Date(newValue))
                ? [`${currentYear}`]
                : `${isStr(newValue) ? newValue : ''}`.split('T')[0].split('-')
            setValue(arr)
        }
        const subscribed = rxValue && rxValue.subscribe(updateValue)

        !subscribed && updateValue(value || '')
        return () => {
            mounted = false
            subscribed && subscribed.unsubscribe
        }
    }, [setValue])

    return (
        <div {...objWithoutKeys(props, ignoreAttributes)}>
            <Dropdown {...{
                disabled,
                lazyLoad: true,
                onChange: (e, d) => triggerChange(e, props, [d.value, mm, dd], setValue),
                options: yearOptions,
                placeholder: 'YYYY',
                search: true,
                value: yyyy || '',
            }} />
            <Dropdown {...{
                disabled,
                lazyLoad: true,
                onChange: (e, d) => triggerChange(e, props, [yyyy, d.value, dd], setValue),
                options: monthOptions,
                placeholder: 'MM',
                search: true,
                value: mm || '',
            }} />
            <Dropdown {...{
                disabled,
                lazyLoad: true,
                onChange: (e, d) => triggerChange(e, props, [yyyy, mm, d.value], setValue),
                options: dayOptions,
                placeholder: 'DD',
                search: true,
                value: dd || '',
            }} />
            {clearable && yyyy && mm && dd && (
                <Icon {...{
                    className: 'no-margin',
                    name: 'x',
                    onClick: e => triggerChange(e, props, [`${currentYear}`, '', ''], setValue),
                    style: { cursor: 'pointer' },
                }} />
            )}
        </div>
    )
}
DateInput.propTypes = {
    clearable: PropTypes.bool,
    disabled: PropTypes.bool,
    // lowest value
    max: PropTypes.string,
    // highest value
    min: PropTypes.string,
    ignoreAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
    rxValue: PropTypes.instanceOf(BehaviorSubject),
    // date value string in the following format: YYYY-DD-MM
    value: PropTypes.string,
}
DateInput.defaultProps = {
    clearable: true,
    ignoreAttributes: [
        'clearable',
        'ignoreAttributes',
        'rxValue',
    ],
    style: {
        whiteSpace: 'nowrap',
    }
}
const triggerChange = (e, props, valueArr, setValue) => {
    const { onChange } = props
    setValue(valueArr)
    if (!isFn(onChange) || valueArr.filter(Boolean).length < 3) return

    onChange(e, {...props, value: valueArr.join('-')})
}
const Dropdown = React.memo(DD)
const days = new Array(31)
    .fill(0)
    .map((_, i) => i + 1)
const months = new Array(12)
    .fill(0)
    .map((_, i) => i + 1)
const currentYear = new Date()
    .getFullYear()
const years = new Array(100)
    .fill(0)
    .map((_, i) => [currentYear + i, currentYear - i - 1])
    .flat()
    .sort()

// const demoFormProps = {
//     header: 'Demoing DateInput',
//     size: 'tiny',
//     onChange: (e, values) => console.log('form:onChange', {e, values}),
//     onSubmit: (values) => console.log({values}),
//     inputs: [
//         {
//             inline: true,
//             label: 'Date',
//             max: '2021-12-31',
//             min: '2020-11-01',
//             name: 'date',
//             onChange: (e, values) => console.log('input:onChange', {e, values}),
//             required: true,
//             rxValue: new BehaviorSubject('2021-01-01'),
//             type: 'date',
//         }
//     ]
// }
// showForm(props => <FormBuilder {...{ ...props, ...demoFormProps }} />)
