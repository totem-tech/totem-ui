import React from 'react'
import PropTypes from 'prop-types'
import { Icon, Message as SemanticMessage } from 'semantic-ui-react'
import { icons, isObj, isStr, objWithoutKeys } from '../utils/utils'

// valid statuses: error, info, loading, warning, success
const Message = (message = {}) => {
    let { content, header, icon, list, showIcon, status, style } = message || {}
    if (!isObj(message) || (!content && !list && !header)) return ''
    icon = React.isValidElement(icon) ? icon.props : icon
    if (showIcon) {
        icon = icons[status]
    }
    icon = !isStr(icon) ? icon : { name: icon }

    return (
        <SemanticMessage
            {...(objWithoutKeys(message, ['showIcon']))}
            error={status === 'error'}
            icon={icon && <Icon {...icon} style={{ width: 42, ...icon.style }} />}
            info={status === 'info'}
            style={{ textAlign: icon ? 'left' : 'center', ...style }}
            success={status === 'success'}
            visible={!!status}
            warning={['warning', 'loading'].includes(status)}
        />
    )
}
// support any properties supported by Semantic's Message component
Message.propTypes = {
    showIcon: PropTypes.bool,
}
Message.defaultProps = {
    showIcon: false,
}
export default Message