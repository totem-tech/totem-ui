import React from 'react'
import { translated } from '../../utils/languageHelper'
import { RxSubjectView } from '../../utils/reactjs'
import {
    arrSort,
    isObj,
    textEllipsis
} from '../../utils/utils'
import Balance from './Balance'
import { rxIdentities, rxSelected } from './identity'
import IdentityIcon from './IdentityIcon'

const textsCap = {
    identity: 'identity',
    selected: 'selected identity',
}
translated(textsCap, true)
/**
 * @name    getIdentityOptions
 * @summary constructs a list of Dropdown options using identities
 * 
 * @param   {Map}       identities
 * @param   {Object}    formProps props to be supplied when  editing the identity
 * 
 * @returns {Array}
 */
export const getIdentityOptions = (
    identities = rxIdentities.value,
    formProps,
) => arrSort([...identities.values()], 'name')
    .map(({
        address,
        name,
        usageType
    }) => ({
        description: <Balance {...{ address, showDetailed: null }} />,
        key: address,
        keywords: [
            name,
            address,
            usageType,
            'identity',
            textsCap.identity,
        ].join(' '),
        name, // used for sorting
        value: address,
        text: (
            <RxSubjectView {...{
                key: address,
                subject: rxSelected,
                valueModifier: selected => (
                    <span title={selected === address && textsCap.selected || ''}>
                        <IdentityIcon {...{
                            address,
                            color: selected === address
                                ? 'orange'
                                : 'grey',
                            formProps: isObj(formProps) && formProps || {},
                            key: address,
                            usageType,
                        }} />
                        {' ' + textEllipsis(name, 25, 3, false)}
                    </span>
                )
            }} />

        ),
    }))