import React from 'react'
import Currency from '../../components/Currency'
import Message from '../../components/Message'
import DrillDownList from '../../components/DrillDownList'
import { isArr } from '../../utils/utils'
import { useSelected } from '../../services/identity'
import useLedgerAcBalances from './useLedgerAcBalances'

export default function FinancialStatementView() {
    const selectedAddress = useSelected()
    const [glAcBalances, message] = useLedgerAcBalances(selectedAddress)
    const nestedBalances = getNestedBalances(glAcBalances)

    glAcBalances && console.log({ nestedBalances })
    return (
        <div style={{ whiteSpace: 'pre' }}>
            {glAcBalances && (
                nestedBalances.map((level, i) => (
                    <DrillDownList {...{
                        items: [level],
                        key: i + level.balance,
                        style: { margin: '15px 0' }
                    }} />
                ))
            )}
            <Message {...message} className='empty-message' />
        </div>
    )
}

/**
 * @name    getNestedBalances
 * @summary generate multi-dimentional array using the result of `useLedgerAcBalances()` for use with DrillDownList
 * 
 * @param {Array} glAccounts 
 * 
 * @returns {Array}
 */
export const getNestedBalances = (glAccounts = []) => {
    if (!isArr(glAccounts)) return []
    const setLevelBalance = (parent, title, balance = 0, balanceType) => {
        let current = parent.find(x => x.title === title)
        if (!current) {
            current = {
                balance: balance,
                children: [],
                title,
            }
            parent.push(current)
        } else {
            current.balance += balance
        }
        current.subtitle = <Currency value={current.balance} />
        if (balanceType) current.balanceType = balanceType
        return current
    }

    return glAccounts.reduce((allItems, next) => {
        const { balanceType, typeName, categoryName, categoryGrpName, groupName, balance = 0 } = next
        const type = setLevelBalance(allItems, typeName, balance)
        const category = setLevelBalance(type.children, categoryName, balance)
        const categoryGrp = setLevelBalance(category.children, categoryGrpName, balance)
        const group = setLevelBalance(categoryGrp.children, groupName, balance, balanceType)
        return allItems
    }, [])
}