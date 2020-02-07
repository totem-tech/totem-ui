import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { runtime } from 'oo7-substrate'
import { isBond } from '../utils/utils'
import { ss58Decode } from '../utils/convert'

export default class Currency extends Component {
    constructor(props) {
        super(props)
        this.state = { value: '' }
    }

    componentWillMount() {
        let { address, value } = this.props
        if (!value && ss58Decode(address)) {
            value = runtime.balances.balance(address)
        }

        if (!isBond(value)) return this.setState({ value })
        this.bond = value
        this.tieId = this.bond.tie(value => this.setState({ value: parseFloat(value) }))
    }

    componentWillUnmount = () => this.bond && this.bond.untie(this.tieId)

    render() {
        const { className, decimalPlaces, style } = this.props
        return (
            <span {...{ className, style }}>
                {(this.state.value || 0).toFixed(decimalPlaces)}
            </span>
        )
    }
}
Currency.propTypes = {
    // @address to retrieve balance from Totem chain.
    // Only used when value is not supplied.
    address: PropTypes.string,
    className: PropTypes.string,
    decimalPlaces: PropTypes.number,
    style: PropTypes.object,
    unit: PropTypes.string,
    value: PropTypes.any, // number or bond
}
Currency.defaultProps = {
    decimalPlaces: 0,
    unit: 'Transactions'
}