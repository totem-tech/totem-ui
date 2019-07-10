import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button, Card, Container, Icon, Image, Menu, Label, Table } from 'semantic-ui-react'
import { arrMapSlice, isDefined, isFn } from '../utils'
import { FormInput } from '../forms/FormBuilder'

class ListFactory extends ReactiveComponent {
    constructor(props) {
        super(props)
    }

    render() {
        const { type } = this.props
        
        switch (type.toLowerCase()) {
            case 'datatable':
                return <DataTable {...this.props} />
            case 'cardlist': 
            default: 
                return <CardList {...this.props} />
        }
    }
}
ListFactory.propTypes = {
    type: PropTypes.string.isRequired
}
export default ListFactory

export class CardList extends ReactiveComponent {
    constructor(props) {
        super(props)
    }

    render() {
        let { items, itemsPerRow, style} = this.props
        itemsPerRow = itemsPerRow || 1
        return (
            <Card.Group style={style} itemsPerRow={itemsPerRow || 1}>
                {items.map((card, i) => (
                    React.isValidElement(card) ? card : <CardListItem {...card} key={i} />
                ))}
            </Card.Group>
        )
    }
}
CardList.propTypes = {
    // items: PropTypes.arrayOf(CardListItem),
    style: PropTypes.object
}

export class CardListItem extends ReactiveComponent {
    constructor(props) {
        super(props)
    }

    render() {
        const {
            actions,
            actionsVisible,
            description,
            fluid,
            header,
            style
        } = this.props

        const menuItems = (actions || []).map((item, i) => {
            item.key = isDefined(item.key) ? item.key : i
            item.as = !isDefined(item.as) || isFn(item.onClick) ? Button : 'div'
            return item
        }).filter(item => !item.hide)

        const actionsEl = actions && actionsVisible && (
            <Card.Content extra>
                <Menu items={menuItems} widths={menuItems.length} />
            </Card.Content>
        )
        const headerEl = React.isValidElement(header) ? header : <CardHeader {...header} />
        return (
            <Card fluid={fluid} style={style}>
                <Card.Content header={headerEl} description={description} />
                {actionsEl}
            </Card>
        )
    }
}
CardListItem.propTypes = {
    header: PropTypes.object.isRequired,
    menu: PropTypes.arrayOf(PropTypes.ob) 
}

export class CardHeader extends ReactiveComponent {
    constructor(props) {
        super(props)
    }

    render() {
        const { icon, content, image, input, inputVisible, onClick, style, subheader } = this.props
        const hasOnClick = isFn(onClick)
        const headerImage = image && (React.isValidElement(image) ? (
            <Image floated="left" size="mini">
                {image}
            </Image>
        ) : (
            <Image floated="left" size="mini" src={iamge} />
        ))

        const getIcon = (icon, key) => (
            !icon ? '' : <Icon
                color={icon.color || 'grey'}
                className={icon.className}
                key={key}
                link={isFn(icon.onClick)}
                name={ icon.name || 'question'}
                onClick={icon.onClick}
                size={icon.size || 'small'}
                style={icon.style}
            />
        )
        
        return (
            <React.Fragment>
                 {headerImage}
                 {input && inputVisible ? <FormInput {...input} /> : (
                     <Card.Header
                         as={hasOnClick ? 'a' : 'div'}
                         style={{cursor: hasOnClick ? 'pointer' : 'default'}} 
                         onClick={!inputVisible ? onClick : undefined}
                     >
                         {content}
                         {!Array.isArray(icon) ? getIcon(icon) : icon.map((ic, i) => (
                             getIcon(ic, i)
                         ))}
                     </Card.Header>
                 )}
                 {subheader && <Card.Meta content={subheader} />} 
            </React.Fragment>
        )
    }
}
CardHeader.propTypes = {
    icon: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.object),
        PropTypes.object
    ]),
    content: PropTypes.any,
    image: PropTypes.any,
    input: PropTypes.object,
    inputVisible: PropTypes.bool,
    meta: PropTypes.any,
    onClick: PropTypes.func
}

/*
 * Data Table
 */

const mapItemsByPage = (data, pageNo, perPage, callback) => {
    const start = pageNo * perPage - perPage
    const end = start + perPage - 1
    return arrMapSlice(data, start, end, callback)
}
export class DataTable extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            pageNo: props.pageNo || 1
        }
    }

    render() {
        let { data, dataKeys, footerContent, navLimit, pageOnSelect, perPage } = this.props
        const { pageNo } = this.state
        const totalPages = Math.ceil(data.length / perPage)
        const headers = dataKeys.map((x, i) => <Table.HeaderCell key={i} textAlign={x.textAlign || 'center'}>{x.title}</Table.HeaderCell>)
        const rows = mapItemsByPage(data, pageNo, perPage, (item, i) => (
            <Table.Row key={i}>
                {dataKeys.map((x, j) => (
                    <Table.Cell collapsing={x.collapsing} key={j} textAlign={x.textAlign || 'center'} verticalAlign={x.verticalAlign} style={x.style}>
                        {!x.content ? item[x.key] : (isFn(x.content) ? x.content(item, i) : x.content)}
                    </Table.Cell>
                ))}
            </Table.Row>
        ))
        
        return (
            <div style={{overflowX: 'auto'}}>
                <Table celled>
                    <Table.Header>
                        <Table.Row>
                            {headers}
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {rows}
                    </Table.Body>

                    <Table.Footer>
                        <Table.Row>
                            <Table.HeaderCell colSpan={dataKeys.length}>
                                {footerContent && <div style={{float: 'left'}}>{footerContent}</div>}
                                <Paginator
                                    total={totalPages}
                                    current={pageNo}
                                    navLimit={navLimit || 5}
                                    float="right"
                                    onSelect={pageNo => {this.setState({pageNo}); isFn(pageOnSelect) && pageOnSelect(pageNo); }}
                                />
                            </Table.HeaderCell>
                        </Table.Row>
                    </Table.Footer>
                </Table>
            </div>
        )
    }
}
DataTable.propTypes = {
    data: PropTypes.array.isRequired,
    dataKeys: PropTypes.arrayOf(
        PropTypes.shape({
            content: PropTypes.any,
            key: PropTypes.string,
            title: PropTypes.string.isRequired
        })
    ),
    footerContent: PropTypes.any,
    perPage: PropTypes.number.isRequired
}
export class Paginator extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.getItems = this.getItems.bind(this)
        this.handleClick = this.handleClick.bind(this)
    }

    handleClick(target) {
        const { current, onSelect, total } = this.props
        if (!isFn(onSelect) || current === target) return;
        const isValid = 1 <= target && target <= total
        isValid && onSelect(target)
    }

    getItems() {
        const { current, navLimit, total } = this.props
        const edging = (current + navLimit -1) >= total
        let start = edging ? total - navLimit + 1 : current - Math.floor(navLimit/2)
        start = start < 1 ? 1 : start
        let end = start + navLimit
        end = end > total ? total + (edging ? 1 : 0) : end
        return Array(end - start).fill(0).map((_, i) => (
            <Menu.Item
                active={current === start+i}
                as="a"
                key={i}
                onClick={() => this.handleClick(start+i)}
            >
                {start + i}
            </Menu.Item>
        ))

    }

    render() {
        const { current, float, total } = this.props
        const { getItems, handleClick } = this
        const next = current + 1
        const prev = current - 1
        return (
            <Menu floated={float} pagination>
                <Menu.Item
                    as="a"
                    icon
                    onClick={()=> handleClick(prev)}
                    disabled={ prev <= 0 }
                >
                    <Icon name="chevron left" />
                </Menu.Item>
                {getItems()}
                <Menu.Item 
                    as="a" 
                    icon
                    onClick={()=> handleClick(next)} 
                    disabled={ next > total }
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