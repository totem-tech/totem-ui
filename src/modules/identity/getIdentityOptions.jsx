import React from 'react'
import { translated } from '../../utils/languageHelper'
import { arrSort, isObj, textEllipsis } from '../../utils/utils'
import Balance from './Balance'
import { rxIdentities } from './identity'
import IdentityIcon from './IdentityIcon'

const textsCap = translated({
    identity: 'own identity',
}, true)[1]

/**
 * @name    getIdentityOptions
 * @summary constructs a list of Dropdown options using identities
 * 
 * @param   {Map}       identities
 * @param   {Object}    formProps props to be supplied when  editing the identity
 * 
 * @returns {Array}
 */
export const getIdentityOptions = (identities = rxIdentities.value, formProps) =>
    arrSort([...identities.values()], 'name')
        .map(({ address, name, usageType }) => ({
            description: <Balance {...{ address, showDetailed: null }} />,
            key: address,
            keywords: [
                name,
                address,
                usageType,
                'identity',
                textsCap.identity,
            ].join(' '),
            name, // keep
            value: address,
            text: (
                <span title={name}>
                    <IdentityIcon {...{
                        address,
                        formProps: isObj(formProps) && formProps || {},
                        key: address,
                        usageType,
                    }} />
                    {' ' + textEllipsis(name, 25, 3, false)}
                </span>
            ),
        }))