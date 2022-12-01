import React from 'react'
import PropTypes from 'prop-types'
import { Label } from 'semantic-ui-react'
import { toArray } from '../utils/utils'

const Tags = ({ tags = [], ...props }) => toArray(tags)
    .map(tag => (
        <Label {...{
            ...props,
            content: tag,
            key: tag,
            draggable: 'true',
            onDragStart: e => e.stopPropagation() | e.dataTransfer.setData('Text', e.target.textContent),
            style: {
                cursor: 'grab',
                display: 'inline',
                float: 'left',
                margin: 1,
                ...props.style,
            },
        }} />
    ))
Tags.propTypes = {
    tags: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.string,
    ]),
    // ...Label.propTypes,
}
export default React.memo(Tags)