import { isDefined } from '../../utils/utils'
import { query as queryHelper } from '../../services/blockchain'
import client from '../chat/ChatClient'
import { useEffect, useState } from 'react'

const query = {
    /**
     * @name    accountsById
     * @summary retrieve a list of accounts by identity
     * 
     * @param {String|Array}    address user identity
     * @param {Function|null}   callback (optional) callback function to subscribe to changes.
     *                              If supplied, once result is retrieved function will be invoked with result.
     *                              Default: null
     * @param {Boolean}         multi (optional) indicates whether it is a multi query. Default: false.
     * 
     * @returns {*|Function}    if a @callback is a function, will return a function to unsubscribe. Otherwise, result.
     */
    accountsById: async (address, callback = null, multi = false) => await queryHelper(
        'api.query.accounting.accountsById',
        [address, callback]
            .filter(isDefined),
        multi,
    ),

    /**
     * @name    balanceByLedger
     * @summary retrieve ledger account balance
     * 
     * @param {String|Array}    address user identity
     * @param {Number|Array}    ledgerAccount ledger account number
     * @param {Function|Null}   callback (optional) callback function to subscribe to changes.
     *                              If supplied, once result is retrieved function will be invoked with result.
     *                              Default: null
     * @param {Boolean}         multi (optional) indicates whether it is a multi query. Default: false.
     * 
     * @returns {*|Function}    if a @callback is a function, will return a function to unsubscribe. Otherwise, result.
     */
    balanceByLedger: async (address, ledgerAccount, callback = null, multi = false) => await queryHelper(
        'api.query.accounting.balanceByLedger',
        [address, ledgerAccount, callback].filter(isDefined),
        multi,
    ),

    /**
     * @name    glAccounts
     * @summary get global ledger account details by numbers
     * 
     * @param   {Array} accountNumbers 
     * 
     * @returns {Object[]}
     */
    glAccounts: async (accountNumbers) => await client.glAccounts.promise(accountNumbers.map(a => `${a}`)),

    /**
     * @name    postingIds
     * @summary retrieve posting details
     *
     * @param   {String|Array}  address       user identity/wallet address
     * @param   {Number|Array}  ledgerAccount ledger account number
     * @param   {Number|Array}  postingId     posting ID
     * @param   {Function|Null} callback      (optional) callback function to subscribe to changes. If supplied,
     *                                        once result is retrieved function will be invoked with the result.
     *                                        Default: `null`
     * @param   {Boolean}       multi         (optional) indicates whether it is a multi query.
     *                                        Default: `false`
     *
     * @returns {*|Function}                  result|unsubscribe function
     */
    postingDetail: async (address, ledgerAccount, postingId, callback = null, multi = false) => {
        const tupleArg = !multi
            ? [
                address,
                ledgerAccount,
                postingId,
            ]
            : postingId.map((id, i) => [
                address[i],
                ledgerAccount[i],
                id,
            ])
        await queryHelper(
            'api.query.accounting.postingDetail',
            [tupleArg, callback].filter(isDefined),
            multi,
        )
    },

    /**
     * @name    postingIds
     * @summary retrieve a list of posting IDs by address and ledger account number
     *
     * @param   {String|Array}  address       user identity/wallet address
     * @param   {Number|Array}  ledgerAccount ledger account number
     * @param   {Function|Null} callback      (optional) callback function to subscribe to changes. If supplied, 
     *                                        once result is retrieved function will be invoked with the result.
     *                                        Default: `null`
     * @param   {Boolean}       multi         (optional) indicates whether it is a multi query.
     *                                        Default: `false`
     * 
     * @returns {*|Function}                  result|unsubscribe function
     */
    postingIds: async (address, ledgerAccount, callback = null, multi = false) => {
        const tupleArg = !multi
            ? [address, ledgerAccount]
            : address.map((addr, i) => [addr, ledgerAccount[i]])
        await queryHelper(
            'api.query.accounting.idAccountPostingIdList',
            [tupleArg, callback].filter(isDefined),
            multi,
        )
    },
}
export default query