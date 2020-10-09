// placeholder for reusable React utility functions that doesn't doesn't specifically fit anywhere else
import { useState, useEffect } from "react"
import { BehaviorSubject } from 'rxjs'
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
 * @param   {Boolean}                   ignoreFirst whether to ignore first change. 
 *                  Setting `true`, will prevent an additional state update after first load.
 * @param   {Function}                  valueModifier (optional) value modifier. 
 *                  If an async function is supplied, `ignoreFirst` will be assumed `false`.
 * @param   {*}                         initialValue (optional) initial value where appropriate
 * 
 * @returns {Array}                     [value, setvalue]
 */
export const useRxSubject = (subject, valueModifier, initialValue) => {
    if (!isObj(subject) || !isFn(subject.subscribe)) return subject
    let firstValue = isAsyncFn(valueModifier) ? initialValue : (
        !isFn(valueModifier) ? subject.value : valueModifier(subject.value)
    )
    const [value, setValue] = useState(firstValue)

    useEffect(() => {
        let mounted = true
        let ignoreFirst = subject instanceof BehaviorSubject ? false : true
        const subscribed = subject.subscribe((newValue) => {
            if (!ignoreFirst) {
                ignoreFirst = true
                if (firstValue === newValue) return
            }
            if (!isFn(valueModifier)) return mounted && setValue(newValue)
            PromisE(valueModifier(newValue)).then(newValue => {
                if (!mounted || newValue === useRxSubject.IGNORE_UPDATE) return
                setValue(newValue)
            })
        })
        return () => {
            mounted = false
            subscribed.unsubscribe()
        }
    }, [])

    return [value, () => newValue => subject.next(newValue)]
}
// return this in onBeforeSetValue
useRxSubject.IGNORE_UPDATE = Symbol('ignore-rx-subject-update')