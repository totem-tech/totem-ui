import React from 'react'
import { Button, Label } from 'semantic-ui-react'
import { format } from '../../utils/time'
import Balance from '../../components/Balance'
import DataTable from '../../components/DataTable'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import IdentityShareForm from './IdentityShareForm'
import IdentityForm from './IdentityForm'
import IdentityDetailsForm from './IdentityDetailsForm'
import { rxIdentities } from './identity'
import { useRxSubject } from '../../services/react'

const textsCap = translated({
    actions: 'actions',
    business: 'business',
    create: 'create',
    name: 'name',
    never: 'never',
    personal: 'personal',
    tags: 'tags',
    usage: 'usage',
    emptyMessage: 'no matching identity found', // assumes there will always be an itentity
    lastBackup: 'last backup',
    showDetails: 'show details',
    shareIdentityDetails: 'share your identity with other Totem users',
    txAllocations: 'transaction balance',
    updateIdentity: 'update your identity',
}, true)[1]


export default function IdentityList(props) {
    const [identities] = useRxSubject(rxIdentities, map => Array.from(map).map(([_, identityOrg]) => {
        const identity = { ...identityOrg }
        const { fileBackupTS, tags = [], usageType } = identity
        identity._fileBackupTS = format(fileBackupTS) || textsCap.never
        identity._tagsStr = tags.join(' ')
        identity._tags = tags.map(tag => (
            <Label {...{
                content: tag,
                key: tag,
                onDragStart: e => e.stopPropagation() | e.dataTransfer.setData("Text", e.target.textContent),
                draggable: 'true',
                style: {
                    cursor: 'grab',
                    display: 'inline',
                    float: 'left',
                    margin: 1,
                }
            }} />
        ))
        identity._usageType = usageType === 'personal' ? textsCap.personal : textsCap.business
        return identity
    }))

    const tableProps = {
        columns: [
            { key: 'name', title: textsCap.name },
            {
                collapsing: true,
                content: ({ address }) => <Balance address={address} lockSeparator={<br />} />,
                draggable: false,
                // key: '_balance',
                textAlign: 'center',
                title: textsCap.txAllocations,
            },
            {
                key: '_tags',
                draggable: false, // individual tags are draggable
                title: textsCap.tags
            },
            {
                key: '_fileBackupTS',
                textAlign: 'center',
                title: textsCap.lastBackup
            },
            { collapsing: true, key: '_usageType', title: textsCap.usage },
            {
                collapsing: true,
                content: ({ address, name }) => ([
                    {
                        icon: 'share',
                        onClick: () => showForm(IdentityShareForm, {
                            inputsDisabled: ['address'],
                            includeOwnIdentities: true,
                            includePartners: false,
                            size: 'tiny',
                            values: { address: address, name: name },
                        }),
                        title: textsCap.shareIdentityDetails,
                    },
                    {
                        icon: 'pencil',
                        onClick: () => showForm(IdentityDetailsForm, { values: { address } }),
                        title: textsCap.showDetails,
                    },
                ].map(props => <Button {...props} key={props.title} />)),
                draggable: false,
                title: textsCap.actions
            }
        ],
        data: identities,
        emptyMessage: { content: textsCap.emptyMessage },
        searchExtraKeys: ['address', '_tagsStr'],
        topLeftMenu: [{
            content: textsCap.create,
            icon: 'plus',
            onClick: () => showForm(IdentityForm)
        }]
    }

    return <DataTable {...{ ...props, ...tableProps }} />
}