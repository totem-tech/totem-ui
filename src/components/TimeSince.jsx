import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { format } from '../utils/time'
import { translated } from '../services/language'
import { arrReverse, isValidNumber, objWithoutKeys, strFill } from '../utils/utils'
import { Statistic } from 'semantic-ui-react'
import { useInverted } from '../services/window'

const texts = translated({
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
})[0]

const TimeSince = props => {
    const {
        asDuration,
        date,
        durationConfig,
        El,
        ignoreAttributes,
        updateFrequency
    } = props
    const [formatted, setFormatted] = useState('')
    const inverted = asDuration && useInverted()

    useEffect(() => {
        let mounted = true
        let timeoutId
        const update = () => {
            if (!mounted) return
            
            const [formatted, frequencyMS] = asDuration
                ? _formatDuration(
                    date,
                    {
                        ...durationConfig,
                        statisticProps: {
                            inverted,
                            ...(durationConfig || {}).statisticProps,
                        },
                    }
                )
                : _format(date)
            const autoUpdate = updateFrequency !== null && frequencyMS !== null
            const delay = updateFrequency || frequencyMS
            setFormatted(formatted)
            if (!autoUpdate || !delay) return

            timeoutId = setTimeout(update, delay)
        }
        update()
        return () => {
            mounted = false
            clearTimeout(timeoutId)
        }
    }, [inverted])

    return !date
        ? ''
        : <El {...{
            ...objWithoutKeys(props, ignoreAttributes),
            children: formatted,
            title: props.title || `${date}`,
        }} />
}
TimeSince.propTypes = {
    asDuration: PropTypes.bool,
    date: PropTypes.oneOfType([
        PropTypes.instanceOf(Date),
        PropTypes.string,
    ]).isRequired,
    durationConfig: PropTypes.shape({
        fill: PropTypes.bool,
        statisticProps: PropTypes.object,
        titleBelow: PropTypes.bool,
        withHours: PropTypes.bool,
        withMinutes: PropTypes.bool,
        withSeconds: PropTypes.bool,
    }),
    El: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.func,
        PropTypes.elementType,
    ]).isRequired,
    ignoreAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
    // use null to prevent auto update
    updateFrequency: PropTypes.number,
}
TimeSince.defaultProps = {
    asDuration: false,
    El: 'div',
    ignoreAttributes: [
        'asDuration',
        'durationConfig',
        'date',
        'El',
        'ignoreAttributes',
        'updateFrequency',
    ],
}
export default React.memo(TimeSince)

/**
 * @name    _format
 * @summary format time as count up
 * 
 * @param   {String|Date} date  Date or Unix timestamp
 * 
 * @returns {Array} [
 *                      0: formatted string,
 *                      1: update frequency: milliseconds representing 1 unit of the formatted string
 *                          Eg: if formatted string is in seconds update frequency will be 1 second.
 *                  ]
 */  
const _format = date => {
    date = new Date(date)
    let diffMS = new Date() - date
    const isPast = diffMS >= 0
    diffMS = Math.abs(diffMS)
    const seconds = diffMS / secondMS
    // update every second
    if (seconds < 60) return [_fmtSince(seconds, 'second', isPast), secondMS]
    
    const minutes = seconds / 60
    // update every minute
    if (minutes < 60) return [_fmtSince(minutes, 'minute', isPast), minuteMS]
    
    const hours = minutes / 60
    // update every hour
    if (hours < 24) return [_fmtSince(hours, 'hour', isPast), hourMS]

    const days = hours / 24
    // no need to auto update after 24 hours!!!
    if (days < 30) return [_fmtSince(days, 'day', isPast), null] //dayMS
    
    const months = days / 30
    if (months < 12) return [_fmtSince(months, 'month', isPast), null] // monthMS
    
    const years = months / 12
    return [_fmtSince(years, 'year', isPast), null] //yearMS
}
const _fmtSince = (value, unit, isPast) => {
    return `${parseInt(value)} ${_fmtUnit(unit, value)} ${isPast ? texts.ago : ''}`
}
const _fmtUnit = (unit, value) => texts[`${unit}${value > 1 ? 's' : ''}`]

// units in milliseconds
const secondMS = 1000
const minuteMS = secondMS * 60
const hourMS = minuteMS * 60
const dayMS = hourMS * 24
const monthMS = dayMS * 30
const yearMS = dayMS * 365
const _calcDurationUnits = (date, withHours, withMinutes, withSeconds) => {
    const diffMS = new Date() - new Date(date)
    let x = 0
    const years = parseInt(diffMS / yearMS)
    x = years * yearMS
    const months = parseInt((diffMS - x) / monthMS)
    x = x + months * monthMS
    const days = parseInt((diffMS - x) / dayMS)
    x = x + days * dayMS
    const hours = withHours
        ? parseInt((diffMS - x) / hourMS)
        : null
    x = x + hours * hourMS
    const minutes = withMinutes
        ? parseInt((diffMS - x) / minuteMS)
        : null
    x = x + minutes * minuteMS
    const seconds = withSeconds
        ? parseInt((diffMS - x) / secondMS)
        : null
    // units and respective values
    let gotValue = false
    const values = [
        ['year', years],
        ['month', months],
        ['day', days],
        ['hour', hours],
        ['minute', minutes],
        ['second', seconds],
    ]
        .map(([unit, value]) => {
            if (value !== null) {
                value = Math.abs(value)
            }
            gotValue = gotValue || !!value
            unit = _fmtUnit(unit, value)
            return [
                unit,
                !gotValue ? null : value
            ]
        })
        .filter(([_, value]) => isValidNumber(value))
    return [
        values,
        !withMinutes
            ? hourMS // update every hour
            : !withSeconds
                ? minuteMS // update every minute
                : secondMS // update every second
    ]
}
const _formatDuration = (date, config = {}) => {
    const { 
        fill = true,
        statisticProps = {},
        titleBelow = true,
        withHours = true,
        withMinutes = true,
        withSeconds = true,
    } = config
    let [values, frequencyMS] = _calcDurationUnits(date, withHours, withMinutes, withSeconds)

    return [
        values.map(([label, value]) => (
            <Statistic {...statisticProps} key={label}>
                {arrReverse([
                    <Statistic.Label content={label} key='label' />,
                    <Statistic.Value {...{
                        content: !fill
                            ? value
                            : strFill(value, 2, '0'),
                        key: 'value',
                    }} />,
                ], titleBelow)}
            </Statistic>
        )),
        frequencyMS,
    ]
 }

