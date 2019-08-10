import React from 'react'
import {List, Button} from 'semantic-ui-react'
import {ReactiveComponent} from 'oo7-react'
import { runtime } from 'oo7-substrate'
import Identicon from 'polkadot-identicon'
import addressbook from '../services/addressbook'
import PartnerForm from '../forms/Partner'
import CompanyForm from '../forms/Company'
import { showForm } from '../services/modal'

export class PartnerList extends ReactiveComponent {
	constructor () {
		super([], {
			addressbook: addressbook.getBond(),
			shortForm: addressbook.getBond().map(accounts => {
				let r = {}
				accounts.forEach(account => r[account.name] = runtime.indices.ss58Encode(runtime.indices.tryIndex(account.address)))
				return r
			})
		})
	}

	readyRender () {
		return (
			<List divided verticalAlign="bottom" style={styles.list}>
				{this.state.addressbook.map((item, i) => (
					<List.Item key={i+item.name}>
						<List.Content floated="right">
							<Button
								size="small"
								onClick={() => showForm(PartnerForm, {index: i, open: true, values: item})}
							>
								Update
							</Button>
							{!item.isPublic && (
								<Button
									onClick={() => showForm(CompanyForm, {
										walletAddress: item.address,
										onSubmit: (e, v, success) => success && addressbook.setPublic(i, true)
									})}
									size="small"
								>
									Make Public
								</Button>
							)}
							<Button size="small" onClick={() => addressbook.remove(item.name, item.address)}>Delete</Button>
						</List.Content>
						<span className="ui avatar image" style={{minWidth: '36px'}}>
							<Identicon account={item.address} />
						</span>
						<List.Content>
							<List.Header>{item.name}</List.Header>
							<List.Description>
								{this.state.shortForm[item.name] || item.address}
							</List.Description>
						</List.Content>
					</List.Item>
				))}
			</List>
		)
	}
}

const styles = {
	list: {
		padding: '0 0 4px 4px', 
		overflow: 'auto', 
		maxHeight: '20em'
	}
}