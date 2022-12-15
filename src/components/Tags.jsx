import React from 'react'
import PropTypes from 'prop-types'
import { Label } from 'semantic-ui-react'
import { className, isFn, toArray } from '../utils/utils'
import { useInverted } from '../services/window'

const Tags = (props) => {
    const {
        className: cls,
        onDragStart,
        style,
        tags = [],
    } = props
    const inverted = useInverted()
    return toArray(tags)
        .map(tag => (
            <Label {...{
                ...props,
                className: className({
                    [cls]: true,
                    inverted,                    
                }),
                content: tag,
                draggable: true,
                key: tag,
                onDragStart: e => {
                    e.stopPropagation()
                    e.dataTransfer.setData('Text', e.target.textContent)
                    isFn(onDragStart) && onDragStart(e)
                },
                style: {
                    cursor: 'grab',
                    display: 'inline',
                    float: 'left',
                    margin: 1,
                    ...style,
                },
            }} />
        ))
}
Tags.propTypes = {
    tags: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.string,
    ]),
    // ...Label.propTypes,
}
export default React.memo(Tags)