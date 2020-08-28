// placeholder for reusable React utility functions that doesn't doesn't specifically fit anywhere else

import { isFn, isObj } from "../utils/utils"

// for use with useReducer hook on a functional component to imitate the behaviour of `setState()` of a class component
export const reducer = (state = {}, newValue = {}) => ({ ...state, ...newValue })

/**
 * @name    unsubscribe
 * @summary unsubscribe to multiple RxJS subscriptions
 * @param   {Object|Array} subscriptions 
 */
export const unsubscribe = (subscriptions = {}) => Object.values(subscriptions).forEach(x => {
    try {
        if (!x) return
        (isFn(x) ? x : x.unsubscribe)()
    } catch (e) { } // ignore
})