import React from 'react'
import { List, Button, Label } from 'semantic-ui-react'
import { ReactiveComponent } from 'oo7-react'
import { runtime } from 'oo7-substrate'
import Identicon from 'polkadot-identicon'
import { copyToClipboard, textEllipsis } from '../utils/utils'
import { confirm, showForm } from '../services/modal'
import ListFactory from '../components/ListFactory'
import addressbook from '../services/addressbook'
import PartnerForm from '../forms/Partner'
import CompanyForm from '../forms/Company'
import IdentityRequestForm from '../forms/IdentityRequest'
import IdentityShareForm from '../forms/IdentityShare'

const toBeImplemented = () => alert('To be implemented')
// export class PartnerList extends ReactiveComponent {
// 	constructor() {
// 		super([], {
// 			addressbook: addressbook.getBond(),
// 			shortForm: addressbook.getBond().map(accounts => {
// 				let r = {}
// 				accounts.forEach(account => r[account.name] = runtime.indices.ss58Encode(runtime.indices.tryIndex(account.address)))
// 				return r
// 			})
// 		})
// 	}

// 	readyRender() {
// 		return (
// 			<List divided verticalAlign="bottom" style={styles.list}>
// 				{this.state.addressbook.map((item, i) => (
// 					<List.Item key={i + item.name}>
// 						<List.Content floated="right">
// 							<Button
// 								size="small"
// 								onClick={() => showForm(PartnerForm, { index: i, open: true, values: item })}
// 							>
// 								Update
// 							</Button>
// 							{!item.isPublic && (
// 								<Button
// 									onClick={() => showForm(CompanyForm, {
// 										walletAddress: item.address,
// 										onSubmit: (e, v, success) => success && addressbook.setPublic(i, true)
// 									})}
// 									size="small"
// 								>
// 									Make Public
// 								</Button>
// 							)}
// 							<Button size="small" onClick={() => addressbook.remove(item.name, item.address)}>Delete</Button>
// 						</List.Content>
// 						<span className="ui avatar image" style={{ minWidth: '36px' }}>
// 							<Identicon account={item.address} />
// 						</span>
// 						<List.Content>
// 							<List.Header>{item.name}</List.Header>
// 							<List.Description>
// 								{this.state.shortForm[item.name] || item.address}
// 							</List.Description>
// 						</List.Content>
// 					</List.Item>
// 				))}
// 			</List>
// 		)
// 	}
// }

// const styles = {
// 	list: {
// 		padding: '0 0 4px 4px',
// 		overflow: 'auto',
// 		maxHeight: '20em'
// 	}
// }

export default class PartnerList extends ReactiveComponent {
	constructor() {
		super([], { partners: addressbook.getBond() })

		this.state = {
			listProps: {
				columns: [
					{ collapsing: true, key: 'type', title: 'Type' },
					{ key: '_name', title: 'Name' },
					{ collapsing: true, key: '_address', title: 'Address' },
					{ collapsing: true, key: '_public', textAlign: 'center', title: 'Public' }, //yes/no
					{ key: '_tags', title: 'Tags' },
					{
						collapsing: true,
						content: (partner, index) => {
							const { address, name, isPublic } = partner
							return (
								<React.Fragment>
									<Button
										icon='copy'
										onClick={() => copyToClipboard(address)}
										title='Copy address'
									/>
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
									<Button
										icon='world'
										onClick={() => showForm(CompanyForm, {
											walletAddress: address,
											onSubmit: (e, v, success) => success && addressbook.setPublic(i, true)
										})}
										title='Make public'
									/>
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
				_public: isPublic ? 'yes' : 'no',
				_tags: tags.map(tag => (
					<Label key={tag} style={{ margin: 1, float: 'left', display: 'inline' }}>
						{tag}
					</Label>
				)),
				// makes tags searchable
				_tagsStr: tags.join(' ')
			}
		})
		return <ListFactory {...listProps} />
	}
}