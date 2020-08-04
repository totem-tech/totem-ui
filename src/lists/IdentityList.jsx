import React, { Component } from 'react'
import { Button, Label } from 'semantic-ui-react'
import { format } from '../utils/time'
// components
import Currency from '../components/Currency'
import DataTable from '../components/DataTable'
// forms
import IdentityShareForm from '../forms/IdentityShare'
import IdentityForm from '../forms/Identity'
import IdentityDetailsForm from '../forms/IdentityDetails'
// services
import identityService from '../services/identity'
import { translated } from '../services/language'
import { showForm } from '../services/modal'

const [words, wordsCap] = translated({
    actions: 'actions',
    create: 'create',
    name: 'name',
    never: 'never',
    personal: 'personal',
    tags: 'tags',
    usage: 'usage',
}, true)
const [texts] = translated({
    emptyMessage: 'Error: No matching identity found', // assumes there will always be an itentity
    lastBackup: 'Last Backup',
    showDetails: 'Show details',
    shareIdentityDetails: 'Share your identity with other Totem users',
    txAllocations: 'Transaction Balance',
    updateIdentity: 'Update your identity',
})

export default class IdentityList extends Component {
    constructor(props) {
        super(props)

        this.state = {
            columns: [
                { key: 'name', title: wordsCap.name },
                {
                    key: 'usageType',
                    title: wordsCap.usage
                },
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
                    content: ({ address }) => <Currency address={address} />,
                    draggable: false,
                    textAlign: 'center',
                    title: texts.txAllocations,
                },
                {
                    collapsing: true,
                    content: this.getActions,
                    draggable: false,
                    title: wordsCap.actions
                }
            ],
            data: [],
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
    }

    componentWillMount() {
        this.tieId = identityService.bond.tie(() => {
            const data = identityService.getAll()
            this.allBackupDone = data.reduce((done, { cloudBackupTS }) => !done ? false : !!cloudBackupTS, true)
            data.forEach(identity => {
                identity._fileBackupTS = format(identity.fileBackupTS) || words.never
                identity.usageType = identity.usageType || words.personal
                identity._tagsStr = (identity.tags || []).join(' ')
                identity._tags = (identity.tags || []).map(tag => (
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
            })
            this.setState({ data })
        })
    }

    componentWillUnmount = () => identityService.bond.untie(this.tieId)

    getActions = identity => {
        const { address, name } = identity
        return (
            <React.Fragment>
                <Button
                    icon='share'
                    onClick={() => showForm(IdentityShareForm, {
                        inputsDisabled: ['address'],
                        includeOwnIdentities: true,
                        includePartners: false,
                        size: 'tiny',
                        values: { address, name },
                    })}
                    title={texts.shareIdentityDetails}
                />
                <Button
                    icon='eye'
                    onClick={() => showForm(IdentityDetailsForm, { values: identity })}
                    title={texts.showDetails}
                />
                <Button
                    icon='pencil'
                    onClick={() => showForm(IdentityForm, { values: identity })}
                    title={texts.updateIdentity}
                />
            </React.Fragment>
        )
    }

    render() {
        return <DataTable {...{ ...this.props, ...this.state }} />
    }
}