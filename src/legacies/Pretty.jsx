import React from 'react';
import { ReactiveComponent } from 'oo7-react';
import { pretty } from 'oo7-substrate';
import { isBond } from '../utils/utils';

export class Pretty extends ReactiveComponent {
	componentWillMount() {
		const { value } = this.props
		if (!isBond(value)) return this.setState({ value })
		this.bond = value
		this.tieId = this.bond.tie(value => this.setState({ value }))
	}
	componentWillUnmount = () => this.bond && this.bond.untie(this.tieId)

	render() {
		const { className, default: defaultValue, name, prefix, suffix } = this.props
		const { value } = this.state

		if (!this.bond.ready() && defaultValue !== null) return <span>{defaultValue}</span>

		return (
			<span className={className} name={name}>
				{(prefix || '') + pretty(value || '') + (suffix || '')}
			</span>
		)
	}
}
