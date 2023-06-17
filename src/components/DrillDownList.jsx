import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Accordion, Icon } from 'semantic-ui-react'
import { RecursiveShapeType, useRxSubject } from '../utils/reactjs'
import {
    className,
    hasValue,
    isFn,
} from '../utils/utils'
import {
    MOBILE,
    rxLayout,
    useInverted
} from '../utils/window'
import Text from './Text'

const DrillDownList = props => {
    const {
        expandedNames: parentActive,
        className: clsName,
        items,
        setExpandedNames: parentSetActive,
        nestedLevelNum,
        singleMode,
        style,
    } = props
    const [expandedItems = {}, setExpandedItems] = isFn(parentSetActive)
        ? [parentActive || {}, parentSetActive] // assume state is externally managed
        : useState() // manage state locally
    const inverted = useInverted()
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const AccordionEl = nestedLevelNum
        ? Accordion.Accordion
        : Accordion
    const elProps = {
        className: className(['drill-down-list', clsName, { inverted }]),
        styled: nestedLevelNum
            ? undefined
            : true,
        fluid: nestedLevelNum
            ? undefined
            : true,
        style: {
            border: inverted
                ? 'grey 1px solid'
                : undefined,
            margin: !nestedLevelNum
                ? 0
                : undefined,
            ...style,
        }
    }
    const arrowLeftPadding = isMobile
        ? 5
        : 10
    return (
        <AccordionEl {...elProps}>
            {items.map(({ content, children = [], name, subtitle, title }, i) => {
                const gotChildren = children.length > 0 || hasValue(content)
                name = name || title
                const self = expandedItems[name] || { active: false }
                const isActive = !gotChildren || !!self.active
                return (
                    <React.Fragment key={i}>
                        <Accordion.Title {...{
                            active: isActive,
                            index: i,
                            onClick: () => {
                                if (!gotChildren) return
                                const names = singleMode
                                    ? {}
                                    : expandedItems

                                names[name] = {
                                    ...expandedItems[name],
                                    active: !isActive,
                                }
                                setExpandedItems({ ...names })
                            },
                            style: {
                                paddingLeft: nestedLevelNum * arrowLeftPadding
                                    + (children.length && arrowLeftPadding || 0),
                                position: 'relative',
                            },
                        }}>

                            {gotChildren && (
                                <Icon {...{
                                    inverted,
                                    name: 'dropdown',
                                }} />
                            )}
                            <Text {...{
                                color: null,
                                invertedColor: isActive ? 'white' : 'grey'
                            }}>
                                {title}
                            </Text>

                            {nestedLevelNum > 0 && (
                                <Text {...{
                                    color: null,
                                    El: 'div',
                                    invertedColor: isActive ? 'white' : 'grey',
                                    style: {
                                        position: 'absolute',
                                        right: 20,
                                        top: 10,
                                    }
                                }}>
                                    {subtitle}
                                </Text>
                            )}
                        </Accordion.Title>
                        {gotChildren && (
                            <Accordion.Content
                                level={nestedLevelNum}
                                active={isActive}
                                style={{ padding: 0 }}>

                                {content}

                                {!!children.length && (
                                    <DrillDownList {...{
                                        expandedNames: self.children || {},
                                        items: children,
                                        nestedLevelNum: nestedLevelNum + 1,
                                        setExpandedNames: children => {
                                            const names = { ...expandedItems }
                                            names[name] = { ...self, children }
                                            setExpandedItems(names)
                                        },
                                        singleMode,
                                    }} />
                                )}
                            </Accordion.Content>
                        )}
                    </React.Fragment>
                )
            })}
        </AccordionEl>
    )
}
DrillDownList.propTypes = {
    className: PropTypes.string,
    // @expandedNames    required only if @setExpandedNames is a function
    expandedNames: PropTypes.object,
    items: PropTypes.arrayOf(
        RecursiveShapeType({
            content: PropTypes.any,
            name: PropTypes.string,
            subtitle: PropTypes.any,
            title: PropTypes.any.isRequired,
        }, 'children')
    ).isRequired,
    // @nestedLevelNum for internal use only
    nestedLevelNum: PropTypes.number,
    // @setExpandedNames (optional) use this to maintain expanded statues externally.
    //                  If not a function, active statues are maintained internally
    setExpandedNames: PropTypes.func,
    // if `false`, allows multiple children to be active at the same time
    singleMode: PropTypes.bool,
    style: PropTypes.object,
}
DrillDownList.defaultProps = {
    items: [],
    nestedLevelNum: 0,
    singleMode: true,
}
export default React.memo(DrillDownList)