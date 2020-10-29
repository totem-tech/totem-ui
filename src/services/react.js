// placeholder for reusable React utility functions that doesn't doesn't specifically fit anywhere else
import { useState, useEffect } from "react"
import { BehaviorSubject } from 'rxjs'
import PromisE from "../utils/PromisE"
<<<<<<< HEAD
import { isFn, isObj } from "../utils/utils"
=======
import { isAsyncFn, isFn, isObj, isSubjectLike } from "../utils/utils"
>>>>>>> 140-build-tasks-with-rewards

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
 * @param   {BehaviorSubject|Subject}   subject RxJS subject or subject like Object (with subscribe function)
 *              If not object or doesn't have subcribe function will assume subject to be a static value.
 * @param   {Boolean}   ignoreFirst whether to ignore first change. 
 *              Setting `true`, will prevent an additional state update after first load.
 * @param   {Function}  valueModifier (optional) value modifier. 
 *              If an async function is supplied, `ignoreFirst` will be assumed `false`.
 * @param   {*}         initialValue (optional) initial value where appropriate
 * @param   {Boolean}   allowSubjectUpdate whether to allow update of the subject or only state.
 *              CAUTION: if true and @subject is sourced from a DataStorage instance,
 *              it may override values in the LocalStorage values.
 *              Default: false
 * 
 * @returns {Array}     [value, setvalue]
 */
export const useRxSubject = (subject, valueModifier, initialValue, allowSubjectUpdate = false) => {
    if (!isSubjectLike(subject)) return subject
    const v = subject instanceof BehaviorSubject ? subject.value : initialValue
    let firstValue = !isFn(valueModifier) ? v : valueModifier(v)
    const [value, setValue] = useState(firstValue)
    const valueSetter = !allowSubjectUpdate ? setValue : () => newValue => subject.next(newValue)

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

    return [ value, valueSetter ]
}
// return this in onBeforeSetValue
useRxSubject.IGNORE_UPDATE = Symbol('ignore-rx-subject-update')