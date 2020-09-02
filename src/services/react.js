// placeholder for reusable React utility functions that doesn't doesn't specifically fit anywhere else

import { useState, useEffect } from "react"
import { BehaviorSubject } from 'rxjs'
import { isFn, isObj, isBool } from "../utils/utils"

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
        const fn = isFn(x) ? x : isFn(x.unsubscribe) ? x.unsubscribe : null
        fn && fn()
    } catch (e) { } // ignore
})

export const useRxSubject = (subject, ignoreFirst, onChange) => {
    if (!isObj(subject)) return
    const [value, setValue] = useState(subject.value)

    useEffect(() => {
        let mounted = true
        let ignoredFirst = !!ignoreFirst ? false : true
        const subscribed = subject.subscribe(newValue => {
            if (!mounted || !ignoredFirst) return
            if (isFn(onChange)) newValue = onChange(newValue) || newValue
            setValue(newValue)
            ignoredFirst = true
        })
        return () => subscribed.unsubscribe()
    }, [])

    return [value, newValue => subject.next(newValue)]
}