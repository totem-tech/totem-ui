import React from 'react'
import FormBuilder from '../../components/FormBuilder'
import { translated } from '../../utils/languageHelper'
import { objWithoutKeys } from '../../utils/utils'
import { rxDurtionPreference, durationPreferences } from './timekeeping'

let textsCap = {
    title: 'time conversion setting',
    labelBlocks: 'blocks (no conversion)',
    labelDuration: 'hours, minutes & seconds',
    labelHours10: 'hours, nearest 10 minutes',
    labelHours15: 'hours, nearest 15 minutes',
    labelHours30: 'hours, nearest 30 minutes',
    labelHours5: 'hours, nearest 5 minutes',
}
textsCap = translated(textsCap, true)[1]

const TimekeepingSettings = props => {
    const { asDropdown = true } = props
    const options = [
        {
            label: textsCap.labelBlocks,
            value: durationPreferences.blocks,
        },
        {
            label: textsCap.labelDuration,
            value: durationPreferences.hhmmss,
        },
        {
            label: textsCap.labelHours5,
            value: durationPreferences.hhmm05,
        },
        {
            label: textsCap.labelHours10,
            value: durationPreferences.hhmm10,
        },
        {
            label: textsCap.labelHours15,
            value: durationPreferences.hhmm15,
        },
        {
            label: textsCap.labelHours30,
            value: durationPreferences.hhmm30,
        },
    ]

    return (
        <FormBuilder {...{
            ...objWithoutKeys(props, ['asDropdown']),
            closeText: null,
            closeOnEscape: true,
            inputs: [{
                label: <b>{textsCap.title} </b>,
                multiple: false,
                name: 'timeConversion',
                options,
                rxValue: rxDurtionPreference,
                type: 'checkbox-group',
                ...asDropdown  && {
                    options: options.map(({ label, value }) => ({
                        text: label,
                        value,
                    })),
                    selection: true,
                    type: 'dropdown',
                    },
            }],
            submitText: null,
        }} />
    )
}
export default React.memo(TimekeepingSettings)