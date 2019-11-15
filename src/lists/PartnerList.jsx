import React from 'react'
import { Checkbox, Button, Label } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { textEllipsis } from '../utils/utils'
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
					{ collapsing: true, key: 'type', title: 'Type' },
					{ key: '_name', title: 'Name' },
					{ collapsing: true, key: '_address', title: 'Address' },
					{
						content: ({ address, isPublic }) => (
							<div
								title={isPublic ? 'Public company cannot be changed to private.' :
									'Click to add a public company with this identity'}
							>
								<Checkbox
									checked={isPublic}
									toggle
									onChange={(_, { checked }) => checked && showForm(CompanyForm, {
										walletAddress: address,
										onSubmit: (e, v, success) => success && addressbook.setPublic(address),
										size: 'tiny',
									})}
								/>
							</div>
						),
						collapsing: true,
						textAlign: 'center',
						title: 'Public'
					},
					{ key: '_tags', title: 'Tags' },
					{ key: '_associatedIdentity', title: 'Associated With', style: { maxWidth: 200 } },
					{
						collapsing: true,
						title: 'Actions',
						content: (partner, index) => {
							const { address, name } = partner
							return (
								<React.Fragment>
									<Button
										icon='share'
										onClick={() => showForm(IdentityShareForm, {
											disabledFields: ['address'],
											header: 'Share Partner Identity',
											includeOwnIdentities: false,
											includePartners: true,
											size: 'tiny',
											values: { address, name },
										})}
										title='Share partner'
									/>
									<Button
										icon='pencil'
										onClick={() => showForm(PartnerForm, { index, values: partner, size: 'tiny' })}
										title='Update partner'
									/>
									<Button
										icon='close'
										onClick={() => confirm({
											confirmButton: <Button negative content="Delete" />,
											content: <p>Partner name: <b>{name}</b></p>,
											header: 'Delete partner?',
											onConfirm: () => addressbook.remove(address),
											size: 'mini',
										})}
										title="Delete partner"
									/>
								</React.Fragment>
							)
						},
					}
				],
				data: new Map(),
				defaultSort: 'name',
				emptyMessage: {},
				searchExtraKeys: ['_public', '_tagsStr'],
				searchable: true,
				topLeftMenu: [
					{
						active: false,
						content: 'Add',
						icon: 'plus',
						name: 'create',
						onClick: () => showForm(PartnerForm, { size: 'tiny' })
					},
					{
						active: false,
						content: 'Request',
						icon: 'user plus',
						name: 'create',
						onClick: () => showForm(IdentityRequestForm, { size: 'tiny' }),
						title: 'Request identity from other users',
					}
				],
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

	getPartners() {
		const { listProps } = this.state
		listProps.data = addressbook.getAll()

		Array.from(listProps.data).forEach(([_, p]) => {
			const { associatedIdentity, address, name, isPublic, tags } = p
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
			// makes public/private text searchable
			p._public = isPublic ? 'public' : 'private'
		})
		this.setState({ listProps })
	}

	render() {
		return <ListFactory {...this.state.listProps} />
	}
}