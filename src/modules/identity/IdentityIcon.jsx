import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'semantic-ui-react'
import { rxUserIdentity } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import { objWithoutKeys } from '../../utils/utils'
import { showForm } from '../../services/modal'
import { MOBILE, rxLayout } from '../../services/window'
import { USAGE_TYPES } from './identity'
import IdentityDetailsForm from './IdentityDetailsForm'

const textsCap = translated({
    business: 'business',
    identity: 'own identity',
    personal: 'personal',
    rewardsIdentity: 'this is your rewards identity',
}, true)[1]

const IdentityIcon = props => {
    const [hovered, setHovered] = useState(false)
    const {
        address,
        size,
        style,
        usageType,
    } = props
    const isReward = rxUserIdentity.value === address
    const isMobile = rxLayout.value === MOBILE
    const ut = isReward
        ? USAGE_TYPES.REWARD
        : usageType
    let color, name, title
    switch (ut) {
        case USAGE_TYPES.BUSINESS:
            name = 'building'
            title = textsCap.business
            break
        default:
        case USAGE_TYPES.PERSONAL:
            name = 'user circle'
            title = textsCap.personal
            break
        case USAGE_TYPES.REWARD:
            color =  'orange'
            name =  'gift'
            title =  textsCap.rewardsIdentity
            break
    }

    const handleClick =!address
        ? undefined
        : e => {
            e.preventDefault()
            e.stopPropagation()
            showForm(IdentityDetailsForm, {
                values: { address },
            })
        }
    const handleToggle = isMobile || !address
        ? undefined
        : () => setHovered(!hovered)
    return (
        <Icon {...{
            className: 'no-margin',
            color,
            onClick: handleClick,
            onMouseEnter: handleToggle,
            onMouseLeave: handleToggle,
            ...objWithoutKeys(props, ['address', 'usageType']),
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
            title: `${textsCap.identity} (${title})`
        }} />
    )
}
IdentityIcon.propTypes = {
    // used to determine if it is the rewards identity
    address: PropTypes.string,
    usageType: PropTypes.oneOf(
        Object.values(USAGE_TYPES)
    ),
}
export default IdentityIcon