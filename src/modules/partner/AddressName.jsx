import React from 'react'
import PropTypes from 'prop-types'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactHelper'
import { isAddress, objWithoutKeys, textEllipsis } from '../../utils/utils'
import { Button } from '../../components/buttons'
import LabelCopy from '../../components/LabelCopy'
import { showForm } from '../../services/modal'
import { rxIdentities } from '../identity/identity'
import IdentityIcon from '../identity/IdentityIcon'
import { rxPartners } from './partner'
import PartnerForm from './PartnerForm'
import PartnerIcon from './PartnerIcon'

const textsCap = translated({
    addPartner: 'add partner',
}, true)[1]

/**
 * @name    AddressName
 * @summary display name of the identity or partner along with appropriate icon. 
 * If not own identity or partner, will show a button to add as partner.
 */
function AddressName(props) {
    const {
        address = '',
        allowCopy,
        Component,
        ignoreAttributes,
        maxLength,
        style,
        userId,
    } = props
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
            icon: 'user plus',
            onClick: e => {
                e.preventDefault()
                e.stopPropagation()
                showForm(PartnerForm, {
                    values: {
                        address,
                        userId,
                    },
                })
            },
            size: 'mini',
            title: textsCap.addPartner,
        }} />
    )
    
    return (
        <Component {...{
            ...objWithoutKeys(props, ignoreAttributes),
            key: address,
            style: {
                whiteSpace: 'nowrap',
                ...style,
            },
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
                    ? address
                    : (
                        <LabelCopy {...{
                            content: name,
                            style: { padding: 7.5 },
                            value: address,
                        }} />
                    )}
        </Component>
    )
}
AddressName.prototype = {
    address: PropTypes.string.isRequired,
    // @allowCopy: whether to include a copy button when name is not found and plain address is dislayed.
    allowCopy: PropTypes.bool,
    Component: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.elementType,
    ]).isRequired,
    ignoreAttributes: PropTypes.arrayOf(PropTypes.string),
    maxLength: PropTypes.number,
    // @userId: (optional) userId to be prefilled when adding as partner
    userId: PropTypes.string,
}
AddressName.defaultProps = {
    allowCopy: true,
    Component: 'span',
    ignoreAttributes: [
        'address',
        'allowCopy',
        'Component',
        'ignoreAttributes',
        'userId',
    ],
    // maxLength: 32,
}
export default React.memo(AddressName)