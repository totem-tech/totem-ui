import React from 'react'
import PropTypes from 'prop-types'
import { Label } from 'semantic-ui-react'
import {
    className,
    isFn,
    isPositiveInteger,
    textEllipsis,
    toArray
} from '../utils/utils'
import { useInverted } from '../utils/window'

const Tags = ({
    className: cls,
    maxLength = 15,
    onDragStart,
    style,
    tags = [],
    ...props
}) => {
    const inverted = useInverted()
    return toArray(tags).map(tag => (
        <Label {...{
            ...props,
            className: className({
                [cls]: true,
                inverted,
            }),
            content: !isPositiveInteger(maxLength)
                ? tag
                : textEllipsis(
                    tag,
                    maxLength,
                    3,
                    false,
                ),
            draggable: true,
            key: tag,
            onDragStart: e => {
                e.stopPropagation()
                e.dataTransfer.setData('Text', tag)//e.target.textContent
                isFn(onDragStart) && onDragStart(e, tag)
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
    maxLength: PropTypes.number,
    tags: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.string,
    ]),
    // ...Label.propTypes,
}
export default React.memo(Tags)