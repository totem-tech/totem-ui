import React from 'react';
import {List, Icon, Button, Label, Popup, Input} from 'semantic-ui-react';
import {ReactiveComponent} from 'oo7-react';
import {runtime, secretStore} from 'oo7-substrate';
import Identicon from 'polkadot-identicon';

export class SecretItem extends ReactiveComponent {
	constructor () {
		super()

		this.state = {
			display: null
		}
	}

	render () {
		let that = this
		let toggle = () => {
			let display = that.state.display
			if (display === null) {
				display = 'uri'
				window.setTimeout(() => that.setState({ display: null }), 5000)
				that.setState({ display })
			}
		}
		return this.state.display === 'uri'
			? <Label
				basic
				icon='privacy'
				onClick={toggle}
				content='URI '
				detail={this.props.uri}
			/>
			: <Popup trigger={<Icon
				circular
				className='eye slash'
				onClick={toggle}
			/>} content='Click to uncover seed/secret' />
	}
}

export class WalletList extends ReactiveComponent {
	constructor () {
		super([], {
			secretStore: secretStore(),
			shortForm: secretStore().map(ss => {
				let r = {}
				ss.keys.forEach(key => r[key.name] = runtime.indices.ss58Encode(runtime.indices.tryIndex(key.account)))
				return r
			})
		})
		this.state = {
			editIndex : -1,
			draft : '' 
		}

		this.handleEdit = this.handleEdit.bind(this)
		this.handleNameChange = this.handleNameChange.bind(this)
		this.handleSave = this.handleSave.bind(this)
		this.handleDelete = this.handleDelete.bind(this)
	}

	handleEdit(i) {
		const data = {}
		const key = this.state.secretStore.keys[i]
		if (!key || this.state.editIndex === i) {
			// reset existing
			data.draft = ''
			data.editIndex = -1
		} else {
			data.draft = key.name
			data.editIndex = i
		}
		this.setState(data)
	}

	handleNameChange(e, data) {
		this.setState({draft: data.value})
	}

	handleSave(i) {
		const key = this.state.secretStore.keys[i]
		const draft = this.state.draft
		if (!key) return this.handleEdit();
		this.handleDelete(key)
		secretStore().submit(key.uri, draft)
	}

	handleDelete(key) {
		setTimeout(() => this.handleEdit())
		secretStore().forget(key)
	}

	readyRender () {
		return <List divided verticalAlign='bottom' style={{padding: '0 0 4px 4px', overflow: 'auto', maxHeight: '20em'}}>{
			this.state.secretStore.keys.map((key, i) => 
				<List.Item key={i}>
					<List.Content floated='right'>
						<SecretItem uri={key.uri}/>
						<Button
							size="small" 
							onClick={() => this.handleEdit(i)}>
							{this.state.editIndex === i ? 'Cancel' : 'Edit'}
						</Button>
						<Button
							size='small'
							onClick={() => this.handleDelete(key)}>
							Delete
						</Button>
					</List.Content>
					<List.Content floated='right'>
						<div>Crypto</div>
						<div style={{fontWeight: 'bold', width: '4em', color: key.type == 'sr25519' ? '#050' : '#daa'}}>
							{key.type == 'ed25519' ? 'Ed25519' : key.type == 'sr25519' ? 'Sr25519' : '???'}
						</div>
					</List.Content>	
					<span className='ui avatar image' style={{minWidth: '36px'}}>
						<Identicon account={key.account} />
					</span>
					<List.Content>
						<List.Header>
							{this.state.editIndex === i ? (
								<Input
									size="mini"
									action={{
										color: 'black',
										icon: 'save',
										size: 'tiny',
										onClick: () => {this.handleSave(i)}
									}}
									onChange={this.handleNameChange}
									value={this.state.draft}
								/>
							) : key.name}
						</List.Header>
						<List.Description>
							{this.state.shortForm[key.name]}
						</List.Description>
					</List.Content>
				</List.Item>
			)
		}</List>
	}
}
