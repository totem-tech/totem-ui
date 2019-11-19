import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Button } from 'semantic-ui-react'
import { DataTable } from '../components/ListFactory'
import identityService, { getBond } from '../services/identity'
import { confirm, showForm } from '../services/modal'
import { formatStrTimestamp } from '../utils/time'
import IdentityShareForm from '../forms/IdentityShare'
import IdentityForm from '../forms/Wallet'

const toBeImplemented = () => alert('To be implemented')
const words = {
    actions: 'actions',
    create: 'create',
    name: 'name',
    never: 'never',
    personal: 'personal',
    tags: 'tags',
    usage: 'usage',
}
const wordsCapitalized = Object.keys(words).reduce((obj, key) => {
    obj[key] = words[key][0].toUpperCase() + words[key].slice(1)
    return obj
}, {})
const texts = {
    emptyMessage: 'No matching identity found', // assumes there will always be an itentity
    identityName: 'Identity name',
    lastBackup: 'Last Backup',
    removeIdentity: 'Remove identity',
    removePermanently: 'Remove permanently',
    removeWarningPart1: 'You are about to remove the following identity.',
    removeWarningPart2: `This actions is irreversible. You will lose access to any activity/data related to this project.`,
    shareIdentity: 'Share identity',
    shareIdentityDetails: 'Share your identity with other Totem users',
    updateIdentity: 'Update identity',
}

export default class ItentityList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            columns: [
                { key: 'name', title: wordsCapitalized.name },
                {
                    key: 'usageType',
                    title: wordsCapitalized.usage
                },
                { key: '_tags', title: wordsCapitalized.tags },
                {
                    key: '_cloudBackupTS',
                    textAlign: 'center',
                    title: texts.lastBackup
                },
                {
                    collapsing: true,
                    content: this.getActions.bind(this),
                    title: wordsCapitalized.actions
                }
            ],
            data: [],
            emptyMessage: {
                content: texts.emptyMessage
            },
            topLeftMenu: [
                {
                    content: wordsCapitalized.create,
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
                identity._cloudBackupTS = formatStrTimestamp(identity.cloudBackupTS) || words.never
                identity.usageType = identity.usageType || words.personal
                identity.tags = (identity.tags || []).map(tag => (
                    <Label key={tag} style={{ margin: 1, float: 'left', display: 'inline' }}>
                        {tag}
                    </Label>
                ))
            })
            this.setState({ data })
        })
    }

    getActions(identity) {
        const { address, name } = identity
        return (
            <React.Fragment>
                <Button
                    icon='share'
                    onClick={() => showForm(IdentityShareForm, {
                        disabledFields: ['address'],
                        header: texts.shareIdentity,
                        subheader: texts.shareIdentityDetails,
                        includeOwnIdentities: true,
                        includePartners: false,
                        size: 'tiny',
                        values: { address, name },
                    })}
                    title={texts.shareIdentityDetails}
                />
                <Button
                    icon='pencil'
                    onClick={toBeImplemented} //{() => showForm(WalletUpdate, { wallet: identity, size: 'tiny' })}
                    title={texts.updateIdentity}
                />
                <Button
                    icon='close'
                    onClick={() => confirm({
                        confirmButton: <Button negative content={texts.removePermanently} />,
                        content: [
                            <p key='0'>{texts.removeWarningPart1} <b>{texts.removeWarningPart2}</b></p>,
                            <p key='1'>{texts.identityName}: <b>{name}</b></p>
                        ],
                        header: texts.removeIdentity,
                        onConfirm: () => identityService.remove(address),
                        size: 'mini',
                    })}
                    title={texts.removeIdentity}
                />
            </React.Fragment>
        )
    }

    render() {
        return <DataTable {...{ ...this.props, ...this.state }} />
    }
}