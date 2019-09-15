export const prepend0 = n => (n < 10 ? '0' : '') + n
export const BLOCK_DURATION_SECONDS = 5
export const BLOCK_DURATION_REGEX = /^(\d{2}):[0-5][0-9]:[0-5](0|5)$/ // valid duration up to 99:59:55

export const secondsToDuration = numSeconds => {
    numSeconds = parseInt(numSeconds || 0)
    const seconds = numSeconds % 60
    const totalMinutes = parseInt(numSeconds / 60)
    const hours = parseInt(totalMinutes / 60)
    return prepend0(hours) + ':' + prepend0(totalMinutes % 60) + ':' + prepend0(seconds)
}

export const durationToSeconds = duration => {
    const [hours, minutes, seconds] = duration.split(':')
    return parseInt(seconds) + parseInt(minutes) * 60 + parseInt(hours) * 60 * 60
}

export const RATE_PERIODS = [
    'block',
    'hour',
    'day'
]
export const RATE_PERIOD_SECONDS = [
    BLOCK_DURATION_SECONDS,
    3600,
    86400
]

export const calcAmount = (blockCount, rateAmount, ratePeriod) => {
    const seconds = blockCount * BLOCK_DURATION_SECONDS
    const cycles = seconds / RATE_PERIOD_SECONDS[RATE_PERIODS.indexOf((ratePeriod || 'block').toLowerCase())]
    return rateAmount * cycles
}