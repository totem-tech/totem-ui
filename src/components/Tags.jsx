import React from 'react'
import { Label } from 'semantic-ui-react'

export default React.memo(({ tags = [], ...props }) => tags.map(tag => (
    <Label {...{
        ...props,
        content: tag,
        key: tag,
        draggable: 'true',
        onDragStart: e => e.stopPropagation() | e.dataTransfer.setData("Text", e.target.textContent),
        style: {
            cursor: 'grab',
            display: 'inline',
            float: 'left',
            margin: 1,
            ...props.style,
        },
    }} />
)))