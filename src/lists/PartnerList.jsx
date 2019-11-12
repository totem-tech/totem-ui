import React from 'react'
import { Checkbox, Button, Label } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { textEllipsis } from '../utils/utils'
import { confirm, showForm } from '../services/modal'
import ListFactory from '../components/ListFactory'
import addressbook from '../services/addressbook'
import PartnerForm from '../forms/Partner'
import CompanyForm from '../forms/Company'
import IdentityRequestForm from '../forms/IdentityRequest'
import IdentityShareForm from '../forms/IdentityShare'

export default class PartnerList extends ReactiveComponent {
	constructor() {
		super([], { partners: addressbook.getBond() })

		this.state = {
			listProps: {
				columns: [
					{ collapsing: true, key: 'type', title: 'Type' },
					{ key: '_name', title: 'Name' },
					{ collapsing: true, key: '_address', title: 'Address' },
					{
						content: (partner, index) => {
							const { address, name, isPublic } = partner
							return (
								<Checkbox
									checked={partner.isPublic}
									toggle
									onChange={(_, { checked }) => checked && showForm(CompanyForm, {
										walletAddress: address,
										onSubmit: (e, v, success) => success && addressbook.setPublic(index, true),
										size: 'tiny',
									})}
								/>
							)
						},
						collapsing: true,
						// key: '_public',
						textAlign: 'center',
						title: 'Public'
					},
					{ key: '_tags', title: 'Tags' },
					{
						collapsing: true,
						content: (partner, index) => {
							const { address, name, isPublic } = partner
							return (
								<React.Fragment>
									{/* <Button
										icon='copy'
										onClick={() => copyToClipboard(address)}
										title='Copy address'
									/> */}
									<Button
										icon='share'
										onClick={() => showForm(IdentityShareForm, {
											disabledFields: ['identity'],
											header: 'Share Partner Identity',
											includeOwnIdentities: false,
											includePartners: true,
											values: { address, name },
										})}
										title='Share partner'
									/>
									{/* <Button
										icon='world'
										onClick={() => showForm(CompanyForm, {
											walletAddress: address,
											onSubmit: (e, v, success) => success && addressbook.setPublic(index, true)
										})}
										title='Make public'
									/> */}
									<Button
										icon='pencil'
										onClick={() => showForm(PartnerForm, { index, values: partner })}
										title='Update partner'
									/>
									<Button
										icon='close'
										onClick={() => confirm({
											confirmButton: <Button negative content="Delete" />,
											content: <p>Partner name: <b>{name}</b></p>,
											header: 'Delete partner?',
											onConfirm: () => addressbook.remove(name, address),
											size: 'mini',
										})}
										title="Delete partner"
									/>
								</React.Fragment>
							)
						},
						title: 'Actions',
					}
				],
				data: [],
				defaultSort: 'name',
				searchExtraKeys: ['_public', '_tagsStr'],
				searchable: true,
				topLeftMenu: [
					{
						active: false,
						content: 'Create',
						icon: 'plus',
						name: 'create',
						onClick: () => showForm(PartnerForm)
					},
					{
						active: false,
						content: 'Request',
						icon: 'user plus',
						name: 'create',
						onClick: () => showForm(IdentityRequestForm),
						title: 'Request identity from other users',
					}
				],
				type: 'DataTable'
			}
		}
	}

	render() {
		const { listProps, partners } = this.state
		listProps.data = (partners || []).map((partner, key) => {
			const { address, isPublic, name, tags } = partner
			return {
				...partner,
				key,
				_address: textEllipsis(address, 15, 3),
				_name: textEllipsis(name, 25, 3, false),
				_tags: tags.map(tag => (
					<Label key={tag} style={{ margin: 1, float: 'left', display: 'inline' }}>
						{tag}
					</Label>
				)),
				// makes tags searchable
				_tagsStr: tags.join(' '),
				// makes public/private text searchable
				_public: isPublic ? 'public' : 'private',
			}
		})
		return <ListFactory {...listProps} />
	}
}