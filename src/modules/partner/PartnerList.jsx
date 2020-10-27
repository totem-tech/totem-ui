import React, { Component } from 'react'
import { Checkbox, Button, Label } from 'semantic-ui-react'
import { textEllipsis } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import { UserID } from '../../components/buttons'
// services
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { unsubscribe } from '../../services/react'
import { rxLayout, MOBILE } from '../../services/window'
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

export default class PartnerList extends Component {
    constructor(props) {
        super(props)

        this.state = {
            isMobile: false,
            listProps: {
                columns: [
                    { key: '_name', title: textsCap.partnerName },
                    { key: '_associatedIdentity', title: textsCap.usedBy, style: { maxWidth: 200 } },
                    {
                        key: '_tags',
                        draggable: false, // individual tags are draggable
                        title: textsCap.tags
                    },
                    { collapsing: true, key: '_type', title: textsCap.usage },
                    {
                        collapsing: true,
                        content: this.getActions,
                        draggable: false,
                        title: textsCap.edit,
                    },
                    {
                        content: ({ address, name, visibility }) => {
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
                        },
                        collapsing: true,
                        textAlign: 'center',
                        title: textsCap.public,
                    },
                ],
                data: new Map(),
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
                topLeftMenu: [],
            }
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        this.subscriptions = {}
        this.subscriptions.layout = rxLayout.subscribe(layout => this.setState({ isMobile: layout === MOBILE }))
        this.subscriptions.partners = rxPartners.subscribe(map => {
            const { listProps } = this.state
            const partners = Array.from(map).map(([_, partnerOrg]) => {
                const partner = { ...partnerOrg }
                const { associatedIdentity, address, name, tags, type, userId } = partner
                partner._address = textEllipsis(address, 15, 3)
                partner._associatedIdentity = associatedIdentity && getAddressName(associatedIdentity)
                partner._name = (
                    <div style={{ margin: !userId ? 0 : '-10px 0' }}>
                        {textEllipsis(name, 25, 3, false)}
                        <UserID {...{
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
                partner._tags = (tags || []).map(tag => (
                    <Label
                        content={tag}
                        key={tag}
                        draggable='true'
                        onDragStart={e => e.stopPropagation() | e.dataTransfer.setData("Text", e.target.textContent)}
                        style={{
                            cursor: 'grab',
                            display: 'inline',
                            float: 'left',
                            margin: 1,
                        }}
                    />
                ))
                // makes tags searchable
                partner._tagsStr = tags.join(' ')
                partner._type = type === 'personal' ? textsCap.personal : textsCap.business
                return partner
            })

            listProps.data = partners
            this.setState({ listProps })
        })
    }

    componentWillUnmount = () => {
        this._mounted = false
        unsubscribe(this.subscriptions)
    }

    getActions = partner => {
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

    render() {
        const { isMobile, listProps } = this.state
        listProps.topLeftMenu = [(
            <Button.Group fluid={isMobile} key='0'>
                <Button
                    icon='plus'
                    content={textsCap.add}
                    onClick={() => showForm(PartnerForm)}
                />
                <Button.Or />
                <Button
                    content={textsCap.request}
                    onClick={() => showForm(IdentityRequestForm)}
                />
            </Button.Group>
        )]
        return <DataTable {...listProps} />
    }
}