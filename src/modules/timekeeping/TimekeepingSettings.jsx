import React, { useState } from 'react'
import FormInput from '../../components/FormInput'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactHelper'
import { isArr } from '../../utils/utils'
import { rxTimeConversion, settings } from './timekeeping'

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

export const TimekeepingSettings = ({ asDropdown = true }) => {
    const options = [
        {
            label: textsCap.labelBlocks,
            value: 'blocks',
        },
        {
            label: textsCap.labelDuration,
            value: 'hh:mm:ss',
        },
        {
            label: textsCap.labelHours30,
            value: 'hours-30',
        },
        {
            label: textsCap.labelHours15,
            value: 'hours-15',
        },
        {
            label: textsCap.labelHours10,
            value: 'hours-10',
        },
        {
            label: textsCap.labelHours5,
            value: 'hours-5',
        },
    ]

    return (
        <FormInput {...{
            label: <b>{textsCap.title} </b>,
            multiple: false,
            name: 'timeConversion',
            options,
            rxValue: rxTimeConversion,
            type: 'checkbox-group',
            ...asDropdown  && {
                options: options.map(({ label, value }) => ({
                    text: label,
                    value,
                })),
                selection: true,
                type: 'dropdown',
            },
        }} />
    )
}