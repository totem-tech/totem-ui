import { useEffect, useState } from 'react'
import { BehaviorSubject } from 'rxjs'
import { getConnection } from '../../../services/blockchain'
import chatClient, { rxIsLoggedIn, rxIsRegistered } from '../../../utils/chatClient'
import { translated } from '../../../utils/languageHelper'
import {
    statuses,
    subjectAsPromise,
    unsubscribe,
    useQueryBlockchain,
    useRxSubject,
} from '../../../utils/reactjs'
import { deferred } from '../../../utils/utils'
import { query } from '../task'
import { addDetailsToTask, processOrder } from '../useTasks'

let textsCap = {
    loading: 'loading...'
}
textsCap = translated(textsCap, true)[1]
const rxTaskMarketCreated = new BehaviorSubject()

const useSearch = (filter = {}) => {
    const [newId] = useRxSubject(rxTaskMarketCreated)
    const [queryArgs, setQueryArgs] = useState({})
    const [{ message, result }, setResult] = useState({
        message: {
            content: textsCap.loading,
            icon: true,
            status: statuses.LOADING,
        }
    })
    const { message: _msg } = useQueryBlockchain(...queryArgs)
    const [search] = useState(() =>
        deferred((filter, onResult, onError) => {
            query.searchMarketplace(filter)
                .then(onResult, onError)
        }, 500)
    )
    let { keywords = '' } = filter
    keywords = keywords.trim()

    useEffect(() => {
        let mounted = true
        const subs = {}
        if (keywords === useSearch.REFRESH_PLACEHOLDER) return setResult({})

        const handleResult = (detailsMap = new Map()) => {
            if (!mounted) return

            const taskIds = [...detailsMap.keys()]
            if (!taskIds.length) return setResult({
                result: new Map(),
            })

            // finally, subscribe to on-chain data for result tasks
            const valueModifier = (orders, ordersOrg) => {
                orders.map((order, i) => {
                    const id = taskIds[i]
                    detailsMap.set(id, {
                        ...processOrder(
                            order,
                            id,
                            ordersOrg[i],
                        ),
                        ...addDetailsToTask(detailsMap.get(id)),
                    })
                })
                mounted && setResult({
                    result: new Map(detailsMap),
                })
            }
            setQueryArgs({
                connection: getConnection(),
                func: 'api.query.orders.orders',
                args: [taskIds],
                multi: true,
                valueModifier,
                subscribe: true,
            })
        }

        // second, search & fetch marketplace tasks from messaging service
        const doSearch = () => search(
            filter,
            handleResult,
            err => mounted && setResult({
                message: {
                    content: err,
                    icon: true,
                    status: 'error',
                }
            })
        )

        if (rxIsRegistered.value) {
            // wait until user is logged in
            const [loginPromise, unsub] = subjectAsPromise(rxIsLoggedIn, true)
            subs.login = unsub
            loginPromise.then(doSearch)
        } else {
            doSearch()
        }

        return () => {
            mounted = false
            unsubscribe(subs)
        }
    }, [keywords, newId])

    return [message || _msg, result]
}
useSearch.REFRESH_PLACEHOLDER = 'REFRESH_PLACEHOLDER'


setTimeout(async () => {
    // wait until user is logged in
    await subjectAsPromise(rxIsLoggedIn, true)[0]
    chatClient.onTaskMarketCreated(taskId =>
        rxTaskMarketCreated.next(taskId)
    )
})

export default useSearch