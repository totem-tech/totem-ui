import React from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'semantic-ui-react'
import { types, visibilityTypes } from './partner'
import { translated } from '../../utils/languageHelper'

let textsCap = {
    business: 'business',
    partner: 'partner',
    personal: 'personal',
    public: 'public',
}
textsCap = translated(textsCap, true)[1]

const PartnerIcon = props => {
    const {
        size,
        style,
        type,
        visibility,
    } = props
    const isPublic = visibilityTypes.PUBLIC === visibility
    const _type = isPublic
        ? visibilityTypes.PUBLIC
        : type
    let color, name, title

    switch (_type) {
        case types.BUSINESS:
            name = 'building outline'
            title = textsCap.business
            break;
        default:
        case types.PERSONAL:
            name = 'user circle outline'
            title = textsCap.personal
            break
        case visibilityTypes.PUBLIC:
            color = 'blue'
            name = 'certificate'
            title = textsCap.public
            break;
    }
    
    return !name ? '' : (
        <Icon {...{
            className: 'no-margin',
            color,
            ...props,
            name,
            style: {
                fontSize: size
                    ? undefined
                    : '110%',
                ...style,
            },
            title: `${textsCap.partner} (${title})`,
        }} />
    )
}
PartnerIcon.propTypes = {
    type: PropTypes.oneOf(
        Object.values(types)
    ),
    visibility: PropTypes.oneOf(
        Object.values(visibilityTypes)
    ),
}
export default PartnerIcon