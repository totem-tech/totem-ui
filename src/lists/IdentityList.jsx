import React from 'react'
import { Button, Label } from 'semantic-ui-react'
import { format } from '../utils/time'
// components
import Balance from '../components/Balance'
import DataTable from '../components/DataTable'
// forms
import IdentityShareForm from '../forms/IdentityShare'
import IdentityForm from '../forms/Identity'
import IdentityDetailsForm from '../forms/IdentityDetails'
// services
import { useIdentities } from '../services/identity'
import { translated } from '../services/language'
import { showForm } from '../services/modal'

const wordsCap = translated({
    actions: 'actions',
    business: 'business',
    create: 'create',
    name: 'name',
    never: 'never',
    personal: 'personal',
    tags: 'tags',
    usage: 'usage',
}, true)[1]
const [texts] = translated({
    emptyMessage: 'No matching identity found', // assumes there will always be an itentity
    lastBackup: 'Last Backup',
    showDetails: 'Show details',
    shareIdentityDetails: 'Share your identity with other Totem users',
    txAllocations: 'Transaction Balance',
    updateIdentity: 'Update your identity',
})

export default function IdentityList(props) {
    const [identities] = useIdentities()
    identities.forEach(identity => {
        const { fileBackupTS, tags = [], usageType } = identity
        identity._fileBackupTS = format(fileBackupTS) || wordsCap.never
        identity._tagsStr = tags.join(' ')
        identity._tags = tags.map(tag => (
            <Label
                key={tag}
                draggable='true'
                onDragStart={e => e.stopPropagation() | e.dataTransfer.setData("Text", e.target.textContent)}
                style={{
                    cursor: 'grab',
                    display: 'inline',
                    float: 'left',
                    margin: 1,
                }}
            >
                {tag}
            </Label>
        ))
        identity._usageType = usageType === 'personal' ? wordsCap.personal : wordsCap.business
    })

    const tableProps = {
        columns: [
            { key: 'name', title: wordsCap.name },
            { collapsing: true, key: '_usageType', title: wordsCap.usage },
            {
                key: '_tags',
                draggable: false, // individual tags are draggable
                title: wordsCap.tags
            },
            {
                key: '_fileBackupTS',
                textAlign: 'center',
                title: texts.lastBackup
            },
            {
                collapsing: true,
                content: ({ address }) => <Balance address={address} />,
                draggable: false,
                key: '_balance',
                textAlign: 'center',
                title: texts.txAllocations,
            },
            {
                collapsing: true,
                content: identity => (
                    [
                        {
                            icon: 'share',
                            onClick: () => showForm(IdentityShareForm, {
                                inputsDisabled: ['address'],
                                includeOwnIdentities: true,
                                includePartners: false,
                                size: 'tiny',
                                values: {
                                    address: identity.address,
                                    name: identity.name,
                                },
                            }),
                            title: texts.shareIdentityDetails,
                        },
                        {
                            icon: 'eye',
                            onClick: () => showForm(IdentityDetailsForm, { values: identity }),
                            title: texts.showDetails,
                        },
                        {
                            icon: 'pencil',
                            onClick: () => showForm(IdentityForm, { values: identity }),
                            title: texts.updateIdentity,
                        },
                    ].map(props => <Button {...props} key={props.title} />)
                ),
                draggable: false,
                title: wordsCap.actions
            }
        ],
        data: identities,
        emptyMessage: {
            content: texts.emptyMessage
        },
        searchExtraKeys: ['address', '_tagsStr'],
        topLeftMenu: [
            {
                content: wordsCap.create,
                icon: 'plus',
                onClick: () => showForm(IdentityForm)
            }
        ]
    }

    return <DataTable {...{ ...props, ...tableProps }} />
}