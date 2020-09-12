import React, { Component } from 'react'
import { Checkbox, Button, Label } from 'semantic-ui-react'
import { textEllipsis } from '../utils/utils'
import DataTable from '../components/DataTable'
// services
import { createInbox } from '../modules/chat/chat'
import { translated } from '../services/language'
import { confirm, showForm } from '../services/modal'
import addressbook, { getAddressName, rxPartners } from '../services/partner'
import { layoutBond } from '../services/window'
// forms
import CompanyForm from '../forms/Company'
import IdentityRequestForm from '../forms/IdentityRequest'
import PartnerForm from '../forms/Partner'
import IntroduceUserForm from '../forms/IntroduceUser'
import { getUser } from '../services/chatClient'

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
	introducePartner: 'introduce a partner',
	columnPublicTitle1: 'a public company cannot be changed to private.',
	columnPublicTitle2: 'click to add a company with this identity to the public database',
	noUserIdConfirmHeader: 'partner User ID Required',
	noUserIdConfirmMsg: 'selected Partner does not include a User ID. In order to introduce partner a user ID is required. Would you like to update the partner?',
	partnerName: 'partner name',
	removePartner: 'remove partner',
	usedBy: 'used by',
}, true)[1]

export default class PartnerList extends Component {
	constructor(props) {
		super(props)

		this.state = {
			listProps: {
				columns: [
					{ key: '_name', title: textsCap.partnerName },
					{ collapsing: true, key: '_type', title: textsCap.usage },
					{ key: '_associatedIdentity', title: textsCap.usedBy, style: { maxWidth: 200 } },
					{
						key: '_tags',
						draggable: false, // individual tags are draggable
						title: textsCap.tags
					},
					{
						content: ({ address, name, isPublic }) => (
							<div title={isPublic ? textsCap.columnPublicTitle1 : textsCap.columnPublicTitle2}>
								<Checkbox
									checked={isPublic}
									toggle
									onChange={(_, { checked }) => checked && showForm(CompanyForm, {
										values: { name, identity: address },
										onSubmit: (e, v, success) => success && addressbook.setPublic(address),
									})}
								/>
							</div>
						),
						collapsing: true,
						textAlign: 'center',
						title: textsCap.public,
					},
					{
						collapsing: true,
						content: this.getActions,
						draggable: false,
						title: textsCap.edit,
					},
				],
				data: new Map(),
				defaultSort: 'name',
				emptyMessage: null,
				searchExtraKeys: ['address', 'associatedIdentity', 'name', 'visibility', '_tagsStr', '_type'],
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

		this.subscriptions.partners = rxPartners.subscribe(map => {
			const { listProps } = this.state
			listProps.data = map

			Array.from(listProps.data).forEach(([_, p]) => {
				const { associatedIdentity, address, name, tags, type } = p
				p._address = textEllipsis(address, 15, 3)
				p._associatedIdentity = associatedIdentity && getAddressName(associatedIdentity)
				p._name = textEllipsis(name, 25, 3, false)
				p._tags = (tags || []).map(tag => (
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
				// makes tags searchable
				p._tagsStr = tags.join(' ')
				p._type = type === 'personal' ? textsCap.personal : textsCap.business
			})
			this.setState({ listProps })
		})
		this.tieIdLayout = layoutBond.tie(layout => this.setState({ layout }))
	}

	componentWillUnmount = () => {
		this._mounted = false
		layoutBond.untie(this.tieIdLayout)
	}

	getActions = partner => {
		const { address, name, userId } = partner
		const { id: ownId } = getUser() || {}
		const updatePartnerCb = onSubmit => () => showForm(PartnerForm, {
			onSubmit,
			size: 'tiny',
			values: partner,
		})
		return [
			{
				icon: 'handshake',
				onClick: () => {
					const introduce = userId => showForm(IntroduceUserForm, { values: { userId } })
					if (!!userId) return introduce(userId)

					confirm({
						content: textsCap.noUserIdConfirmMsg,
						header: textsCap.noUserIdConfirmHeader,
						onConfirm: updatePartnerCb((success, { userId }) => success && userId && introduce(userId)),
						size: 'tiny',
					})
				},
				title: textsCap.introducePartner
			},
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
					onConfirm: () => addressbook.remove(address),
					size: 'mini',
				}),
				title: textsCap.delete,
			},
			{
				disabled: !userId || userId === ownId,
				icon: 'chat',
				onClick: () => createInbox([userId], null, true),
				title: textsCap.chat,
			},
		].filter(Boolean).map(props => <Button key={props.title} {...props} />)
	}

	render() {
		const { layout, listProps } = this.state
		const isMobile = layout === 'mobile'
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