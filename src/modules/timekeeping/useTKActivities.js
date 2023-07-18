import { useMemo } from 'react'
import { BehaviorSubject, SubjectLike } from 'rxjs'
import {
    useRxSubject,
    useRxSubjectOrValue,
    useUnsubscribe
} from '../../utils/reactjs'
import { copyRxSubject } from '../../utils/rx'
import { mapJoin } from '../../utils/utils'
import {
    rxForceUpdate as _rxForceUpdate,
    subscribe as _subscribe,
    types
} from '../activity/useActivities'
import { rxSelected } from '../identity/identity'

export const rxForceUpdate = _rxForceUpdate

/**
 * @name    subscribe
 * @summary subscribe to and fetch timekeeping related activities
 * 
 * @param   {Sting|Array}   identity      (optional) identity or activityIds (if type is `types.activity`).
 *                                        Default: selected identity from the identities module
 * @param   {Boolean}       includeOwned  (optional) if falsy, will only fetch activites where user is part of the team.
 *                                        Default: `true`
 * @param   {Boolean}       save          (optional)
 *  
 * @returns {Array} [BehaviorSubject, Function]
 */
export const subscribe = (
    identity,
    includeOwned = true,
    save
) => {
    // subscribe and fetch activities that user is a team member of (has been invited to and aceepted)
    const [rxTkActivities, unsubTk] = _subscribe(
        identity,
        types.timekeeping,
        save,
    )
    if (!includeOwned) return [rxTkActivities, unsubTk]

    // subscribe and fetch activities user owns
    const [rxOwnActivities, unsub] = _subscribe(
        identity,
        types.activities,
        save,
    )
    const subject = copyRxSubject(
        [rxOwnActivities, rxTkActivities],
        new BehaviorSubject(new Map()),
        // merge values
        ([
            ownActivities = new Map(),
            tkActivities = new Map()
        ]) => {
            const merged = mapJoin(ownActivities, tkActivities)
            merged.loaded = !!ownActivities.loaded && !!tkActivities.loaded
            return merged
        },
        300,
    )

    const unsubscribe = () => {
        unsubTk()
        unsub()
        subject.unsubscribe()
    }
    return [subject, unsubscribe]
}

/**
 * @name    useTkActivities
 * @summary React hook to subscribe and fetch timekeeping related activites
 * 
 * @param   {Object}    p
 * @param   {Boolean}   p.includeOwned  (optional) if falsy, will only fetch activities where user is a team member.
 *                                      Default: `true`
 * @param   {String|SubjectLike}    p.identity      (optional) user identity.
 *                                      Default: selected identity from identities module
 * @param   {Boolean}   p.subjectOnly   (optional) if true, will only return RxJS the subject.
 * @param   {Function}  p.valueModifier (optional) callback to modify activities result.
 *                                      Arguments: [newValue, oldValue, rxActivities]
 *  
 * @returns {[Map, BehaviorSubject, Function, String]|BehaviorSubject} If subjectOnly is truthy: rxActivities. 
 *                                      Otherwise, [activities, rxActivities, unsubscribe, identity]
 */
export default function useTkActivities({
    includeOwned = true,
    identity = rxSelected,
    subjectOnly = false,
    valueModifier,
} = {}) {
    const rxActivities = useMemo(() => new BehaviorSubject(new Map()), [])
    const [
        _identity,
        unsubscribe,
        subscription
    ] = useRxSubjectOrValue(identity, identity => {
        const [currentSubject, unsubscribe] = subscribe(identity, includeOwned) || []
        // current subject will change based on identity selected.
        // copy values from current subject to rxActivities.
        const subscription = currentSubject?.subscribe(value =>
            rxActivities.next(value)
        )
        return [
            identity,
            unsubscribe,
            subscription
        ]
    })

    // trigger unsubscribe onUnmount
    useUnsubscribe([unsubscribe, subscription])
    if (subjectOnly) return rxActivities

    const [activities] = useRxSubject(rxActivities, valueModifier)

    return [
        activities,
        rxActivities,
        unsubscribe,
        _identity
    ]
}