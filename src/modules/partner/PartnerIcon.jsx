import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'semantic-ui-react'
import { types, visibilityTypes } from './partner'
import { translated } from '../../utils/languageHelper'
import { showForm } from '../../services/modal'
import PartnerForm from './PartnerForm'
import { MOBILE, rxLayout } from '../../services/window'

let textsCap = {
    business: 'business',
    partner: 'partner',
    personal: 'personal',
    public: 'public',
}
textsCap = translated(textsCap, true)[1]

const PartnerIcon = props => {
    const [hovered, setHovered] = useState(false)
    const {
        address,
        size,
        style,
        type,
        visibility,
    } = props
    const isPublic = visibilityTypes.PUBLIC === visibility
    const _type = isPublic
        ? visibilityTypes.PUBLIC
        : type
    const isMobile = rxLayout.value === MOBILE
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

    const handleClick = !address
        ? undefined
        : e => {
            e.preventDefault()
            e.stopPropagation()
            showForm(PartnerForm, {
                autoSave: true,
                values: { address },
            })
        }
    const handleToggle = isMobile || !address
        ? undefined
        : () => setHovered(!hovered)
    return !name ? '' : (
        <Icon {...{
            className: 'no-margin',
            color,
            onClick: handleClick,
            onMouseEnter: handleToggle,
            onMouseLeave: handleToggle,
            ...props,
            name: hovered
                ? 'pencil'
                : name,
            style: {
                cursor: address
                    ? 'pointer'
                    : undefined,
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