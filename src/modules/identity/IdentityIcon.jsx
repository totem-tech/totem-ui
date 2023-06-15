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
import { useRxSubject } from '../../utils/reactjs'

let textsCap = {
    business: 'business',
    identity: 'own identity',
    personal: 'personal',
    rewardsIdentity: 'this is your rewards identity',
}
textsCap = translated(textsCap, true)[1]

const IdentityIcon = props => {
    const {
        address,
        formProps = {},
        size,
        style,
        usageType,
    } = props
    const [hovered, setHovered] = useState(false)
    const [isReward] = useRxSubject(rxUserIdentity, x => x && x === address)
    const isMobile = rxLayout.value === MOBILE
    const ut = isReward
        ? USAGE_TYPES.REWARD
        : usageType
    let color = 'grey', name, title
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
            color = 'orange'
            name = 'gift'
            title = textsCap.rewardsIdentity
            break
    }

    const handleClick = !address
        ? undefined
        : e => {
            e.preventDefault()
            e.stopPropagation()
            showForm(IdentityDetailsForm, {
                ...formProps,
                values: {
                    ...formProps.values,
                    address,
                },
            })
        }
    return (
        <Icon {...{
            className: 'no-margin',
            color,
            onDragStart: e => {
                setHovered(false)
                e.stopPropagation()
                e.dataTransfer.setData('Text', ut)
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
                'usageType',
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
            title: `${textsCap.identity} (${title})`
        }} />
    )
}
IdentityIcon.propTypes = {
    // used to determine if it is the rewards identity
    address: PropTypes.string,
    // properties to be supplied when opening IdentityForm
    formProps: PropTypes.object,
    usageType: PropTypes.oneOf(
        Object.values(USAGE_TYPES)
    ),
    // ...other props acceptable by Icon
}
export default IdentityIcon