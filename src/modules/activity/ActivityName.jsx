import PropTypes from 'prop-types'
import { useMemo } from 'react'
import { translated } from '../../utils/languageHelper'
import { isFn } from '../../utils/utils'
import useActivities, { types } from './useActivities'

const textsCap = {
    loading: 'loading...',
}
translated(textsCap, true)

/**
 * @name    Activity
 * @summary React component to fetch & display Activity name.
 * 
 * @param   {String}    activityId
 * @param   {String}    ownerAddress  (optional)
 * @param   {Function}  render        (optional) if not a function, will display Activity name by default.
 *                                    Args: [activity Object, activityId String]
 * @param   {Boolean}   subscribe     (optional) if true, will auto-update.
 * @param   {String}    workerAddress (optional)
 */
const ActivityName = ({
    activityId,
    ownerAddress,
    render,
    subscribe = true,
    workerAddress
}) => {
    const conf = useMemo(() => ({
        activityIds: !workerAddress && !ownerAddress
            ? [activityId]
            : null,
        identity: ownerAddress || workerAddress,
        type: ownerAddress
            ? types.activities
            : workerAddress
                ? types.timekeeping
                : types.activityIds,
        valueModifier: (activities, _1, _2, unsubscribe) => {
            if (!activities.loaded) return textsCap.loading

            const activity = activities?.get(activityId)
            const { name = '' } = activity || {}
            !subscribe && unsubscribe?.()
            return isFn(render)
                ? render(activity, activityId)
                : name
        }
    }), [])
    return useActivities(conf)[0] || ''
}
ActivityName.defaultProps = {
    subscribe: false,
}
ActivityName.propTypes = {
    activityId: PropTypes.string.isRequired,
    ownerAddress: PropTypes.string,
    render: PropTypes.func,
    subscribe: PropTypes.bool,
    workerAddress: PropTypes.string,
}
export default ActivityName