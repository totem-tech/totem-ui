import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { getAddressName } from './partner'
import { Button } from 'semantic-ui-react'
import { showForm } from '../../services/modal'
import PartnerForm from './PartnerForm'
import { translated } from '../../utils/languageHelper'

const textsCap = translated({
    addPartner: 'add partner',
}, true)[1]

export default function PartnerNameOrAddButton({ address, userId }) {
    const [content, setContent] = useState('')
    
    useEffect(() => {
        const name = getAddressName(address) 
        const nameFound = !name.startsWith(address.slice(0, 3)) && !name.includes('...')
        const button = !nameFound && (
            <Button {...{
                icon: 'user plus',
                onClick: () => showForm(
                    PartnerForm,
                    {
                        values: { address, userId },
                    }),
                size: 'mini',
                title: textsCap.addPartner,
            }} />
        )
        setContent(<div>{name} {button}</div>)
    }, [address])
    
    return content
}
PartnerNameOrAddButton.prototype = {
    address: PropTypes
}