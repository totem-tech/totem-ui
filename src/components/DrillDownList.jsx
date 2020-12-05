import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Accordion, Icon } from 'semantic-ui-react'
import { className, isFn } from '../utils/utils'
import { useInverted } from '../services/window'
import { RecursiveShapeType } from '../services/react'
import Text from './Text'

const DrillDownList = props => {
    const {
        expandedTitles: parentActive,
        className: clsName,
        items,
        setExpandedTitles: parentSetActive,
        nestedLevelNum,
        singleMode,
        style,
    } = props
    const [expandedTitles = {}, setExpandedTitles] = isFn(parentSetActive)
        ? [parentActive || {}, parentSetActive] // assume state is externally managed
        : useState() // manage state locally
    const inverted = useInverted()
    const AccordionEl = nestedLevelNum ? Accordion.Accordion : Accordion
    const elProps = {
        className: className([clsName, { inverted }]),
        styled: nestedLevelNum ? undefined : true,
        fluid: nestedLevelNum ? undefined : true,
        style: {
            border: inverted ? 'grey 1px solid' : undefined,
            margin: !nestedLevelNum ? 0 : undefined,
            ...style,
        }
    }
    return (
        <AccordionEl {...elProps}>
            {items.map(({ balance, children = [], subtitle, title }, i) => {
                const hasChildren = !!children.length
                const self = expandedTitles[title] || { active: false }
                const isActive = !hasChildren || !!self.active
                return (
                    <React.Fragment key={title + balance}>
                        <Accordion.Title {...{
                            active: isActive,
                            index: i,
                            onClick: () => {
                                if (!hasChildren) return
                                const x = singleMode ? {} : {...expandedTitles}
                                
                                x[title] = { ...expandedTitles[title], active: !isActive }
                                setExpandedTitles(x)
                            },
                            style: {
                                paddingLeft: nestedLevelNum * 15 + (children.length ? 0 : 15),
                                position: 'relative',
                            },
                        }}>

                            {children.length > 0 && <Icon inverted={inverted} name='dropdown' />}
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
                        {children.length > 0 && (
                            <Accordion.Content
                                level={nestedLevelNum}
                                active={isActive}
                                style={{ padding: 0 }}>
                                <DrillDownList {...{
                                    expandedTitles: self._children || {},
                                    items: children,
                                    nestedLevelNum: nestedLevelNum + 1,
                                    setExpandedTitles: _children => {
                                        const x = { ...expandedTitles }
                                        x[title] = { ...self, _children }
                                        setExpandedTitles(x)
                                    },
                                    singleMode,
                                }} />
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
    // @expandedTitles    required only if @setExpandedTitles is a function
    expandedTitles: PropTypes.object,
    items: PropTypes.arrayOf(
        RecursiveShapeType({
            subtitle: PropTypes.any,
            title: PropTypes.any.isRequired,
        }, 'children')
    ).isRequired,
    // @nestedLevelNum for internal use only
    nestedLevelNum: PropTypes.number,
    // @setExpandedTitles (optional) use this to maintain expanded statues externally.
    //                  If not a function, active statues are maintained internally
    setExpandedTitles: PropTypes.func,
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