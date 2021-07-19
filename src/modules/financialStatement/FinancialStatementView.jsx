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
import { MOBILE, rxLayout } from '../../services/window'

const MODULE_KEY = 'financialStatement'
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
const textsCap = translated({
    collapseAll: 'collapse all',
    expandAll: 'expand all',
    unknownTitle: 'unknown title'
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
    const isMobile = rxLayout.value === MOBILE
    const setLevelBalance = (parent, title = textsCap.unknownTitle, balance = 0, balanceType, number) => {
        let current = parent.find(x => x.title === title)
        if (number) {
            title = !isMobile
                ? <span>{title} ({number})</span>
                : (
                    <Invertible {...{
                        content: number,
                        El: Popup,
                        eventsEnabled: false,
                        on: ['click', 'focus',],
                        position: 'bottom center',
                        positionFixed: true,
                        size: 'mini',
                        trigger: <span>{title}</span>,
                    }} />
                )
        }
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
        const {
            balance = 0,
            balanceType,
            name,
            number,
            categoryName,
            categoryGrpName,
            groupName,
            typeName,
        } = next
        const type = setLevelBalance(
            allItems,
            typeName,
            balance,
            number,
        )
        const category = setLevelBalance(
            type.children,
            categoryName,
            balance,
            number,
        )
        const categoryGrp = categoryGrpName && setLevelBalance(
            category.children,
            categoryGrpName,
            balance,
            number,
        )
        categoryGrp && groupName && setLevelBalance(
            categoryGrp.children,
            name,
            balance,
            balanceType,
            number,
        )
        return allItems
    }, [])
}