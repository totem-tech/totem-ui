import PropTypes from 'prop-types'
import React from 'react'
import { translated } from '../../utils/languageHelper'
import { UseHook } from '../../utils/reactjs'
import { isFn } from '../../utils/utils'
import useActivities, { types } from './useActivities'

const textsCap = {
    loading: 'loading...',
}
translated(textsCap, true)

/**
 * @name    Activity
 * @summary React component to fetch & display Activiy information.
 * 
 * @param   {String}    activityId
 * @param   {Function}  render      (optional) if not a function, will display Activity name by default.
 *                                  Args: [activity Object, activityId String]
 * @param   {Boolean}   subscribe   (optional) if true, will subsribe to changes of the activity.
 */
const ActivityName = ({
    activityId,
    render,
    subscribe
}) => (
    <UseHook {...{
        args: [{
            activityIds: [activityId],
            type: types.activityIds,
        }],
        hook: useActivities,
        render: ([activities, _, unsubscribe]) => {
            if (!activities.loaded) return textsCap.loading

            const activity = activities?.get(activityId)
            const { name = '' } = activity || {}
            !subscribe && unsubscribe?.()
            return isFn(render)
                ? render(activity, activityId)
                : name
        }
    }} />
)
ActivityName.defaultProps = {
    subscribe: false,
}
ActivityName.propTypes = {
    activityId: PropTypes.string.isRequired,
    render: PropTypes.func,
    subscribe: PropTypes.bool,
}
export default ActivityName