import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button, Card, Container, Grid, Icon, Image, Input, Menu, Label, Segment, Table } from 'semantic-ui-react'
import { arrMapSlice, getKeys, isDefined, isFn, objWithoutKeys } from '../utils'
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

        this.state = {
            pageNo: props.pageNo || 1,
            perPage: props.perPage || 10
        }
    }

    render() {
        let { items, itemsPerRow, navLimit, pageOnSelect, style} = this.props
        const { pageNo, perPage } = this.state
        const totalPages = Math.ceil(items.length / perPage)
        itemsPerRow = itemsPerRow || 1
        const showPaginator = items.length > perPage
        return (
            <React.Fragment>
                {showPaginator && (
                    <div style={{textAlign: 'center', margin: 30}}>
                        <Paginator
                            total={totalPages}
                            current={pageNo}
                            navLimit={navLimit || 3}
                            onSelect={pageNo => {this.setState({pageNo}); isFn(pageOnSelect) && pageOnSelect(pageNo); }}
                        />
                    </div>
                    
                )}
                <Card.Group style={style} itemsPerRow={itemsPerRow || 1}>
                    {mapItemsByPage(items, pageNo, perPage, (card, i) => (
                        React.isValidElement(card) ? card : <CardListItem {...card} key={i} />
                    ))}
                </Card.Group>
            </React.Fragment>
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
            pageNo: props.pageNo || 1,
            selectedIndexes: []
        }

    }

    handleRowSelect(key) {
        const { rowOnSelect } = this.props
        let { selectedIndexes } = this.state
        const index = selectedIndexes.indexOf(key)
        if (index < 0) {
            selectedIndexes.push(key)
        } else {
            selectedIndexes.splice(index, 1)
        }
        isFn(rowOnSelect) && rowOnSelect(selectedIndexes, key)
        this.setState({selectedIndexes})
    }

    handleAllSelect() {
        const { data, rowOnSelect } = this.props
        let { selectedIndexes } = this.state
        const total = data.size || data.length
        const totalSelected = selectedIndexes.length
        selectedIndexes = total === totalSelected ? [] : getKeys(data)
        isFn(rowOnSelect) && rowOnSelect(selectedIndexes)
        this.setState({selectedIndexes})
    }

    render() {
        let { data, dataKeys, footerContent, navLimit, pageOnSelect, perPage, selectable, topLeftMenu, topRightMenu } = this.props
        const { pageNo, selectedIndexes } = this.state
        const totalRows = data.length || data.size
        const totalPages = Math.ceil(totalRows / perPage)
        const headers = dataKeys.map((x, i) => (
            <Table.HeaderCell key={i} textAlign={x.textAlign || 'center'}>
                {x.title}
            </Table.HeaderCell>
        ))

        if (selectable) {
            const n = selectedIndexes.length
            const iconName = `${n > 0 ? 'check ' : ''}square${n === 0 || n != totalRows ? ' outline' : ''}`
            headers.splice(0, 0, (
                <Table.HeaderCell
                    key="checkbox"
                    onClick={() => this.handleAllSelect()}
                    style={styles.checkbox}
                    title={`${n === totalRows ? 'Deselect' : 'Select'} all`}
                >
                    <Icon name={iconName} size="large" />
                </Table.HeaderCell>
            ))
        }
        const rows = mapItemsByPage(data, pageNo, perPage, (item, key, items, isMap) => (
            <Table.Row key={key}>
                { selectable && (
                    <Table.Cell onClick={() => this.handleRowSelect(key)}>
                        <Icon name={(selectedIndexes.indexOf(key) >= 0 ? 'check ' : '') +'square outline'} size="large" />
                    </Table.Cell>
                )}
                {dataKeys.map((cell, j) => (
                    <Table.Cell 
                        {...objWithoutKeys(cell, ['content'])}
                        key={j} 
                        content={undefined}
                        textAlign={cell.textAlign || 'left'}
                    >
                        {!cell.content ? item[cell.key] : (isFn(cell.content) ? cell.content(item, key, items, isMap) : cell.content)}
                    </Table.Cell>
                ))}
            </Table.Row>
        ))
        
        return (
            <div style={{overflowX: 'auto', overflow: 'hidden'}}>
                <Grid columns={3} style={{margin: '-1rem 0'}}>
                    <Grid.Row>
                        <Grid.Column tablet={16} computer={6} style={{padding: 0}}>
                            <Menu compact icon items={topLeftMenu}/>
                        </Grid.Column>
                        {totalRows > 0 && ([
                            <Grid.Column key="0" tablet={16} computer={5} style={{padding: 0}}>
                                <Input
                                    type="text"
                                    placeholder="Search"
                                    action={{
                                        icon:'search',
                                        position:'right'
                                    }}
                                />
                            </Grid.Column>,
                            <Grid.Column key="1" tablet={16} computer={5} style={{padding: 0}}>
                                <Menu floated="right" icon>
                                    {(topRightMenu || []).map((item, i) => (
                                        <Menu.Item
                                            {...item}
                                            key={i}
                                            onClick={() => isFn(item.onClick) && item.onClick(selectedIndexes) }
                                        />
                                    ))}
                                </Menu>
                            </Grid.Column>
                        ])}
                    </Grid.Row>
                </Grid>
                {totalRows > 0 && (
                    <Table celled selectable unstackable singleLine>
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
                                    {totalPages <= 1 ? '' : <Paginator
                                        total={totalPages}
                                        current={pageNo}
                                        navLimit={navLimit || 5}
                                        float="right"
                                        onSelect={pageNo => {this.setState({pageNo}); isFn(pageOnSelect) && pageOnSelect(pageNo); }}
                                    />}
                                </Table.HeaderCell>
                            </Table.Row>
                        </Table.Footer>
                    </Table>
                )}
            </div>
        )
    }
}
DataTable.propTypes = {
    // data: PropTypes.oneOf([
    //     PropTypes.array,
    //     PropTypes.instanceOf(Map),
    // ]).isRequired,
    dataKeys: PropTypes.arrayOf(
        PropTypes.shape({
            content: PropTypes.any,
            key: PropTypes.string,
            title: PropTypes.string.isRequired
        })
    ),
    footerContent: PropTypes.any,
    perPage: PropTypes.number,
    topLeftMenu: PropTypes.arrayOf(PropTypes.object),
    topRightMenu: PropTypes.arrayOf(PropTypes.object)
}
DataTable.defaultProps = {
    perPage: 10,
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

        const menuProps = {pagination: true}
        if (isDefined(float)) {
            menuProps.floated = float
        }
        return (
            <Menu {...menuProps}>
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

const styles = {
    checkbox: {
        padding: 0,
        margin: 0,
        width: 20,
        cursor: 'pointer',
    }
}