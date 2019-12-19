import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Icon, Menu } from 'semantic-ui-react'
import { isDefined, isFn } from '../utils/utils'

export default class Paginator extends ReactiveComponent {

    handleClick(target) {
        const { current, onSelect, total } = this.props
        if (!isFn(onSelect) || current === target) return;
        const isValid = 1 <= target && target <= total
        isValid && onSelect(target)
    }

    getNumberItems() {
        const { current, navLimit, total } = this.props
        const edging = (current + navLimit - 1) >= total
        let start = edging ? total - navLimit + 1 : current - Math.floor(navLimit / 2)
        start = start < 1 ? 1 : start
        let end = start + navLimit
        end = end > total ? total + (edging ? 1 : 0) : end
        return Array(end - start).fill(0).map((_, i) => (
            <Menu.Item
                active={current === start + i}
                as="a"
                key={i}
                onClick={() => this.handleClick(start + i)}
            >
                {start + i}
            </Menu.Item>
        ))

    }

    render() {
        const { current, float, total } = this.props
        const next = current + 1
        const prev = current - 1

        const menuProps = { pagination: true }
        if (isDefined(float)) {
            menuProps.floated = float
        }
        return (
            <Menu {...menuProps}>
                <Menu.Item
                    as="a"
                    icon
                    onClick={() => this.handleClick(prev)}
                    disabled={prev <= 0}
                >
                    <Icon name="chevron left" />
                </Menu.Item>
                {this.getNumberItems()}
                <Menu.Item
                    as="a"
                    icon
                    onClick={() => this.handleClick(next)}
                    disabled={next > total}
                >
                    <Icon name="chevron right" />
                </Menu.Item>
            </Menu>
        )
    }
}

Paginator.propTypes = {
    current: PropTypes.number,
    float: PropTypes.string,
    // maximum number of page numbers to show
    navLimit: PropTypes.number,
    onSelect: PropTypes.func.isRequired
}