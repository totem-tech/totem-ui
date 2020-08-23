import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Accordion, Icon } from 'semantic-ui-react'
import Text from './Text'
import { useInverted } from '../services/window'
import { className } from '../utils/utils'

export const DrillDownList = (props) => {
    const { className: clsName, items = [], nestedLevelNum = 0, style = {} } = props
    const [activeIndex, setActiveIndex] = useState()
    const inverted = useInverted()
    const AccordionEL = nestedLevelNum ? Accordion.Accordion : Accordion
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
        <AccordionEL {...elProps}>
            {items.map(({ children = [], subtitle, title }, i) => {
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

                            {children.length > 0 && <Icon inverted={inverted} name='dropdown' />}
                            <Text {...{
                                color: null,
                                invertedColor: active ? 'white' : 'grey'
                            }}>
                                {title}
                            </Text>

                            {nestedLevelNum > 0 && (
                                <Text {...{
                                    color: null,
                                    EL: 'div',
                                    invertedColor: active ? 'white' : 'grey',
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
                                active={active}
                                style={{ padding: 0 }}>
                                <DrillDownList items={children} nestedLevelNum={nestedLevelNum + 1} />
                            </Accordion.Content>
                        )}
                    </React.Fragment>
                )
            })}
        </AccordionEL >
    )
}
DrillDownList.propTypes = {
    items: PropTypes.arrayOf(PropTypes.shape({
        children: PropTypes.array,
        subtitle: PropTypes.any,
        title: PropTypes.any,
    })),
    nestedLevelNum: PropTypes.number,
    style: PropTypes.object,
}

export default React.memo(DrillDownList)