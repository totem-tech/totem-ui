import React from 'react'
import PropTypes from 'prop-types'
import { Icon, Message as SemanticMessage } from 'semantic-ui-react'
import { icons, isObj, isStr, objWithoutKeys } from '../utils/utils'

export const statuses = {
    BASIC: '',
    ERROR: 'error',
    INFO: 'info',
    LOADING: 'loading',
    SUCCESS: 'success',
    WARNING: 'warning',
}
// valid statuses: error, info, loading, warning, success
export const Message = (message = {}) => {
    let { content, header, icon, list, status, style } = message || {}
    if (!isObj(message) || (!content && !list && !header)) return ''
    icon = React.isValidElement(icon) ? icon.props : icon
    if (icon === true) {
        icon = icons[status]
    }
    icon = !isStr(icon) ? icon || undefined : { name: icon }

    return (
        <SemanticMessage
            {...message}
            error={status === statuses.ERROR}
            icon={icon && <Icon {...icon} style={{ width: 42, ...icon.style }} />}
            info={status === statuses.INFO}
            style={{ textAlign: icon ? 'left' : 'center', ...style }}
            success={status === statuses.SUCCESS}
            visible={!!status}
            warning={[statuses.WARNING, statuses.LOADING].includes(status)}
        />
    )
}
// support any properties supported by Semantic's Message component
Message.propTypes = {
    icon: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.element,
        PropTypes.object,
        PropTypes.string,
    ]),
}
export default React.memo(Message)