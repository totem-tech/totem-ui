import React from 'react'
import PropTypes from 'prop-types'
import { Icon, Menu, Dropdown } from 'semantic-ui-react'
import { isFn } from '../utils/utils'

const handleSelect = (props, target) => {
    const { current, onSelect, total } = props
    if (!isFn(onSelect) || current === target) return
    const isValid = 1 <= target && target <= total
    isValid && onSelect(target)
}
const getNumberItems = props => {
    const { current, navLimit, total } = props
    const edging = (current + navLimit - 1) >= total
    let start = edging ? total - navLimit + 1 : current - Math.floor(navLimit / 2)
    start = start < 1 ? 1 : start
    let end = start + navLimit
    end = end > total ? total + (edging ? 1 : 0) : end
    const addDropDown = total > navLimit

    return Array(end - start).fill(0).map((_, i) => {
        const num = start + i
        const isCurrent = num === current
        return (
            <Menu.Item {...{
                active: isCurrent,
                as: 'a',
                key: num,
                onClick: () => !isCurrent && handleSelect(props, num),
                style: { padding: isCurrent && addDropDown ? 0 : undefined },
            }}>
                {!isCurrent ? num : (
                    !addDropDown ? <b>{num}</b> : (
                        <Dropdown {...{
                            defaultUpward: true,
                            className: 'upward',
                            icon: {
                                className: 'no-margin',
                                name: 'triangle up',
                                style: {
                                    left: 0,
                                    position: 'absolute',
                                    top: 0,
                                    width: '100%',
                                }
                            },
                            item: true,
                            text: `${num}`,
                        }}>
                            <Dropdown.Menu style={{
                                borderRadius: '3px 3px 0px 0px',
                                marginLeft: -2,
                                overflowY: 'auto',
                                maxHeight: 300,
                            }}>
                                {new Array(total).fill(0).map((_, i) => (
                                    <Dropdown.Item {...{
                                        active: i + 1 === current,
                                        content: i + 1,
                                        key: i,
                                        onClick: () => i + 1 !== current && handleSelect(props, i + 1),
                                    }} />
                                ))}
                            </Dropdown.Menu>
                        </Dropdown>
                    )
                )}
            </Menu.Item>
        )
    })

}
function Paginator(props) {
    const { current, float, total } = props
    const next = current + 1
    const prev = current - 1
    return (
        <Menu {...{ pagination: true, style: { float: float || 'right' } }}>
            <Menu.Item
                as="a"
                icon
                onClick={() => handleSelect(props, prev)}
                disabled={prev <= 0}
            >
                <Icon name="chevron left" />
            </Menu.Item>
            {getNumberItems(props)}
            <Menu.Item
                as="a"
                icon
                onClick={() => handleSelect(props, next)}
                disabled={next > total}
            >
                <Icon name="chevron right" />
            </Menu.Item>
        </Menu>
    )
}

Paginator.propTypes = {
    current: PropTypes.number,
    float: PropTypes.string,
    // maximum number of page numbers to show
    navLimit: PropTypes.number,
    onSelect: PropTypes.func.isRequired
}
export default React.memo(Paginator)