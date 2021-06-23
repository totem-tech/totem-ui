import React, { useState } from 'react'
import { Button, Popup } from 'semantic-ui-react'
// utils
import { isArr, objClean } from '../../utils/utils'
// components
import DrillDownList from '../../components/DrillDownList'
import Message from '../../components/Message'
// services
import storage from '../../services/storage'
import { translated } from '../../services/language'
// components
import Currency from '../currency/Currency'
import useLedgerAcBalances from './useLedgerAcBalances'
import Invertible from '../../components/Invertible'

const MODULE_KEY = 'financialStatement'
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
const textsCap = translated({
    collapseAll: 'collapse all',
    expandAll: 'expand all',
}, true)[1]

export default function FinancialStatementView(props) {
    const [nestedBalances = [], message] = useLedgerAcBalances(null, getNestedBalances)
    const [expandedTitles, setExpandedTitles] = useState(() => rw().expandedTitles || {})
    const shouldExpand = Object.keys(expandedTitles)
        .filter(key => !!expandedTitles[key].active)
        .length === 0
    
    return (
        <div {...{ ...props, style: { whiteSpace: 'pre', ...props.style } }}>
            {nestedBalances.length > 0 && (
                <Button {...{
                    content: !shouldExpand
                        ? textsCap.collapseAll
                        : textsCap.expandAll,
                    icon: `caret square outline ${shouldExpand ? 'down' : 'right'}`,
                    onClick: () => {
                        const getTitles = (balances = []) => balances
                            .reduce((titles, { children = [], title }) => {
                                titles[title] = {
                                    active: shouldExpand,
                                    children: children.length === 0
                                        ? undefined
                                        : getTitles(children)
                                }
                                return titles
                            }, {})
                        const titles = getTitles(nestedBalances)
                        setExpandedTitles(titles)
                        rw({ expandedTitles: titles })
                    },
                    style: { textTransform: 'capitalize' },
                }} />
            )}
            {nestedBalances.map((level, i) => (
                <DrillDownList {...{
                    expandedTitles: objClean(expandedTitles, [level.title]),
                    items: [level],
                    key: i + level.title + level.balance,
                    setExpandedTitles: children => {
                        const titles = { ...expandedTitles, ...children }
                        setExpandedTitles(titles)
                        rw({ expandedTitles: titles })
                    },
                    singleMode: false,
                    style: { margin: '15px 0' },
                }} />
            ))}
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
    const setLevelBalance = (parent, title, balance = 0, balanceType, number) => {
        let current = parent.find(x => x.title === title)
        if (!current) {
            current = {
                balance: balance,
                children: [],
                title: !number
                    ? title
                    : (
                        <Invertible {...{
                            content: number,
                            El: Popup,
                            eventsEnabled: false,
                            on: ['click', 'focus', ],
                            size: 'mini',
                            trigger: <span>{title}</span>,
                        }} />
                    ),
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
        const { number, balanceType, typeName, categoryName, categoryGrpName, groupName, balance = 0 } = next
        const type = setLevelBalance(allItems, typeName, balance, number)
        const category = setLevelBalance(type.children, categoryName, balance, number)
        const categoryGrp = setLevelBalance(category.children, categoryGrpName, balance, number)
        const group = setLevelBalance(categoryGrp.children, groupName, balance, balanceType, number)
        return allItems
    }, [])
}