import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { Icon } from 'semantic-ui-react'
import imgDeloitteVerified from '../../assets/deloitte/deloitte-verified-icon.svg'
import { showForm } from '../../services/modal'
import { rxUserIdentity } from '../../utils/chatClient'
import { translated } from '../../utils/languageHelper'
import { className, generateHash } from '../../utils/utils'
import { useRxSubject } from '../../utils/reactjs'
import { MOBILE, rxLayout } from '../../utils/window'
import { USAGE_TYPES } from './identity'
import IdentityDetailsForm from './IdentityDetailsForm'
import { UseDeloiteVerified } from './IdentityForm'

const textsCap = {
    business: 'business',
    deloitte: 'Your identity is Deloitte verified!',
    identity: 'your identity',
    personal: 'personal',
    rewardsIdentity: 'this is your rewards identity',
}
translated(textsCap, true)

const IdentityIcon = (props) => {
    const {
        address,
        deloitteVerified,
        formProps = {},
        size,
        style,
        usageType,
        ...propsRest
    } = props
    if (address && deloitteVerified === undefined) return (
        <UseDeloiteVerified {...{
            address,
            render: (isVerified, isLoading) => isLoading
                ? <Icon {...{ name: 'spinner', loading: true }} />
                : <IdentityIcon {...{ ...props, deloitteVerified: !!isVerified }} />
        }} />
    )
    const [hovered, setHovered] = useState(false)
    const [isReward] = !address
        ? [false]
        : useRxSubject(rxUserIdentity, x => x && x === address)
    const isMobile = rxLayout.value === MOBILE
    const ut = isReward
        ? USAGE_TYPES.REWARD
        : usageType
    let name, title, cls
    let color = 'grey'
    let titlePrefix = textsCap.identity + ' '
    switch (usageType) {
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
    if (deloitteVerified) {
        cls = !hovered && 'deloitte'
        title = `${textsCap.deloitte} (${title})`
        titlePrefix = ''
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
        <>
            {deloitteVerified && (
                <style {...{
                    children: `i.icon.${cls} { content: url(${imgDeloitteVerified}); }`
                }} />
            )}
            <Icon {...{
                ...propsRest,
                className: className([
                    'no-margin',
                    cls,
                ]),
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
                name: hovered
                    ? 'pencil'
                    : name,
                size,
                style: {
                    cursor: address
                        ? 'pointer'
                        : undefined,
                    fontSize: size
                        ? undefined
                        : '110%',
                    ...style,
                },
                title: !titlePrefix
                    ? title
                    : `${titlePrefix}(${title})`
            }} />
        </>
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