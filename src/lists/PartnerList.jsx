import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Checkbox, Button, Label } from 'semantic-ui-react'
// import { ButtonAcceptOrReject } from '../components/buttons'
import { textEllipsis, IfMobile } from '../utils/utils'
import { confirm, showForm } from '../services/modal'
import ListFactory from '../components/ListFactory'
import addressbook from '../services/partners'
import PartnerForm from '../forms/Partner'
import CompanyForm from '../forms/Company'
import IdentityRequestForm from '../forms/IdentityRequest'
import IdentityShareForm from '../forms/IdentityShare'
import { getAddressName } from '../components/ProjectDropdown'

export default class PartnerList extends ReactiveComponent {
	constructor(props) {
		super(props)

		this.state = {
			listProps: {
				columns: [
					{ key: '_name', title: 'Partner Name' },
					{ collapsing: true, key: 'type', title: 'Usage' },
					{ key: '_associatedIdentity', title: 'Used by', style: { maxWidth: 200 } },
					{ key: '_tags', title: 'Tags' },
					// { collapsing: true, key: '_address', title: 'Address' },
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
		this.tieId = addressbook.getBond().tie(() => this.getPartners())
	}

	componentWillUnmount() {
		addressbook.getBond().untie(this.tieId)
	}

	getActions(partner) {
		const { address, name } = partner
		return (
			<React.Fragment>
				<Button
					icon='share'
					onClick={() => showForm(IdentityShareForm, {
						disabledFields: ['address'],
						header: 'Share Partner Identity',
						subheader: 'Share a Partner with one or more Totem users',
						includeOwnIdentities: false,
						includePartners: true,
						size: 'tiny',
						values: { address, name },
					})}
					title='Share'
				/>
				<Button
					icon='pencil'
					onClick={() => showForm(PartnerForm, { values: partner, size: 'tiny' })}
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

	getContent(mobile) {
		const { listProps } = this.state
		listProps.topLeftMenu = [
			(
				<Button.Group fluid={mobile} key='0'>
					<Button icon='plus' content='Add' onClick={() => showForm(PartnerForm)} />
					<Button.Or />
					<Button content='Request' onClick={() => showForm(IdentityRequestForm)} />
				</Button.Group>
			)
		]
		return <ListFactory {...listProps} />
	}

	render() {

		return <IfMobile then={() => this.getContent(true)} else={() => this.getContent(false)} />
	}
}