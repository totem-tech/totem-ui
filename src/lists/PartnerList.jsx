import React, { Component } from 'react'
import { Checkbox, Button, Label } from 'semantic-ui-react'
import { textEllipsis } from '../utils/utils'
import DataTable from '../components/DataTable'
// services
import { createInbox } from '../modules/chat/chat'
import { translated } from '../services/language'
import { confirm, showForm } from '../services/modal'
import addressbook, { getAddressName } from '../services/partner'
import { layoutBond } from '../services/window'
// forms
import CompanyForm from '../forms/Company'
import IdentityRequestForm from '../forms/IdentityRequest'
import PartnerForm from '../forms/Partner'
import IntroduceUserForm from '../forms/IntroduceUser'
import { getUser } from '../services/chatClient'

const [_, textsCap] = translated({
	add: 'add',
	chat: 'chat',
	delete: 'delete',
	edit: 'edit',
	public: 'public',
	request: 'request',
	tags: 'tags',
	update: 'update',
	usage: 'usage',
	introducePartner: 'introduce a partner',
	columnPublicTitle1: 'a public company cannot be changed to private.',
	columnPublicTitle2: 'click to add a company with this identity to the public database',
	noUserIdConfirmHeader: 'partner User ID required',
	noUserIdConfirmMsg: 'selected Partner does not include a User ID. Would you like to update the Partner record?',
	partnerName: 'partner name',
	removePartner: 'remove partner',
	usedBy: 'used by',
}, true)

export default class PartnerList extends Component {
	constructor(props) {
		super(props)

		this.state = {
			listProps: {
				columns: [
					{ key: '_name', title: textsCap.partnerName },
					{ collapsing: true, key: 'type', title: textsCap.usage },
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
				searchExtraKeys: ['associatedIdentity', '_tagsStr', 'address', 'name', 'visibility'],
				searchable: true,
				topLeftMenu: [],
			}
		}
	}

	componentWillMount() {
		this.tieId = addressbook.bond.tie(() => this.getPartners())
		this.tieIdLayout = layoutBond.tie(layout => this.setState({ layout }))
	}

	componentWillUnmount = () => {
		addressbook.bond.untie(this.tieId)
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
						content: textsCap.partnerNoUserIdConfirmMsg,
						header: textsCap.partnerNoUserIdConfirmHeader,
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

	getPartners() {
		const { listProps } = this.state
		listProps.data = addressbook.getAll()

		Array.from(listProps.data).forEach(([_, p]) => {
			const { associatedIdentity, address, name, tags } = p
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
		})
		this.setState({ listProps })
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