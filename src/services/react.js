// placeholder for reusable React utility functions that doesn't doesn't specifically fit anywhere else
import { useEffect, useReducer, useState } from "react"
import { BehaviorSubject,  Subject } from 'rxjs'
import PromisE from "../utils/PromisE"
import { isFn, isSubjectLike } from "../utils/utils"

/**
 * @name    iUseReducer
 * @summary A sugar for React `userReducer` with added benefit of tracking of component mounted status.
 *          Prevents state update if component is not mounted.
 * 
 * @param   {Function}          reducerFn       if falsy, will use `reducer` function
 * @param   {Object|Function}   initialState    if function, a RxJS Subject will be supplied as argument 
 *                                              as an alternative to setState
 * 
 * @returns {Array}     [@state {Object}, @setState {Function}]
 */
export const iUseReducer = (reducerFn, initialState = {}) => {
    const [[rxSetState, iniState]] = useState(() => {
        const rxSetState = isFn(initialState) && new Subject()
        initialState = !rxSetState
            ? initialState
            : initialState(rxSetState)
        
        return [ rxSetState, initialState ]
    })
    const [state, setStateOrg] = useReducer(
        isFn(reducerFn) ? reducerFn : reducer,
        iniState,
    )
    // ignores state update if component is unmounted
    const [setState] = useState(() =>
        (...args) => setStateOrg.mounted && setStateOrg(...args)
    )

    useEffect(() => {
        setStateOrg.mounted = true
        const subscription = rxSetState && rxSetState.subscribe(newState =>
            setStateOrg.mounted && setStateOrg(newState)
        )

        return () => {
            setStateOrg.mounted = false
            subscription && subscription.unsubscribe()
        }
    }, [setStateOrg, rxSetState])

    return [state, setState]
}

/**
 * @name    reducer
 * @summary simple reducer to mimic Class component setState behavior
 * 
 * @param   {Object}    state 
 * @param   {Object}    newValue 
 * 
 * @returns {Object}
 */
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
    const [{ value }, setState] = iUseReducer(reducer, { value : firstValue})
    const setValue = newValue => !allowSubjectUpdate
            ? setState({ value: newValue })
            : subject.next(newValue)

    useEffect(() => {
        let ignoreFirst = subject instanceof BehaviorSubject ? false : true
        const subscribed = subject.subscribe((newValue) => {
            if (!ignoreFirst) {
                ignoreFirst = true
                if (firstValue === newValue) return
            }
            if (!isFn(valueModifier)) return setState({ value: newValue })

            PromisE(valueModifier(newValue)).then(newValue => {
                if (newValue === useRxSubject.IGNORE_UPDATE) return
                setState({ value: newValue })
            })
        })
        return () => subscribed.unsubscribe()
    }, [])

    return [ value, setValue ]
}
// To prevent an update return this in valueModifier
useRxSubject.IGNORE_UPDATE = Symbol('ignore-rx-subject-update')
/*
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
}*/