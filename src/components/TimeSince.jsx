import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { format } from '../utils/time'
import { translated } from '../services/language'

const [texts] = translated({
    ago: 'ago',
    second: 'second',
    seconds: 'seconds',
    minute: 'minute',
    minutes: 'minutes',
    hour: 'hour',
    hours: 'hours',
    day: 'day',
    days: 'days',
    month: 'month',
    months: 'months',
    year: 'year',
    years: 'years',
})

const TimeSince = props => {
    const { autoUpdate = true, time } = props
    let [txt, delayMS] = formatSince(time)
    const [formatted, setFormatted] = useState(txt)

    autoUpdate && useEffect(() => {
        let mounted = true
        const update = delay => setTimeout(() => {
            if (!mounted) return
            const res = formatSince(time)
            setFormatted(res[0])
            update(res[1])
        }, delay)
        update(delayMS)
        return () => mounted = false
    }, [])

    return !time ? '' : <div {...props} title={props.title || format(time)}>{formatted}</div >
}
TimeSince.propTypes = {
    autoUpdate: PropTypes.bool,
    time: PropTypes.string,
}
export default TimeSince

// formatSince timestamp into the following format: XX UNIT ago
//
// Params:
// @time    string: timestamp (YYYY:MM:ddThh:mm:ssZ...)
//
// Returns array:   [
//                      0: formatted string,
//                      1: update frequency: milliseconds representing 1 unit of the formatted string
//                          Eg: if formatted string is in seconds update frequency will be 1 second.
//                  ]
export const formatSince = time => {
    const fmt = (num, unit) => {
        const unitTxt = texts[`${unit}${num < 2 ? '' : 's'}`]
        return `${parseInt(num)} ${unitTxt} ${texts.ago}`
    }
    const diffMS = new Date() - new Date(time)
    const seconds = diffMS / 1000
    if (seconds < 60) return [fmt(seconds, 'second'), 1000]
    const minutes = seconds / 60
    if (minutes < 60) return [fmt(minutes, 'minute'), 1000 * 60]
    const hours = minutes / 60
    if (hours < 24) return [fmt(hours, 'hour'), 1000 * 60 * 60]
    const days = hours / 24
    if (days < 30) return [fmt(days, 'day'), 1000 * 60 * 60 * 24]
    const months = days / 30
    if (months < 12) return [fmt(months, 'month'), 1000 * 60 * 60 * 24]
    const years = months / 12
    return [fmt(years, 'year'), 1000 * 60 * 60 * 24 * 12]
}