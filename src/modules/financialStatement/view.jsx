import React, { useState } from 'react'
import { Accordion, Icon } from 'semantic-ui-react'
import Currency from '../../components/Currency'
import Message from '../../components/Message'
import useLedgerAcBalances from './useLedgerAcBalances'
import { useSelected } from '../../services/identity'


export default function () {
    const selectedAddress = useSelected()
    const glAcBalances = useLedgerAcBalances(selectedAddress)
    const nestedBalances = getNestedBalances(glAcBalances)
    console.log({ glAcBalances, nestedBalances })
    return (
        <div style={{ whiteSpace: 'pre' }}>
            {glAcBalances && (
                nestedBalances.map((level, i) => (
                    <AccountDrillDownList {...{
                        key: i + level.balance,
                        levels: [level],
                        style: { margin: '15px 0' }
                    }} />
                ))
            )}
            <Message {...{
                className: 'empty-message',
                content: 'Loading...',
                showIcon: true,
                status: 'loading',
            }} />
        </div>
    )
}

const AccountDrillDownList = React.memo(({ nestedLevelNum = 0, levels, style }) => {
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
            {levels.map(({ balance, children = [], title }, i) => {
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
})

const getNestedBalances = (glAccounts = []) => {
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

    return glAccounts.reduce((levels, { typeName, categoryName, categoryGrpName, groupName, _balance = 0 }) => {
        const type = setLevelBalance(levels, typeName, _balance)
        const category = setLevelBalance(type.children, categoryName, _balance)
        const categoryGrp = setLevelBalance(category.children, categoryGrpName, _balance)
        const group = setLevelBalance(categoryGrp.children, groupName, _balance)
        return levels
    }, [])
}