import { useEffect, useState } from 'react'
import { getConnection } from '../../../services/blockchain'
import { rxIsLoggedIn } from '../../../utils/chatClient'
import { subjectAsPromise, useQueryBlockchain } from '../../../utils/reactHelper'
import { deferred } from '../../../utils/utils'
import { query } from '../task'
import { addDetailsToTask, processOrder } from '../useTasks'

const useSearch = (filter = {}) => {
    const [queryArgs, setQueryArgs] = useState([])
    const [{ message, result }, setResult] = useState({})
    const { message: _msg } = useQueryBlockchain(...queryArgs)
    const [search] = useState(() =>
        deferred((filter, onResult, onError) => {
            // console.log(filter)
            query.searchMarketplace(filter)
                .then(onResult, onError)
        }, 500)
    )
    const { keywords } = filter

    useEffect(() => {
        let mounted = true
        if (keywords === useSearch.REFRESH_PLACEHOLDER) return setResult({})
        const handleResult = (detailsMap = new Map()) => {
            if (!mounted) return
            // setResult({ result: detailsMap })
            const taskIds = [...detailsMap.keys()]
            // finally, subscribe to on-chain data for result tasks
            if (!taskIds.length) setResult({ result: new Map() })
            setQueryArgs([
                getConnection(),
                'api.query.orders.orders',
                [taskIds],
                true,
                orders => {
                    orders.map((order, i) => {
                        const id = taskIds[i]
                        detailsMap.set(id, {
                            ...processOrder(order),
                            ...addDetailsToTask(detailsMap.get(id)),
                        })
                    })
                    mounted && setResult({ result: new Map(detailsMap) })
                },
                true,
                // true // print results for debugging
            ])
        }
        // second, search & fetch marketplace tasks from messaging service
        const handleLoggedIn = () => search(
            filter,
            handleResult,
            err => setResult({
                message: {
                    content: err,
                    icon: true,
                    status: 'error',
                }
            })
        )

        // first, make sure user is logged in
        const [loginPromise, unsubscribe] = subjectAsPromise(rxIsLoggedIn, true)
        loginPromise.then(handleLoggedIn)

        return () => {
            mounted = false
            unsubscribe()
        }
    }, [keywords])

    return [message || _msg, result]
}
useSearch.REFRESH_PLACEHOLDER = 'REFRESH_PLACEHOLDER'

export default useSearch