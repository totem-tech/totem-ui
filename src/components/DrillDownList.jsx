import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Accordion, Icon } from 'semantic-ui-react'
import Text from './Text'
import { useInverted } from '../services/window'
import { className, isFn } from '../utils/utils'

const DrillDownList = (props) => {
    const {
        activeTitles: parentActive,
        className: clsName,
        items,
        setActiveTitles: parentSetActive,
        nestedLevelNum,
        singleMode,
        style,
    } = props
    const [activeTitles = {}, setActiveTitles] = isFn(parentSetActive)
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
                const self = activeTitles[title] || { active: false }
                const isActive = !hasChildren || !!self.active
                return (
                    <React.Fragment key={title + balance}>
                        <Accordion.Title {...{
                            active: isActive,
                            index: i,
                            onClick: () => {
                                if (!hasChildren) return
                                const x = singleMode
                                    ? {}
                                    : {...activeTitles}
                                
                                x[title] = { ...activeTitles[title], active: !isActive }
                                setActiveTitles(x)
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
                                    activeTitles: self._children || {},
                                    items: children,
                                    nestedLevelNum: nestedLevelNum + 1,
                                    setActiveTitles: _children => {
                                        const x = { ...activeTitles }
                                        x[title] = { ...self, _children }
                                        setActiveTitles(x)
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
    activeTitles: PropTypes.object,
    className: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.shape({
        children: PropTypes.array,
        subtitle: PropTypes.any,
        title: PropTypes.any.isRequired,
    })),
    nestedLevelNum: PropTypes.number,
    setActiveTitles: PropTypes.func,
    singleMode: PropTypes.bool,
    style: PropTypes.object,
}
DrillDownList.defaultProps = {
    items: [],
    nestedLevelNum: 0,
    singleMode: true,
}
export default React.memo(DrillDownList)