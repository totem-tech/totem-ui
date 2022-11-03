import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { getAddressName } from './partner'
import { Button } from 'semantic-ui-react'
import { showForm } from '../../services/modal'
import PartnerForm from './PartnerForm'
import { translated } from '../../utils/languageHelper'
import LabelCopy from '../../components/LabelCopy'

const textsCap = translated({
    addPartner: 'add partner',
}, true)[1]

function AddPartnerBtn(props) {
    const {
        address,
        allowCopy,
        Component,
        partnerName,
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
                onClick: () => showForm(
                    PartnerForm,
                    {
                        values: {
                            address,
                            name: partnerName,
                            userId,
                        },
                    }
                ),
                size: 'mini',
                title: textsCap.addPartner,
            }} />
        )
    
    return (
        <Component>
            {addBtn}{!!exists && ' '}
            {exists
                ? addressName
                : !allowCopy
                    ? address
                    : (
                        <LabelCopy {...{
                            content: addressName,
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
    userId: PropTypes.string,
}
AddPartnerBtn.defaultProps = {
    allowCopy: true,
    Component: 'span',
}
export default React.memo(AddPartnerBtn)