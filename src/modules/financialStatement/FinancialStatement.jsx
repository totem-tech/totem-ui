import React, { useState } from 'react'
import { Button } from '../../components/buttons'
import DrillDownList from '../../components/DrillDownList'
import LabelCopy from '../../components/LabelCopy'
import Currency from '../currency/Currency'
import { translated } from '../../utils/languageHelper'
import { Message } from '../../utils/reactjs'
import storage from '../../utils/storageHelper'
import {
    isArr,
    objClean,
    textEllipsis,
} from '../../utils/utils'
import { MOBILE, rxLayout } from '../../utils/window'
import PostingList from './PostingList'
import useLedgerAcBalances from './useLedgerAcBalances'

const MODULE_KEY = 'financialStatement'
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
const textsCap = {
    collapseAll: 'collapse all',
    expandAll: 'expand all',
    unknownTitle: 'unknown title'
}
translated(textsCap, true)

export default function FinancialStatementView(props) {
    const [nestedBalances = [], message] = useLedgerAcBalances(null, getNestedBalances)
    const [expandedNames, setExpandedNames] = useState(() => rw().expandedNames || {})
    const shouldExpand = Object.keys(expandedNames)
        .filter(key => !!expandedNames[key].active)
        .length === 0

    return (
        <div {...{ ...props, style: { whiteSpace: 'pre', ...props.style } }}>
            {nestedBalances.length > 0 && (
                <Button {...{
                    className: 'no-print',
                    content: !shouldExpand
                        ? textsCap.collapseAll
                        : textsCap.expandAll,
                    icon: `caret square outline ${shouldExpand ? 'down' : 'right'}`,
                    onClick: () => {
                        const getNames = (balances = []) => balances
                            .reduce((names, { children = [], name, title }) => {
                                name = name || title
                                names[name] = {
                                    active: shouldExpand,
                                    children: children.length === 0
                                        ? undefined
                                        : getNames(children)
                                }
                                return names
                            }, {})
                        const names = getNames(nestedBalances)
                        setExpandedNames(names)
                        rw({ expandedNames: names })
                    },
                    style: { textTransform: 'capitalize' },
                }} />
            )}
            {nestedBalances.map((level, i) => (
                <DrillDownList {...{
                    expandedNames: objClean(expandedNames, [level.name || level.title]),
                    items: [level],
                    key: i + level.name + level.balance,
                    setExpandedNames: children => {
                        const names = { ...expandedNames, ...children }
                        setExpandedNames(names)
                        rw({ expandedNames: names })
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
export const getNestedBalances = (glAccounts = [], address) => {
    if (!isArr(glAccounts)) return []

    const isMobile = rxLayout.value === MOBILE
    const setLevelBalance = (parents, title, balance = 0, balanceType, ledgerAccount, isLast) => {
        // should only happen if there was a mistake in the database
        title = title || textsCap.unknownTitle
        const name = title //+ balanceType
        let parentItem = parents.find(x => x.name === name)
        if (isMobile) title = textEllipsis(title, 18, 3, false)
        if (isLast) {
            title = (
                <span>
                    {title + ' '}
                    {isLast && (
                        <LabelCopy {...{
                            content: isMobile
                                ? null
                                : ledgerAccount,
                            onClick: e => e.stopPropagation(),
                            value: `${ledgerAccount}`,
                        }} />
                    )}
                </span>
            )
        }
        if (!parentItem) {
            parentItem = {
                balance,
                children: [],
                content: !isLast
                    ? undefined
                    : (
                        <PostingList {...{
                            address,
                            key: `${address}${ledgerAccount}`,
                            ledgerAccount,
                        }} />
                    ),
                name,
                title,
            }
            parents.push(parentItem)
        } else {
            parentItem.balance += balance
        }
        parentItem.subtitle = <Currency value={parentItem.balance} />
        if (balanceType) parentItem.balanceType = balanceType
        return parentItem
    }

    return glAccounts.reduce((allItems, next) => {
        const {
            balance = 0,
            balanceType,
            name,
            number: ledgerAcNumber,
            categoryName,
            categoryGrpName,
            groupName,
            typeName,
        } = next
        const type = setLevelBalance(
            allItems,
            typeName,
            balance,
            balanceType,
            ledgerAcNumber,
            !categoryName,
        )
        const category = setLevelBalance(
            type.children,
            categoryName,
            balance,
            balanceType,
            ledgerAcNumber,
            !categoryGrpName,
        )
        const categoryGrp = categoryGrpName && setLevelBalance(
            category.children,
            categoryGrpName,
            balance,
            balanceType,
            ledgerAcNumber,
            !groupName
        )
        categoryGrp && groupName && setLevelBalance(
            categoryGrp.children,
            name,
            balance,
            balanceType,
            ledgerAcNumber,
            true
        )
        return allItems
    }, [])
}