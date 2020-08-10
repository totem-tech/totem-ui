import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { isArr } from '../../utils/utils'
import { Accordion, Icon } from 'semantic-ui-react'
import Currency from '../../components/Currency'

export const AccountDrillDownList = ({ glAccounts = [], nestedLevelNum = 0, style }) => {
    const [activeIndex, setActiveIndex] = useState()
    const AccordionEL = nestedLevelNum ? Accordion.Accordion : Accordion
    const props = nestedLevelNum ? {} : {
        styled: true,
        fluid: true,
    }
    if (nestedLevelNum) {
        style = { margin: 0, ...style }
    }
    props.style = style
    return (
        <AccordionEL {...props}>
            {glAccounts.map(({ balance, children = [], title }, i) => {
                const active = activeIndex === i || !children.length
                return (
                    <React.Fragment key={title + i}>
                        <Accordion.Title {...{
                            active,
                            index: i,
                            onClick: () => setActiveIndex(activeIndex === i ? -1 : i),
                            style: {
                                paddingLeft: nestedLevelNum * 15 + (children.length ? 0 : 15),
                                position: 'relative',
                            },
                        }}>
                            {children.length > 0 && <Icon name='dropdown' />}
                            {title}

                            {nestedLevelNum > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    right: 20,
                                    top: 10,
                                }}>
                                    <Currency value={balance} />
                                </div>
                            )}
                        </Accordion.Title>
                        {children.length > 0 && (
                            <Accordion.Content
                                level={nestedLevelNum}
                                active={active}
                                style={{ padding: 0 }}>
                                <AccountDrillDownList levels={children} nestedLevelNum={nestedLevelNum + 1} />
                            </Accordion.Content>
                        )}
                    </React.Fragment>
                )
            })}
        </AccordionEL >
    )
}
AccountDrillDownList.propTypes = {
    glAccounts: PropTypes.array,
    nestedLevelNum: PropTypes.number,
    style: PropTypes.object,
}

/**
 * @name    getNestedBalances
 * @summary generate multi-dimentional array using the result of `useLedgerAcBalances()` for use with drill down list
 * 
 * @param {Array} glAccounts 
 * 
 * @returns {Array}
 */
export const getNestedBalances = (glAccounts = []) => {
    if (!isArr(glAccounts)) return []
    const setLevelBalance = (parent, title, balance = 0) => {
        let level = parent.find(x => x.title === title)
        if (!level) {
            level = {
                balance: balance,
                children: [],
                title,
            }
            parent.push(level)
        } else {
            level.balance += balance
        }
        return level
    }

    return glAccounts.reduce((levels, { typeName, categoryName, categoryGrpName, groupName, balance = 0 }) => {
        const type = setLevelBalance(levels, typeName, balance)
        const category = setLevelBalance(type.children, categoryName, balance)
        const categoryGrp = setLevelBalance(category.children, categoryGrpName, balance)
        const group = setLevelBalance(categoryGrp.children, groupName, balance)
        return levels
    }, [])
}

export default React.memo(AccountDrillDownList)