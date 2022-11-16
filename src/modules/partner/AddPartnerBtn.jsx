import React, { useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import { getAddressName, rxPartners } from './partner'
import { Button } from 'semantic-ui-react'
import { showForm } from '../../services/modal'
import PartnerForm from './PartnerForm'
import { translated } from '../../utils/languageHelper'
import LabelCopy from '../../components/LabelCopy'
import { deferred, objWithoutKeys } from '../../utils/utils'
import { useRxSubject } from '../../utils/reactHelper'
import { rxIdentities } from '../identity/identity'

const textsCap = translated({
    addPartner: 'add partner',
}, true)[1]

function AddPartnerBtn(props) {
    const {
        address = '',
        allowCopy,
        Component,
        ignoreAttributes,
        partnerFormProps,
        partnerName,
        style,
        userId,
    } = props
    const [identity] = useRxSubject(rxIdentities, map => map.get(address))
    const [partner] = useRxSubject(rxPartners, map => map.get(address))
    const { name = '' } = identity || partner || {}
    const exists = !name.startsWith(address.slice(0, 3))
        && !name.includes('...')
    const addBtn = !exists && (
        <Button {...{
            icon: 'user plus',
            onClick: () => showForm(PartnerForm, {
                values: {
                    address,
                    name: partnerName,
                    userId,
                    ...partnerFormProps,
                },
            }),
            size: 'mini',
            title: textsCap.addPartner,
        }} />
    )
    
    return (
        <Component {...{
            ...objWithoutKeys(props, ignoreAttributes),
            style: {
                whiteSpace: 'nowrap',
                ...style,
            }
        }}>
            {addBtn}{!!exists && ' '}
            {exists
                ? name
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
AddPartnerBtn.prototype = {
    address: PropTypes.string.isRequired,
    allowCopy: PropTypes.bool,
    Component: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.elementType,
    ]).isRequired,
    ignoreAttributes: PropTypes.arrayOf(PropTypes.string),
    partnerName: PropTypes.string,
    partnerFormProps: PropTypes.object,
    userId: PropTypes.string,
}
AddPartnerBtn.defaultProps = {
    allowCopy: true,
    Component: 'span',
    ignoreAttributes: [
        'address',
        'allowCopy',
        'Component',
        'ignoreAttributes',
        'partnerFormProps',
        'partnerName',
        'userId',
    ],
}
export default React.memo(AddPartnerBtn)