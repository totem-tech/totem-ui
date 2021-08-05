import { useEffect, useState } from 'react'
import { unsubscribe } from '../../services/react'
import { isFn } from '../../utils/utils'
import query from './query'

/**
 * @name    useLedgerAcPostings
 * @summary React hook to subscribe and retrieve full posting details
 * 
 * @param   {String}    address 
 * @param   {String}    ledgerAccount 
 * @param   {Function}  postingModifier (optional) function to modify each posting before updating state
 * 
 * @returns {Object[]}
 */
const useLedgerAcPostings = (address, ledgerAccount, postingModifier) => {
    const [data, setData] = useState(new Map())

    useEffect(() => {
        let mounted = true
        const subscriptions = {}
        let postingIds = []
        // handle posting details list result
        const handlePostingList = (postingList = []) => {
            if (!mounted) return
            postingList = postingList.map((arr, i) => {
                const posting = {
                    blockNrSubmitted: arr[0],
                    blockNrEffective: arr[4],
                    entryId: arr[3], //hash
                    id: postingIds[i],
                    isCredit: arr[2],
                    ledgerBalance: arr[1] && eval(arr[1]), // convert hex to number
                }
                return isFn(postingModifier)
                    ? postingModifier(posting)
                    : posting
            })
            setData(postingList)
        }
        // subscribe and retrieve details by posting IDs
        const handlePostingIds = (ids = []) => {
            if (!mounted) return
            postingIds = ids
            unsubscribe(subscriptions.postingDetails)
            if (!ids.length) return setData(new Map())
            subscriptions.postingDetails = query.postingDetail(
                ids.map(() => address),
                ids.map(() => ledgerAccount),
                ids,
                handlePostingList,
                true,
            )
        }

        if (address && ledgerAccount) {
            // subscribe and retrieve posting IDs by address and ledger account number
            subscriptions.postingIds = query.postingIds(
                address,
                ledgerAccount,
                handlePostingIds,
            )
        }

        return () => {
            mounted = false
            // on-unmount unsubscribe all subscriptions
            unsubscribe(subscriptions)
        }
    }, [address, ledgerAccount])

    return data
}

export default useLedgerAcPostings