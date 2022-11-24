import React from 'react'
import { UserID } from '../../components/buttons'
import { translated } from '../../utils/languageHelper'
import { arrReverse, arrSort, isObj } from '../../utils/utils'
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
 * @param   {Object}    formProps   (optional) props to be supplied when  editing the partner
 * @param   {Boolean}   includeIdentities   (optional) whether to include user identities as well.
 *                      identity options will only auto-update when partners list changes
 *                      Default: false
 * @param   {Boolean}   reverse (optional) if truthy, identity options will be placed at the top and partners at bottom.
 *                      Default: false
 * 
 * @returns {Array}
 */
export const getPartnerOptions = (partners, formProps, includeIdentities = false, reverse) => {
    partners = partners || rxPartners.value
    const identityOptions = includeIdentities && getIdentityOptions() || []
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
    
    const options = arrReverse([
        [
            includeIdentities && {
                key: 'partners-header',
                style: styles.itemHeader,
                text: textsCap.partnerOptionsHeader,
                value: '' // keep
            },
            ...partnerOptions,
        ],
        [
            includeIdentities && {
                key: 'identities-header',
                style: styles.itemHeader,
                text: textsCap.identityOptionsHeader,
                value: '' // keep
            },
            ...identityOptions,
        ]
    ], reverse === true)
    return options
        .flat()
        .filter(Boolean)
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