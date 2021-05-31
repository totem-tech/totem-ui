import React from 'react'
import { Checkbox, Button } from 'semantic-ui-react'
import { textEllipsis } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import { ButtonGroup, UserID } from '../../components/buttons'
import Tags from '../../components/Tags'
// services
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { useRxSubject } from '../../services/react'
import IdentityRequestForm from '../identity/IdentityRequestForm'
import { getAddressName, remove, rxPartners, setPublic, visibilityTypes } from './partner'
import CompanyForm from './CompanyForm'
import PartnerForm from './PartnerForm'

const textsCap = translated({
    add: 'add',
    business: 'business',
    chat: 'chat',
    delete: 'delete',
    edit: 'edit',
    personal: 'personal',
    public: 'public',
    request: 'request',
    tags: 'tags',
    update: 'update',
    usage: 'usage',
    columnPublicTitle1: 'a public company cannot be changed to private.',
    columnPublicTitle2: 'click to add a company with this identity to the public database',
    partnerName: 'partner name',
    removePartner: 'remove partner',
    usedBy: 'used by',
}, true)[1]

export default function PartnerList(props = {}) {
    const [data] = useRxSubject(rxPartners, map => Array.from(map)
        .map(([_, partnerOrg]) => {
            const partner = { ...partnerOrg } // prevents unwanted data being writen to storage when caching is enabled
            const { associatedIdentity, address, name, tags = [], type, userId } = partner
            partner._address = textEllipsis(address, 15, 3)
            partner._associatedIdentity = associatedIdentity && getAddressName(associatedIdentity)
            partner._name = (
                <div style={{ margin: !userId ? 0 : '-10px 0' }}>
                    {textEllipsis(name, 25, 3, false)}
                    <UserID {...{
                        address,
                        El: 'div',
                        style: {
                            color: 'grey',
                            fontSize: '80%',
                            marginTop: -15,
                            paddingTop: 15,
                        },
                        userId,
                    }} />
                </div>
            )
            partner._tags = <Tags tags={tags} />
            // makes tags searchable
            partner._tagsStr = tags.join(' ')
            partner._type = type === 'personal' ? textsCap.personal : textsCap.business
            return partner
        })
    )
    
    return <DataTable {...{ ...props, ...tableProps, data}} />
}

const tableProps = Object.freeze({
    columns: [
        {
            key: '_name',
            sortKey: 'name',
            title: textsCap.partnerName,
        },
        { key: '_associatedIdentity', title: textsCap.usedBy, style: { maxWidth: 200 } },
        {
            key: '_tags',
            draggable: false, // individual tags are draggable
            sortKey: 'tags',
            title: textsCap.tags
        },
        { collapsing: true, key: '_type', title: textsCap.usage },
        {
            collapsing: true,
            content: getActions,
            draggable: false,
            title: textsCap.edit,
        },
        {
            content: getVisibilityContent,
            collapsing: true,
            textAlign: 'center',
            title: textsCap.public,
        },
    ],
    defaultSort: 'name',
    emptyMessage: null,
    searchExtraKeys: [
        'address',
        'associatedIdentity',
        'name',
        'visibility',
        '_tagsStr',
        '_type',
        'userId',
    ],
    searchable: true,
    topLeftMenu: [{
        El: ButtonGroup,
        buttons: [
            { content: textsCap.add, icon: 'plus' },
            { content: textsCap.request },
        ],
        onAction: (_, addPartner) => showForm(addPartner
            ? PartnerForm
            : IdentityRequestForm
        ),
        or: true,
        values: [true, false],
    }],
})

function getActions(partner = {}) {
    const { address, name } = partner
    const updatePartnerCb = onSubmit => () => showForm(
        PartnerForm,
        {
            // auto save updates
            autoSave: true,
            onSubmit,
            size: 'tiny',
            values: partner,
        }
    )
    return [
        {
            icon: 'pencil',
            onClick: updatePartnerCb(),
            title: textsCap.update,
        },
        {
            icon: 'trash',
            onClick: () => confirm({
                confirmButton: <Button negative content={textsCap.delete} />,
                content: <p>{textsCap.partnerName}: <b>{name}</b></p>,
                header: `${textsCap.removePartner}?`,
                onConfirm: () => remove(address),
                size: 'mini',
            }),
            title: textsCap.delete,
        },
    ].filter(Boolean).map(props => <Button key={props.title} {...props} />)
}

function getVisibilityContent(partner = {}) {
    const { address, name, visibility } = partner
    const isPublic = visibility === visibilityTypes.PUBLIC
    return (
        <div title={isPublic ? textsCap.columnPublicTitle1 : textsCap.columnPublicTitle2}>
            <Checkbox
                checked={isPublic}
                toggle
                onChange={(_, { checked }) => checked && showForm(CompanyForm, {
                    values: { name, identity: address },
                    onSubmit: (e, v, success) => success && setPublic(address),
                })}
            />
        </div>
    )
}