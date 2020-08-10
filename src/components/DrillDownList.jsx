import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Accordion, Icon } from 'semantic-ui-react'

export const DrillDownList = ({ items = [], nestedLevelNum = 0, style }) => {
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
                            {children.length > 0 && <Icon name='dropdown' />}
                            {title}

                            {nestedLevelNum > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    right: 20,
                                    top: 10,
                                }}>
                                    {subtitle}
                                </div>
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