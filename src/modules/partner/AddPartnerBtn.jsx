import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { getAddressName } from './partner'
import { Button } from 'semantic-ui-react'
import { showForm } from '../../services/modal'
import PartnerForm from './PartnerForm'
import { translated } from '../../utils/languageHelper'

const textsCap = translated({
    addPartner: 'add partner',
}, true)[1]

function AddPartnerBtn(props) {
    const {
        address,
        Component = 'span',
        partnerName,
        showNameIfExists = true,
        userId,
    } = props
    const addressName = useMemo(() => getAddressName(address), [address])
    const exists = !addressName.startsWith(address.slice(0, 3))
        && !addressName.includes('...')
    if (exists && !showNameIfExists) return ''

    const button = exists
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
    return <Component>{addressName} {button}</Component>
}
AddPartnerBtn.prototype = {
    address: PropTypes.string,
    Component: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.elementType,
    ])
}
export default React.memo(AddPartnerBtn)