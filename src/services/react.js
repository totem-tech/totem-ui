// a set of reusable React and state related utility functions
import { useEffect, useReducer, useState } from "react"
import PropTypes from 'prop-types'
import { BehaviorSubject, Subject } from 'rxjs'
import PromisE from "../utils/PromisE"
import { hasValue, isDefined, isFn, isSubjectLike, isValidNumber } from "../utils/utils"

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
export const iUseReducer = (reducerFn, initialState = {}, onUnmount) => {
    const [[rxSetState, iniState]] = useState(() => {
        const rxSetState = isFn(initialState) && new Subject()
        initialState = !rxSetState
            ? initialState
            : initialState(rxSetState)

        return [rxSetState, initialState]
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
            isFn(onUnmount) && onUnmount()
            subscription && subscription.unsubscribe()
        }
    }, [setStateOrg, rxSetState])

    return [state, setState]
}

/**
 * @name    RecursiveShapeType
 * @summary custom PropType for recursive shape validation
 * 
 * @param   {Object}    propsTypes      property types of the shape (using PropTypes)
 * @param   {String}    recursiveKey    property that should be recursive. 
 *                                      Default: 'children'
 * 
 * @example
 * ```javascript
 * import PropTypes from 'prop-types'
 * 
 * const ExampleComponent = (props) => { console.log({props}) }
 * ExampleComponent.propTypes = {
 *    items: PropTypes.arrayOf(RecursiveShapeType({
 *        // define shape properties here
 *        value: PropTypes.number.isRequired,
 *        // 'items' property will be automatically added
 *    }, 'items'))
 * }
 * 
 * const childItems = [
 *    { value: 4 },
 *    { value: 5 },
 * ]
 * const items = [
 *   { value: 1 },
 *   { value: 2 },
 *   { value: 3, items: childItems },
 * ]
 * const el = <ExampleComponent items={items} />
 * ```
 */
export const RecursiveShapeType = (propsTypes = {}, recursiveKey = 'children') => {
    propsTypes[recursiveKey] = PropTypes.arrayOf(Type)
    function Type(...args) {
        return PropTypes.shape(propsTypes).apply(null, args)
    }
    return Type
}

/**
 * @name    subjectAsPromise
 * @summary sugar for RxJS subject as promise and, optionally, wait until an expected value is received
 * 
 * @param   {Subject}           subject         RxJS subject or similar subscribable
 * @param   {*|Function}        expectedValue   (optional) if undefined, will resolve on first value received
 * @param   {Number|Function}   timeout         (optional) will reject if no value received within given time
 * 
 * @returns {[Promise, Function]}   will reject with: 
 *                                  - `null` if times out
 *                                  - `undefined` if @subject is not a valid RxJS subject like subscribable
 */
export const subjectAsPromise = (subject, expectedValue, timeout) => {
    if (!isSubjectLike(subject)) return

    let subscription, timeoutId
    const unsubscribe = () => setTimeout(() => {
        subscription.unsubscribe()
        clearTimeout(timeoutId)
    }, 50)
    const promise = new PromisE((resolve, reject) => {
        subscription = subject.subscribe(value => {
            const isExpectedValue = isFn(expectedValue)
                ? expectedValue(value) === value
                : isDefined(expectedValue)
                    ? value === expectedValue
                    : true
            if (!isExpectedValue) return
            unsubscribe()
            resolve(value)
        })
        timeoutId = isValidNumber(timeout) && setTimeout(() => {
            unsubscribe()
            reject(null)
        }, timeout)

    })
    return [promise, unsubscribe]
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
 * @name        usePromise
 * @summary     a custom React hook for use with a Promise
 * @description state update will occur only once when then @promise is either rejected or resolved.
 *              
 * 
 * @param   {Promise|Function}  promise
 * @param   {Function}          resultModifier 
 * @param   {Function}          errorModifier 
 * 
 * @returns {Array} [
 *                      0. @result : anyting the promise resolves with
 *                      1. @error  : anything the promise rejects with
 *                  ]
 * 
 * @example
 * ```javascript
 * const [result, error] = usePromise(Promise.resolve(1))
 * ```
 */
export const usePromise = (promise, resultModifier, errorModifier) => {
    const [state, setState] = useState({})

    useState(() => {
        let mounted = true
        const handler = (key, modifier, setState) => value => {
            if (!mounted) return console.log({ mounted })
            const newState = {}
            newState[key] = isFn(modifier)
                ? modifier(value)
                : value
            setState(newState)
        }
        new PromisE(promise)
            .then(handler('result', resultModifier, setState))
            .catch(handler('error', errorModifier, setState))
        return () => mounted = false
    }, [setState, promise])

    return [state.result, state.error]
}

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

    const [{ firstValue, value }, setState] = iUseReducer(reducer, () => {
        let value = subject instanceof BehaviorSubject
            ? subject.value
            : initialValue
        value = !isFn(valueModifier)
            ? value
            : valueModifier(value)
        return { firstValue: value, value }
    })

    useEffect(() => {
        let ignoreFirst = !(subject instanceof BehaviorSubject)
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

    const setValue = newValue => !allowSubjectUpdate
        ? setState({ value: newValue })
        : subject.next(newValue)
    return [value, setValue]
}
// To prevent an update return this in valueModifier
useRxSubject.IGNORE_UPDATE = Symbol('ignore-rx-subject-update')

/**
 * @name    unsubscribe
 * @summary unsubscribe to multiple RxJS subscriptions
 * @param   {Object|Array} subscriptions 
 */
export const unsubscribe = (subscriptions = {}) => Object.values(subscriptions)
    .forEach(x => {
        try {
            if (!x) return
            const fn = isFn(x)
                ? x
                : isFn(x.unsubscribe)
                    ? x.unsubscribe
                    : null
            fn && fn()
        } catch (e) { } // ignore
    })