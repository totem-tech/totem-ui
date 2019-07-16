import React from 'react';
require('semantic-ui-css/semantic.min.css');
import { Icon, Label, Header, Segment, Divider } from 'semantic-ui-react';
import { Bond } from 'oo7';
import { If } from 'oo7-react';
import { calls, runtime, ss58Decode, hexToBytes } from 'oo7-substrate';
import { AccountIdBond, SignerBond } from './AccountIdBond.jsx';
import { InputBond } from './InputBond.jsx';
import { TransactButton } from './TransactButton.jsx';
import { Pretty } from './Pretty';

class ProjectCreateSegment extends React.Component {
	constructor () {
		super()
		this.source = new Bond;
		this.txhex = new Bond;
		
		addCodecTransform('ProjectHash', 'Hash');
	}

	render () {
		return <Segment style={{margin: '1em'}} padded>
			<Header as='h2'>
				<Icon name='certificate' />
				<Header.Content>
					Create a new project.
					<Header.Subheader>Stores the current user accountID + project hash as if you were creating a new project.</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{ paddingBottom: '1em' }}>
				<div style={{ fontSize: 'small' }}>from</div>
				<SignerBond bond={this.source} />
				<If condition={this.source.ready()} then={<span>
					<Label>Balance
						<Label.Detail>
							<Pretty value={runtime.balances.balance(this.source)} />
						</Label.Detail>
					</Label>
					<Label>Nonce
						<Label.Detail>
							<Pretty value={runtime.system.accountNonce(this.source)} />
						</Label.Detail>
					</Label>
				</span>} />
			</div>

			<div style={{paddingBottom: '1em'}}>
				<div style={{paddingBottom: '1em'}}>
					<div style={{fontSize: 'small'}}>Add Project</div>
					<InputBond bond={this.txhex}/>
				</div>
				<TransactButton 
					 
					content="Add Project" 
					icon="" 
					tx={{
						sender: runtime.indices.tryIndex(this.source),
						call: calls.projects.addNewProject(this.txhex.map(hexToBytes)),
						compact: false,
						longevity: true
					}}
					/>
			</div>
			<div>Owner of this Project "0xeb8ff41de69667b5c39e802074fb7d19874c42dd056be513bf3141e21c995b88" is address : </div>
			<Pretty value={runtime.projects.projectHashOwner('0xeb8ff41de69667b5c39e802074fb7d19874c42dd056be513bf3141e21c995b88')}/>
			<Divider hidden />
			<div>List of projects for this address "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" is : 
				<Pretty value={runtime.projects.ownerProjectsList(ss58Decode('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'))}/>
			</div>	

		</Segment>
	}
}

class ProjectDeleteSegment extends React.Component {
	constructor () {
		super()
		this.source = new Bond;
		this.txhex = new Bond;		
	}

	render () {
		return <Segment style={{margin: '1em'}} padded>
			<Header as='h2'>
				<Icon name='certificate' />
				<Header.Content>
					Delete a project.
					<Header.Subheader>Deletes a project from an account you own</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{ paddingBottom: '1em' }}>
				<div style={{ fontSize: 'small' }}>from</div>
				<SignerBond bond={this.source} />
				<If condition={this.source.ready()} then={<span>
					<Label>Balance
						<Label.Detail>
							<Pretty value={runtime.balances.balance(this.source)} />
						</Label.Detail>
					</Label>
					<Label>Nonce
						<Label.Detail>
							<Pretty value={runtime.system.accountNonce(this.source)} />
						</Label.Detail>
					</Label>
				</span>} />
			</div>

			<div style={{paddingBottom: '1em'}}>
				<div style={{paddingBottom: '1em'}}>
					<div style={{fontSize: 'small'}}>Delete Project</div>
					<InputBond bond={this.txhex}/>
				</div>
				<TransactButton 
					 
					content="Remove Project" 
					icon="" 
					tx={{
						sender: runtime.indices.tryIndex(this.source),
						call: calls.projects.removeProject(this.txhex.map(hexToBytes)),
						compact: false,
						longevity: true
					}}
					/>
			</div>
		</Segment>
	}
}

class ProjectReassignSegment extends React.Component {
	constructor () {
		super()
		this.source = new Bond;
		this.newowner = new Bond;
		this.txhex = new Bond;		
	}

	render () {
		return <Segment style={{margin: '1em'}} padded>
			<Header as='h2'>
				<Icon name='certificate' />
				<Header.Content>
					Re-assign a project.
					<Header.Subheader>Reassigns a project from an account you own, to another account.</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{ paddingBottom: '1em' }}>
				<div style={{ fontSize: 'small' }}>from</div>
				<SignerBond bond={this.source} />
				<If condition={this.source.ready()} then={<span>
					<Label>Balance
						<Label.Detail>
							<Pretty value={runtime.balances.balance(this.source)} />
						</Label.Detail>
					</Label>
					<Label>Nonce
						<Label.Detail>
							<Pretty value={runtime.system.accountNonce(this.source)} />
						</Label.Detail>
					</Label>
				</span>} />
			</div>

			<div style={{ paddingBottom: '1em' }}>
				<div style={{ fontSize: 'small' }}>to</div>
				<AccountIdBond bond={this.newowner} />
			</div>

			<div style={{paddingBottom: '1em'}}>
				<div style={{paddingBottom: '1em'}}>
					<div style={{fontSize: 'small'}}>Reassign Project</div>
					<InputBond bond={this.txhex}/>
				</div>
				<TransactButton 
					 
					content="Reassign Project" 
					icon="" 
					tx={{
						sender: runtime.indices.tryIndex(this.source),
						call: calls.projects.reassignProject(this.newowner, this.txhex.map(hexToBytes)),
						compact: false,
						longevity: true
					}}
					/>
			</div>
		</Segment>
	}
}