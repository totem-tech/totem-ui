import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import { useRxSubject } from '../../utils/reactHelper'
import { isArr, isMap, isValidNumber } from '../../utils/utils'
import { Reveal } from '../../components/buttons'
// services
import { query } from '../../services/blockchain'
import { translated } from '../../services/language'
import { unsubscribe } from '../../services/react'
// modules
import Currency from '../currency/Currency'
import { rxIdentities } from './identity'

const textsCap = translated({
	loadingAccBal: 'loading account balance',
	locked: 'locked',
	total: 'total',
}, true)[1]

// cache balances and locks
export const rxBalances = new BehaviorSubject(new Map())
export const rxLocks = new BehaviorSubject(new Map())
export const Balance = props => {
	let {
		address,
		detailsPrefix,
		detailsSuffix,
		emptyMessage,
		lockSeparator,
		prefix,
		showDetailed,
		style,
		suffix,
		unitDisplayed,
	} = props
	// prevents update if value for the address is unchanged
	const valueModifier = (newValue = new Map(), oldValue) => {
		const value = newValue.get(address)
		const update = (isValidNumber(value) || isArr(value))
			&& value !== oldValue
		return update
			? value
			: useRxSubject.IGNORE_UPDATE
	}
	const isOwnIdentity = !!rxIdentities.value.get(address)
	const balance = !isOwnIdentity
		? useBalance(address)
		: useRxSubject(rxBalances, valueModifier)[0]
	const locks = !isOwnIdentity
		? userLocks(address)
		: useRxSubject(rxLocks, valueModifier)[0]
	const isLoading = !isValidNumber(balance)
	const totalLocked = (locks || [])
		.reduce((sum, next) => sum + next.amount, 0)
	style = {
		cursor: 'pointer',
		userSelect: 'none',
		...style
	}
	emptyMessage = emptyMessage !== null && (
		<span title={!isLoading ? '' : textsCap.loadingAccBal}>
			<Icon {...{
				className: 'no-margin',
				name: 'spinner',
				loading: true,
				style: { padding: 0 },
			}} />
			{emptyMessage}
		</span>
	)
	const getContent = () => (
		<Currency {...{
			...props,
			emptyMessage,
			prefix,
			style,
			suffix,
			value: balance,
		}} />
	)
	const getDetails = () => (
		<Currency {...{
			...props,
			emptyMessage,
			prefix: (
				<span>
					{detailsPrefix}<b>{textsCap.total}: </b>
				</span>
			),
			style,
			suffix: (
					<Currency {...{
						prefix: (
							<span>
								{lockSeparator}
								<b>{textsCap.locked}: </b>
							</span>
						),
						suffix: detailsSuffix,
						value: totalLocked,
						unitDisplayed,
					}} />
				),
			value: balance + totalLocked,
		}} />
	)
	return showDetailed === null
		? getContent()
		: (
			<Reveal {...{
				content: showDetailed
					? getDetails
					: getContent,
				contentHidden: showDetailed
					? getContent
					: getDetails,
				ready: !isLoading,
				toggleOnClick: true,
				toggleOnHover: true,
			}} />
		)
}
Balance.propTypes = {
	address: PropTypes.string.isRequired,
	details: PropTypes.any,
	detailsSuffix: PropTypes.any,
	// use null to prevent  displaying loading spinner
	emptyMessage: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
	prefix: PropTypes.any,
	// @showDetailed: if truthy will display total balance and locked balance. Otherwise, free balance.
	showDetailed: PropTypes.bool,
	suffix: PropTypes.any,
	// any other props accepted by Currency component will be passed through
}
Balance.defaultProps = {
	lockSeparator: ' | ',
	showDetailed: false,
}
export default React.memo(Balance)

/**
 * @name    useBalance
 * @summary custom React hook to retrieve identity balance and subscribe to changes
 *
 * @param   {String|Array}  address user identity
 *
 * @returns {Number|Array} account balance amount in TOTEM
 */
export const useBalance = address => {
	const [balance, setBalance] = useState()

	useEffect(() => {
		if (!address) return () => {}
		let mounted = true
		let subscriptions = {}
		// subscribe to address balance change
		const subscribe = async () => {
			subscriptions.balance = await query(
				'api.query.balances.freeBalance',
				[address, balance => mounted && setBalance(balance)],
				isArr(address)
			)
		}

		// ignore errors
		subscribe().catch(() => {})
		return () => {
			mounted = false
			unsubscribe(subscriptions)
		}
	}, [address])

	return balance
}
useBalance.propTypes = {
	address: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.arrayOf(PropTypes.string),
	]).isRequired,
}

/**
 * @name    userLocks
 * @summary custom React hook to retrieve locked balances by identity and subscribe to changes
 *
 * @param   {String|Array}  address user identity
 *
 * @returns {Object|Array}
 */
export const userLocks = address => {
	const [locks, setLocks] = useState([])

	useEffect(() => {
		if (!address) return () => {}
		let mounted = true
		let subscriptions = {}
		const subscribe = async () => {
			subscriptions.locks = await query(
				'api.query.balances.locks',
				[address, locks => mounted && setLocks(locks)],
				isArr(address)
			)
		}

		// ignore error
		subscribe().catch(() => {})

		return () => {
			mounted = false
			unsubscribe(subscriptions)
		}
	}, [address])

	return locks
}
userLocks.propTypes = {
	address: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.arrayOf(PropTypes.string),
	]).isRequired,
}

setTimeout(() => {
	let sub = {}
	rxIdentities.subscribe((identities = new Map()) => {
		const addresses = [...identities.keys()]
		const addressesCached = [...rxBalances.value.keys()]
		const unchanged = addresses.length === addressesCached.length
			&& addresses.every(a => addressesCached.includes(a))
		if (unchanged) return

		unsubscribe(sub)
		
		const updateCache = subject => (result = []) => {
			const map = new Map(
				result.map((value, i) => [
					addresses[i],
					value,
				])
			)
			subject.next(map)
		}
		sub.balances = query(
			'api.query.balances.freeBalance',
			[addresses, updateCache(rxBalances)],
			true,
			false,
		)
		sub.locks = query(
			'api.query.balances.locks',
			[addresses, updateCache(rxLocks)],
			true,
			false,
		)
	})
}, 100)