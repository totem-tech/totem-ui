import PropTypes from 'prop-types'
import React from 'react'
import { Button } from '../../components/buttons'
import LabelCopy from '../../components/LabelCopy'
import { showForm } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactjs'
import {
    isAddress,
    objWithoutKeys,
    textEllipsis,
} from '../../utils/utils'
import { rxIdentities } from '../identity/identity'
import IdentityIcon from '../identity/IdentityIcon'
import { rxPartners } from './partner'
import PartnerForm, { inputNames } from './PartnerForm'
import PartnerIcon from './PartnerIcon'

const textsCap = {
    addPartner: 'add partner',
}
translated(textsCap, true)

/**
 * @name    AddressName
 * @summary display name of the identity or partner along with appropriate icon. 
 * If not own identity or partner, will show a button to add as partner.
 * 
 * @param   {Object}   p           props
 * @param   {String}   p.address    identity
 * @param   {Boolean}  p.allowCopy  (optional) whether to add a button to copy the address
 *                                  Default: `true`
 * @param   {*}        p.Component  (optional) wrapper component
 *                                  Default: `"span"`
 * @param   {*}        p.maxLength  (optional) wrapper component
 *                                  Default: `32`
 * @param   {*}        p.name       (optional) partner name to be passed on to add partner form
 * @param   {Object}   p.styleAddButton (optional) CSS styles for add partner button
 * @param   {String}   p.userId     (optional) user ID to be passed on to add partner form
 */
const AddressName = React.memo(({
    address = '',
    allowCopy,
    Component,
    maxLength,
    name: partnerName,
    style,
    styleAddButton,
    userId,
    ...props
}) => {
    if (!isAddress(address)) return ''

    const [identity] = useRxSubject(rxIdentities, map => map.get(address))
    const [partner] = useRxSubject(rxPartners, map => map.get(address))
    const {
        name = '',
        type, // from partner
        usageType, // from identity
        visibility, // from partner
    } = identity || partner || {}
    const addBtn = !name && (
        <Button {...{
            className: 'no-print',
            icon: 'user plus',
            onClick: e => {
                e.preventDefault()
                e.stopPropagation()
                return showForm(PartnerForm, {
                    values: {
                        [inputNames.address]: address,
                        [inputNames.name]: partnerName,
                        [inputNames.userId]: userId,
                    },
                })
            },
            size: 'mini',
            style: styleAddButton,
            title: textsCap.addPartner,
        }} />
    )

    return (
        <Component {...{
            ...props,
            style: {
                whiteSpace: 'nowrap',
                ...style,
            },
            title: address,
        }}>
            {!!identity
                ? <IdentityIcon {...{ address, usageType }} />
                : !!partner
                    ? (
                        <PartnerIcon {...{
                            address,
                            type,
                            visibility,
                        }} />
                    )
                    : ''
            }
            {addBtn}{!!name && ' '}
            {!!name
                ? maxLength
                    ? textEllipsis(
                        name,
                        maxLength,
                        3,
                        false,
                    )
                    : name
                : !allowCopy
                    ? textEllipsis(
                        address,
                        maxLength,
                        3,
                        false,
                    )
                    : (
                        <LabelCopy {...{
                            content: name,
                            style: {
                                display: 'inline',
                                padding: 7.5,
                            },
                            maxLength,
                            value: address,
                        }} />
                    )}
        </Component>
    )
})
AddressName.prototype = {
    address: PropTypes.string.isRequired,
    // @allowCopy: whether to include a copy button when name is not found and plain address is dislayed.
    allowCopy: PropTypes.bool,
    Component: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.elementType,
    ]).isRequired,
    maxLength: PropTypes.number,
    // @name (optional): a name to be prefilled when adding as partner
    name: PropTypes.string,
    // @userId: (optional) userId to be prefilled when adding as partner
    userId: PropTypes.string,
}
AddressName.defaultProps = {
    allowCopy: true,
    Component: 'span',
    maxLength: 32,
}
export default AddressName