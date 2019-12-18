import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Checkbox, Button, Label } from 'semantic-ui-react'
import { textEllipsis } from '../utils/utils'
import ListFactory from '../components/ListFactory'
import { getAddressName } from '../components/ProjectDropdown'
import { confirm, showForm } from '../services/modal'
import addressbook from '../services/partners'
import { layoutBond } from '../services/window'
import CompanyForm from '../forms/Company'
import IdentityRequestForm from '../forms/IdentityRequest'
import IdentityShareForm from '../forms/IdentityShare'
import PartnerForm from '../forms/Partner'
import IntroduceUserForm from '../forms/IntroduceUser'

export default class PartnerList extends ReactiveComponent {
	constructor(props) {
		super(props, { layout: layoutBond })

		this.state = {
			listProps: {
				columns: [
					{ key: '_name', title: 'Partner Name' },
					{ collapsing: true, key: 'type', title: 'Usage' },
					{ key: '_associatedIdentity', title: 'Used by', style: { maxWidth: 200 } },
					{ key: '_tags', title: 'Tags' },
					{
						content: ({ address, isPublic }) => (
							<div
								title={isPublic ? 'A public company cannot be changed to private.' :
									'Click to add a company with this identity to the public database'}
							>
								<Checkbox
									checked={isPublic}
									toggle
									onChange={(_, { checked }) => checked && showForm(CompanyForm, {
										header: 'Make Partner Public',
										subheader: 'Warning: doing this makes this partner visible to all Totem users',
										values: { walletAddress: address },
										onSubmit: (e, v, success) => success && addressbook.setPublic(address),
										size: 'mini',
									})}
								/>
							</div>
						),
						collapsing: true,
						textAlign: 'center',
						title: 'Public'
					},
					{
						collapsing: true,
						title: 'Edit',
						content: this.getActions.bind(this),
					}
				],
				data: new Map(),
				defaultSort: 'name',
				emptyMessage: {},
				searchExtraKeys: ['_associatedIdentity', '_tagsStr', 'address', 'name', 'visibility'],
				searchable: true,
				topLeftMenu: [],
				type: 'DataTable'
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
							content: 'Selected partner does not include an User ID. Would you like to update partner?',
							header: 'Partner User ID required',
							onConfirm: updatePartner,
							size: 'tiny',
						})
						showForm(IntroduceUserForm, { values: { userId } })
					}}
					title='Introduce user'
				/>
				<Button
					icon='pencil'
					onClick={updatePartner}
					title='Update'
				/>
				<Button
					icon='trash'
					onClick={() => confirm({
						confirmButton: <Button negative content="Remove" />,
						content: <p>Partner name: <b>{name}</b></p>,
						header: 'Remove Partner?',
						onConfirm: () => addressbook.remove(address),
						size: 'mini',
					})}
					title="Delete"
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
		listProps.topLeftMenu = [
			(
				<Button.Group fluid={isMobile} key='0'>
					<Button icon='plus' content='Add' onClick={() => showForm(PartnerForm)} />
					<Button.Or />
					<Button content='Request' onClick={() => showForm(IdentityRequestForm)} />
				</Button.Group>
			)
		]
		return <ListFactory {...listProps} />
	}
}