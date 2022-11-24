import React from 'react'
import { UserID } from '../../components/buttons'
import { translated } from '../../utils/languageHelper'
import { arrSort, isMap, isObj } from '../../utils/utils'
import { getIdentityOptions } from '../identity/getIdentityOptions'
import { rxPartners } from './partner'
import PartnerIcon from './PartnerIcon'

const textsCap = translated({ 
    identityOptionsHeader: 'select own identity',
    partner: 'partner',
    partnerOptionsHeader: 'select a partner',
}, true)[1]

/**
 * @name    getPartnerOptions
 * @summary constructs a list of Dropdown options using partners
 * 
 * @param   {Map}       partners
 * @param   {Object}    formProps props to be supplied when  editing the partner
 * @param   {Boolean}   includeOwnIdentities whether to include user identities as well.
 *                      identity options will only auto-update when partners list changes
 * 
 * @returns {Array}
 */
export const getPartnerOptions = (partners = rxPartners.value, formProps, includeOwnIdentities = false) => {
    const identityOptions = !includeOwnIdentities
        ? []
        : [
            {
                key: 'identities-header',
                style: styles.itemHeader,
                text: textsCap.identityOptionsHeader,
                value: '' // keep
            },
            ...getIdentityOptions(),
            {
                key: 'partners-header',
                style: styles.itemHeader,
                text: textsCap.partnerOptionsHeader,
                value: '' // keep
            },
        ]
    const identityAddrs = identityOptions.map(x => x.value)
    const partnerOptions = arrSort([...partners.values()], 'name')
        .filter(x => !identityAddrs.includes(x.address))
        .map(({ address, name, type, visibility, userId }) => ({
            description: <UserID {...{ userId }} />,
            key: address,
            keywords: [
                name,
                address,
                type,
                visibility,
                userId,
                'partner',
                textsCap.partner,
            ].join(' '),
            name, // keep
            text: (
                <span>
                    <PartnerIcon {...{
                        address,
                        formProps: isObj(formProps) && formProps || {},
                        type,
                        visibility,
                    }} />
                    {' ' + name}
                </span>
            ),
            value: address,
        }))
    
    return [
        ...identityOptions,
        ...partnerOptions,
    ]
}
export default getPartnerOptions

const styles = {
    itemHeader: {
        background: 'grey',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1em'
    }
}