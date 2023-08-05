import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { Icon } from 'semantic-ui-react'
import imgDeloitteVerified from '../../assets/deloitte/deloitte-verified-icon.svg'
import { showForm } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import { useIsMobile } from '../../utils/reactjs'
import { className } from '../../utils/utils'
import { UseDeloiteVerified } from '../identity/IdentityForm'
import { types, visibilityTypes } from './partner'
import PartnerForm from './PartnerForm'

const textsCap = {
    business: 'business',
    deloitte: 'Partner identity is Deloitte verified!',
    partner: 'partner',
    personal: 'personal',
    public: 'public',
}
translated(textsCap, true)

const PartnerIcon = props => {
    const {
        address,
        deloitteVerified,
        formProps = {},
        size,
        style,
        type,
        visibility,
        ...propsRest
    } = props
    if (address && deloitteVerified === undefined) return (
        <UseDeloiteVerified {...{
            address,
            render: (isVerified, isLoading) => isLoading
                ? (
                    <Icon {...{
                        name: 'spinner',
                        loading: true,
                    }} />
                )
                : (
                    <PartnerIcon {...{
                        ...props,
                        deloitteVerified: isVerified,
                    }} />
                )
        }} />
    )
    const isMobile = useIsMobile()
    const [hovered, setHovered] = useState(false)
    const isPublic = !deloitteVerified
        && visibilityTypes.PUBLIC === visibility
    const _type = isPublic
        ? visibilityTypes.PUBLIC
        : type
    let name, title, cls
    let color = 'grey'
    let titlePrefix = textsCap.partner

    switch (_type) {
        case types.BUSINESS:
            name = 'building outline'
            title = textsCap.business
            break
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

        <>
            {deloitteVerified && (
                <style {...{
                    children: `i.icon.${cls} { content: url(${imgDeloitteVerified}) }`
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
                    e.dataTransfer.setData('Text', _type)
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
                    : `${titlePrefix} (${title})`,
            }} />
        </>
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