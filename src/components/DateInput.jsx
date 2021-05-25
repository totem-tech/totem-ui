import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Dropdown as DD, Icon } from 'semantic-ui-react'
import { className, isDate, isFn, isStr, isValidDate, objWithoutKeys, strFill } from '../utils/utils'
import { useRxSubject } from '../services/react'
import { MOBILE, rxLayout } from '../services/window'
import { translated } from '../services/language'

const textsCap = translated({
    friday: 'friday',
    monday: 'monday',
    saturday: 'saturday',
    sunday: 'sunday',
    thursday: 'thursday',
    tuesday: 'tuesday',
    wednesday: 'wednesday',
}, true)[1]
const daysTranslated = [
    textsCap.sunday,
    textsCap.monday,
    textsCap.tuesday,
    textsCap.wednesday,
    textsCap.thursday,
    textsCap.friday,
    textsCap.saturday,
]

export default function DateInput(props) {
    const {
        clearable,
        disabled,
        dropdownProps,
        icon,
        ignoreAttributes,
        fluidOnMobile = true,
        onReset,
        rxValue,
        value,
    } = props
    const isMobile = !fluidOnMobile
        ? false
        : useRxSubject(rxLayout, l => l === MOBILE)[0]
    const [[yearOptions, monthOptions, dayOptions]] = useState(() => [years, months, days]
        .map((arr, i) => [
            {
                // empty
                text: '--',
                value: '',
            },
            ...arr.map(value => {
                value = `${i === 0 ? value : strFill(value, 2, '0')}`
                return { text: value, value}
            })
        ])
    )
    let [[yyyy, mm, dd, invalid], setValue] = useState([])

    useEffect(() => {
        let mounted = true
        const updateValue = newValue => {
            if (!mounted) return
            let arr = !isDate(new Date(newValue))
                ? [`${currentYear}`]
                : `${isStr(newValue) ? newValue : ''}`
                    .split('T')[0]
                    .split('-')
            setValue(arr)
        }
        const subscribed = rxValue && rxValue.subscribe(updateValue)

        !subscribed && updateValue(value || '')
        return () => {
            mounted = false
            subscribed && subscribed.unsubscribe
        }
    }, [setValue])
    const dayOptions1 = !yyyy || !mm 
        ? dayOptions
        : dayOptions
            .map(option => {
                const { value: dd } = option
                if (!dd) return option

                const date = `${yyyy}-${mm}-${dd}`
                return isValidDate(date) && {
                    ...option,
                    description: (
                        <small>
                            {daysTranslated[new Date(date).getDay()]}
                        </small>
                    )
                }
            })
            .filter(Boolean)

    return (
        <div {...{
            ...objWithoutKeys(props, ignoreAttributes),
            className: className({
                'ui button': true,
                negative: props.invalid || invalid,
                fluid: isMobile,
            }),
            title: 'YYYY-MM-DD',
        }}>
            <Dropdown {...{
                ...dropdownProps,
                disabled,
                icon: yyyy ? null : icon,
                lazyLoad: true,
                onChange: (e, d) => triggerChange(e, props, [d.value, mm, dd], setValue),
                options: yearOptions,
                placeholder: 'YYYY',
                search: true,
                style: { marginRight: yyyy ? 3 : -10 },
                value: yyyy || '',
            }} />
            {yyyy && ' - '}
            <Dropdown {...{
                ...dropdownProps,
                disabled,
                icon: mm ? null : icon,
                lazyLoad: true,
                onChange: (e, d) => triggerChange(e, props, [yyyy, d.value, dd], setValue),
                options: monthOptions,
                placeholder: 'MM',
                search: true,
                style: { marginRight: mm ? 3 : -10 },
                value: mm || '',
            }} />
            {mm && ' - '}
            <Dropdown {...{
                ...dropdownProps,
                disabled,
                icon: dd ? null : icon,
                lazyLoad: true,
                onChange: (e, d) => triggerChange(e, props, [yyyy, mm, d.value], setValue),
                options: dayOptions1,
                placeholder: 'DD',
                search: true,
                value: dd || '',
            }} />
            {clearable && yyyy && mm && dd && (
                <Icon {...{
                    className: 'no-margin',
                    name: 'x',
                    onClick: e => {
                        triggerChange(e, props, [`${currentYear}`, '', ''], setValue)
                        isFn(onReset) && onReset(e)
                    },
                    style: { cursor: 'pointer', paddingLeft: 5 },
                }} />
            )}
        </div>
    )
}
DateInput.propTypes = {
    clearable: PropTypes.bool,
    disabled: PropTypes.bool,
    dropdownProps: PropTypes.object,
    // lowest value
    max: PropTypes.string,
    // highest value
    min: PropTypes.string,
    ignoreAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
    rxValue: PropTypes.instanceOf(BehaviorSubject),
    // triggered on date reset.
    onReset: PropTypes.func,
    // date value string in the following format: YYYY-DD-MM
    value: PropTypes.string,
}
DateInput.defaultProps = {
    clearable: true,
    icon: { name: 'dropdown' },
    ignoreAttributes: [
        'clearable',
        'dropdownProps',
        'icon',
        'ignoreAttributes',
        'invalid',
        'onReset',
        'rxValue',
    ],
    style: {
        whiteSpace: 'nowrap',
    }
}
const triggerChange = (e, props, valueArr, setValue) => {
    const { onChange } = props
    const dateStr = valueArr.slice(0, 3).join('-')
    const invalid = dateStr.length < 10
        ? undefined
        : !isValidDate(dateStr)
    valueArr[3] = invalid
    setValue(valueArr)
    if (!isFn(onChange) || valueArr.filter(Boolean).length < 3) return

    onChange(e, {...props, value: dateStr, invalid})
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
    .reverse()

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
