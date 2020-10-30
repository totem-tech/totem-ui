const React = require('react');
// const Identicon = require('polkadot-identicon').default;
const { InputBond } = require('./InputBond');
const { runtime, secretStore, addressBook } = require('oo7-substrate');
import addressbook from '../modules/partner/partner'

class AccountIdBond extends InputBond {
	constructor() { super() }
	// makeIcon(p) {
	// 	return p ? 'left' : this.state.ok
	// 		? (<i style={{ opacity: 1 }} className='icon'>
	// 			<Identicon
	// 				account={this.state.external}
	// 				style={{ marginTop: '5px' }}
	// 				size='28'
	// 			/></i>)
	// 		: undefined;
	// }

	render() {
		const labelStyle = {
			position: 'absolute',
			zIndex: this.props.labelZIndex || 10
		};
		return InputBond.prototype.render.call(this);
	}
}
AccountIdBond.defaultProps = {
	placeholder: 'Name or address',
	validator: a => {
		let y = secretStore().find(a);
		if (y) {
			return { external: y.account, internal: a, ok: true, extra: { knowSecret: true } };
		}
		let z = addressbook.get(a) || addressbook.getByName(a);
		if (z) {
			return { external: z.account, internal: a, ok: true, extra: { knowSecret: false } };
		}
		if (a.match(/^[0-9]+$/)) {
			return runtime.indices.lookup(+a).map(x => x && { external: x, internal: a, ok: true })
		}

		return runtime.indices.ss58Decode(a).map(
			x => x
				? { external: x, internal: a, ok: true, extra: { knowSecret: !!secretStore().find(a) } }
				: null,
			undefined, undefined, false
		)
	},
	defaultValue: ''
};

class SignerBond extends AccountIdBond {
	constructor() { super() }
}

SignerBond.defaultProps = {
	placeholder: 'Name or address',
	validator: a => {
		let y = secretStore().find(a);
		if (y) {
			return { external: y.account, internal: a, ok: true };
		}
		return runtime.indices.ss58Decode(a).map(
			x => x && secretStore().find(x)
				? { external: x, internal: a, ok: true }
				: null,
			undefined, undefined, false
		)
	},
	defaultValue: ''
};

module.exports = { AccountIdBond, SignerBond };
