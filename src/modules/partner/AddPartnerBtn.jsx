import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { getAddressName } from './partner'
import { Button } from 'semantic-ui-react'
import { showForm } from '../../services/modal'
import PartnerForm from './PartnerForm'
import { translated } from '../../utils/languageHelper'
import LabelCopy from '../../components/LabelCopy'
import { objWithoutKeys } from '../../utils/utils'

const textsCap = translated({
    addPartner: 'add partner',
}, true)[1]

function AddPartnerBtn(props) {
    const {
        address,
        allowCopy,
        Component,
        ignoreAttributes,
        partnerName,
        style,
        userId,
    } = props
    const addressName = useMemo(() => getAddressName(address), [address])
    const exists = !addressName.startsWith(address.slice(0, 3))
        && !addressName.includes('...')
    const addBtn = exists
        ? ''
        : (
            <Button {...{
                icon: 'user plus',
                onClick: () => showForm(PartnerForm, {
                    values: {
                        address,
                        name: partnerName,
                        userId,
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
                ? addressName
                : !allowCopy
                    ? address
                    : (
                        <LabelCopy {...{
                            content: addressName,
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
        'partnerName',
        'userId',
    ],
}
export default React.memo(AddPartnerBtn)