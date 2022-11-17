import React from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'semantic-ui-react'
import { rxUserIdentity } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import { objWithoutKeys } from '../../utils/utils'
import { USAGE_TYPES } from './identity'

const textsCap = translated({
    business: 'business',
    identity: 'own identity',
    personal: 'personal',
    rewardsIdentity: 'this is your rewards identity',
}, true)[1]

const IdentityIcon = props => {
    const {
        address,
        size,
        style,
        usageType,
    } = props
    const isReward = rxUserIdentity.value === address
    let color, name, title
    const ut = isReward
        ? USAGE_TYPES.REWARD
        : usageType
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

    return (
        <Icon {...{
            className: 'no-margin',
            color,
            title,
            ...objWithoutKeys(props, ['address', 'usageType']),
            name,
            style: {
                fontSize: size ? undefined : '110%',
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