import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Checkbox, Button, Label } from 'semantic-ui-react'
import { textEllipsis, textCapitalize } from '../utils/utils'
import DataTable from '../components/DataTable'
import { getAddressName } from '../components/ProjectDropdown'
import { confirm, showForm } from '../services/modal'
import addressbook from '../services/partners'
import { layoutBond } from '../services/window'
import CompanyForm from '../forms/Company'
import IdentityRequestForm from '../forms/IdentityRequest'
import PartnerForm from '../forms/Partner'
import IntroduceUserForm from '../forms/IntroduceUser'

const words = {
	add: 'add',
	delete: 'delete',
	edit: 'edit',
	public: 'public',
	request: 'request',
	tags: 'tags',
	update: 'update',
	usage: 'usage',
}
const wordsCap = textCapitalize(words)
const texts = {
	introducePartner: 'Introduce partner',
	columnPublicTitle1: 'A public company cannot be changed to private.',
	columnPublicTitle2: 'Click to add a company with this identity to the public database',
	partnerName: 'Partner Name',
	partnerNoUserIdConfirmHeader: 'Partner User ID required',
	partnerNoUserIdConfirmMsg: 'Selected partner does not include an User ID. Would you like to update partner?',
	removePartner: 'Remove Partner?',
	usedBy: 'Used by',
}

export default class PartnerList extends ReactiveComponent {
	constructor(props) {
		super(props, { layout: layoutBond })

		this.state = {
			listProps: {
				columns: [
					{ key: '_name', title: texts.partnerName },
					{ collapsing: true, key: 'type', title: wordsCap.usage },
					{ key: '_associatedIdentity', title: texts.usedBy, style: { maxWidth: 200 } },
					{ key: '_tags', title: wordsCap.tags },
					{
						content: ({ address, name, isPublic }) => (
							<div title={isPublic ? texts.columnPublicTitle1 : texts.columnPublicTitle2}>
								<Checkbox
									checked={isPublic}
									toggle
									onChange={(_, { checked }) => checked && showForm(CompanyForm, {
										values: { name, walletAddress: address },
										onSubmit: (e, v, success) => success && addressbook.setPublic(address),
									})}
								/>
							</div>
						),
						collapsing: true,
						textAlign: 'center',
						title: wordsCap.public,
					},
					{
						collapsing: true,
						title: wordsCap.edit,
						content: this.getActions.bind(this),
					}
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
	}

	componentWillUnmount() {
		addressbook.bond.untie(this.tieId)
	}

	getActions(partner) {
		const { address, name, userId } = partner
		const updatePartner = () => showForm(PartnerForm, { values: partner, size: 'tiny' })
		return (
			<React.Fragment>
				<Button
					icon='handshake'
					onClick={() => {
						if (!userId) return confirm({
							content: texts.partnerNoUserIdConfirmMsg,
							header: texts.partnerNoUserIdConfirmHeader,
							onConfirm: updatePartner,
							size: 'tiny',
						})
						showForm(IntroduceUserForm, { values: { userId } })
					}}
					title={texts.introducePartner}
				/>
				<Button
					icon='pencil'
					onClick={updatePartner}
					title={wordsCap.update}
				/>
				<Button
					icon='trash'
					onClick={() => confirm({
						confirmButton: <Button negative content={wordsCap.delete} />,
						content: <p>{partnerName}: <b>{name}</b></p>,
						header: texts.removePartner,
						onConfirm: () => addressbook.remove(address),
						size: 'mini',
					})}
					title={wordsCap.delete}
				/>
			</React.Fragment>
		)
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
				<Label key={tag} style={{ margin: 1, float: 'left', display: 'inline' }}>
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
					content={wordsCap.add}
					onClick={() => showForm(PartnerForm)}
				/>
				<Button.Or />
				<Button
					content={wordsCap.request}
					onClick={() => showForm(IdentityRequestForm)}
				/>
			</Button.Group>
		)]
		return <DataTable {...listProps} />
	}
}