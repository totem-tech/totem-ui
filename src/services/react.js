// placeholder for reusable React utility functions that doesn't doesn't specifically fit anywhere else
import { useState, useEffect } from "react"
import PromisE from "../utils/PromisE"
import { isAsyncFn, isFn, isObj } from "../utils/utils"

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

/**
 * @name    useRxSubject
 * @summary custom React hook for use with RxJS subjects
 * 
 * @param   {BehaviorSubject|Subject}   subject RxJS subject to subscribe to. 
 *                 If not object or doesn't have subcribe function will assume subject to be a static value.
 * @param   {Boolean}   ignoreFirst whether to ignore first change. 
 *                  Setting `true`, will prevent an additional state update after first load.
 * @param   {Function}  onBeforeSetValue (optional) value modifier. 
 *                  If an async function is supplied, `ignoreFirst` will be assumed `false`.
 * @param   {*} initialValue (optional) initial value where appropriate
 * 
 * @returns {Array} [value, setvalue]
 */
export const useRxSubject = (subject, ignoreFirst, onBeforeSetValue, initialValue) => {
    if (!isObj(subject) || !isFn(subject.subscribe)) return subject
    const isAnAsyncFn = isAsyncFn(onBeforeSetValue)
    const [setRxValue] = useState(() => newValue => subject.next(newValue))
    const [value, setValue] = useState(() => {
        if (initialValue || isAnAsyncFn) return initialValue
        let value = !isFn(onBeforeSetValue) ? subject.value : onBeforeSetValue(subject.value)
        if (value === useRxSubject.IGNORE_UPDATE) return initialValue
        return value
    })

    useEffect(() => {
        let mounted = true
        let ignoredFirst = !isAnAsyncFn && !!ignoreFirst ? false : true
        const subscribed = subject.subscribe(async (newValue) => {
            if (!mounted || !ignoredFirst) {
                ignoredFirst = true
                return
            }
            if (!isFn(onBeforeSetValue)) return setValue(newValue)

            newValue = await PromisE(onBeforeSetValue(newValue))
            if (!mounted || newValue === useRxSubject.IGNORE_UPDATE) return
            setValue(newValue)
        })
        return () => subscribed.unsubscribe()
    }, [])

    return [value, setRxValue]
}
// return this in onBeforeSetValue
useRxSubject.IGNORE_UPDATE = Symbol('ignore-rx-subject-update')