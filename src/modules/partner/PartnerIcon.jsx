import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'semantic-ui-react'
import { translated } from '../../utils/languageHelper'
import { showForm } from '../../services/modal'
import { MOBILE, rxLayout } from '../../services/window'
import { types, visibilityTypes } from './partner'
import PartnerForm from './PartnerForm'
import { objWithoutKeys } from '../../utils/utils'

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
        formProps = {},
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
                ...formProps,
                values: {
                    ...formProps.values,
                    address,
                },
            })
        }
    return !name ? '' : (
        <Icon {...{
            className: 'no-margin',
            color,
            onDragStart: e => {
                setHovered(false)
                e.stopPropagation()
				e.dataTransfer.setData('Text', _type)
			},
            onClick: handleClick,
            onMouseEnter: isMobile || !address
                ? undefined
                : () => setHovered(true),
            onMouseLeave: isMobile || !address
                ? undefined
                : () => setHovered(false),
            ...objWithoutKeys(props, [
                'address',
                'formProps',
                'type',
                'visibility',
            ]),
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
    address: PropTypes.string,
    formProps: PropTypes.object,
    type: PropTypes.oneOf(
        Object.values(types)
    ),
    visibility: PropTypes.oneOf(
        Object.values(visibilityTypes)
    ),
}
export default PartnerIcon