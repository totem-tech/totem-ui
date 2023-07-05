import { useMemo } from 'react'
import { BehaviorSubject } from 'rxjs'
import { useRxSubject, useUnmount } from '../../utils/reactjs'
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
 * @param   {String} identity
 *  
 * @returns {Array} [BehaviorSubject, Function]
 */
export const subscribe = (identity, includeOwn = true) => {
    // subscribe and fetch activities that user is a team member of (has been invited to and aceepted)
    const [rxTkActivities, unsubTk] = _subscribe(identity, types.timekeeping)
    if (!includeOwn) return [rxTkActivities, unsubTk]

    // subscribe and fetch activities user owns
    const [rxOwnActivities, unsub] = _subscribe(identity)
    const subject = copyRxSubject(
        [rxOwnActivities, rxTkActivities],
        new BehaviorSubject(new Map()),
        // merge values
        ([
            ownActivities = new Map(),
            tkActivities = new Map()
        ]) => mapJoin(ownActivities, tkActivities),
    )

    const unsubscribe = () => {
        unsubTk()
        unsub()
    }
    return [subject, unsubscribe]
}

export default function useTkActivities({
    includeOwned = true,
    identity,
    subjectOnly = false,
    valueModifier,
} = {}) {
    identity ??= useRxSubject(rxSelected)[0]
    const [subject, unsubscribe] = useMemo(
        () => subscribe(identity, includeOwned) || [],
        [identity]
    )
    // trigger unsubscribe onUnmount
    useUnmount(unsubscribe)
    if (subjectOnly) return subject

    const [activities] = useRxSubject(subject, valueModifier)

    return [activities, subject, unsubscribe, identity]
}