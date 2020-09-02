import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
    Button,
    Dropdown,
    Grid,
    Icon,
    Input,
    Segment,
    Table,
} from 'semantic-ui-react'
import {
    arrMapSlice, getKeys, isArr, isFn, objWithoutKeys, objCopy, search, sort, isStr, arrReverse, arrUnique
} from '../utils/utils'
import Invertible from './Invertible'
import Message from './Message'
import Paginator from './Paginator'
import { translated } from '../services/language'
import { MOBILE, rxLayout } from '../services/window'
import { unsubscribe } from '../services/react'

const mapItemsByPage = (data, pageNo, perPage, callback) => {
    const start = pageNo * perPage - perPage
    const end = start + perPage - 1
    return arrMapSlice(data, start, end, callback)
}

const textsCap = translated({
    actions: 'actions',
    deselectAll: 'deselect all',
    noDataAvailable: 'no data available',
    noResultsMsg: 'your search yielded no results',
    search: 'search',
    selectAll: 'select all',
}, true)[1]

export default class DataTable extends Component {
    constructor(props) {
        super(props)

        const { columns, defaultSort, defaultSortAsc, keywords, pageNo } = props
        this.state = {
            isMobile: rxLayout.value === MOBILE,
            keywords: keywords || '',
            pageNo: pageNo,
            selectedIndexes: [],
            sortAsc: defaultSortAsc, // ascending/descending sort
            sortBy: defaultSort || (columns.find(x => !!x.key) || {}).key,
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }
    componentWillMount() {
        this._mounted = true
        this.subscriptions = {}
        this.subscriptions.layout = rxLayout.subscribe(layout => {
            const isMobile = layout === MOBILE
            if (this.state.isMObile === isMobile) return
            this.setState({ isMobile })
        })
    }

    componentWillUnmount = () => {
        this._mounted = false
        unsubscribe(this.subscriptions)
    }

    getFooter(totalPages, pageNo) {
        let { footerContent, navLimit } = this.props
        const { isMobile } = this.state
        const paginator = totalPages <= 1 ? '' : (
            <Paginator
                current={pageNo}
                float={isMobile ? 'left' : 'right'}
                key='paginator'
                navLimit={navLimit}
                total={totalPages}
                onSelect={this.handlePageSelect}
            />
        )
        const footer = footerContent && (
            <div key='footer-content' style={{ float: 'left' }}>
                {footerContent}
            </div>
        )
        return [paginator, footer].filter(Boolean)
    }

    getHeaders(totalRows, columns, selectedIndexes) {
        let { selectable } = this.props
        const { sortAsc, sortBy } = this.state

        const headers = columns.filter(x => !x.hidden).map((x, i) => (
            <Table.HeaderCell
                {...x.headerProps}
                key={i}
                onClick={() => x.key && this.setState({ sortBy: x.key, sortAsc: sortBy === x.key ? !sortAsc : true })}
                sorted={sortBy !== x.key ? null : (sortAsc ? 'ascending' : 'descending')}
                style={{ ...((x.headerProps || {}).style), ...styles.columnHeader }}
                textAlign='center'
            >
                {x.title}
            </Table.HeaderCell>
        ))

        if (!selectable) return headers
        // include checkbox to select items
        const n = selectedIndexes.length
        const iconName = `${n > 0 ? 'check ' : ''}square${n === 0 || n != totalRows ? ' outline' : ''}`
        const deselect = n === totalRows || n > 0 && n < totalRows
        const numRows = deselect ? n : totalRows
        const title = `${deselect ? textsCap.deselectAll : textsCap.selectAll} (${numRows})`
        headers.splice(0, 0, (
            <Table.HeaderCell
                key='checkbox'
                onClick={() => this.handleSelectAll(selectedIndexes)}
                style={styles.checkboxCell}
                title={title}
            >
                <Icon
                    name={iconName}
                    size='large'
                    className='no-margin'
                />
            </Table.HeaderCell >
        ))
        return headers
    }

    getRows(filteredData, columns, selectedIndexes) {
        let { perPage, rowProps, selectable } = this.props
        const { pageNo } = this.state

        return mapItemsByPage(filteredData, pageNo, perPage, (item, key, items, isMap) => (
            <Table.Row
                key={key}
                {...(isFn(rowProps) ? rowProps(item, key, items, isMap) : rowProps || {})}
            >
                {selectable && ( /* include checkbox to select items */
                    <Table.Cell onClick={() => this.handleRowSelect(key, selectedIndexes)} style={styles.checkboxCell}>
                        <Icon
                            className='no-margin'
                            name={(selectedIndexes.indexOf(key) >= 0 ? 'check ' : '') + 'square outline'}
                            size='large'
                        />
                    </Table.Cell>
                )}
                {columns.filter(x => !x.hidden).map((cell, j) => {
                    let { collapsing, content, draggable, key: contentKey, style, textAlign = 'left' } = cell || {}
                    draggable = draggable !== false
                    content = isFn(content) ? content(item, key, items, isMap) : cell.content || item[contentKey]
                    style = {
                        cursor: draggable ? 'grab' : undefined,
                        padding: collapsing ? '0 5px' : undefined,
                        ...style
                    }
                    const props = {
                        ...objWithoutKeys(cell, ['content', 'headerProps', 'title']),
                        key: key + j,
                        draggable,
                        onDragStart: !draggable ? undefined : this.handleDragStart,
                        style,
                        textAlign,
                    }
                    return <Table.Cell {...props}>{content}</Table.Cell>
                })}
            </Table.Row>
        ))
    }

    getTopContent(totalRows, selectedIndexes) {
        let { searchable, searchHideOnEmpty, searchOnChange, selectable, topLeftMenu, topRightMenu } = this.props
        const { keywords, isMobile } = this.state
        topLeftMenu = (topLeftMenu || []).filter(x => !x.hidden)
        topRightMenu = (topRightMenu || []).filter(x => !x.hidden)
        const showSearch = searchable && (keywords || totalRows > 0 || !searchHideOnEmpty)

        if (topLeftMenu.length + topRightMenu.length === 0 && !showSearch) return
        const triggerSearchChange = keywords => isFn(searchOnChange) && searchOnChange(keywords)

        const searchCol = !showSearch ? '' : (
            <Grid.Column key='0' tablet={16} computer={5} style={{ padding: 0 }}>
                {// if searchable is a valid element search is assumed to be externally handled
                    React.isValidElement(searchable) ? searchable : (
                        <Input
                            icon='search'
                            iconPosition='left'
                            action={!keywords ? undefined : {
                                basic: true,
                                icon: { className: 'no-margin', name: 'close' },
                                onClick: () => {
                                    this.setState({ keywords: '' })
                                    triggerSearchChange('')
                                }
                            }}
                            onChange={(e, d) => {
                                const keywords = d.value
                                this.setState({ keywords })
                                triggerSearchChange(keywords)
                            }}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                                const keywords = e.dataTransfer.getData('Text')
                                if (!keywords.trim()) return
                                this.setState({ keywords })
                                triggerSearchChange(keywords)
                            }}
                            placeholder={textsCap.search}
                            style={!isMobile ? undefined : styles.searchMobile}
                            type='search' // enables escape to clear
                            value={keywords}
                        />
                    )}
            </Grid.Column>
        )

        const right = selectable && topRightMenu && topRightMenu.length > 0 && (
            <Grid.Column
                computer={3}
                floated='right'
                key='1'
                style={{ padding: 0 }}
                tablet={16}
            >
                <Dropdown
                    button
                    disabled={selectedIndexes.length === 0}
                    fluid
                    style={{ textAlign: 'center' }}
                    text={textsCap.actions}
                >
                    <Dropdown.Menu direction='left' style={{ minWidth: 'auto' }}>
                        {topRightMenu.map((item, i) => React.isValidElement(item) ? item : (
                            <Dropdown.Item
                                {...item}
                                key={i}
                                onClick={() => isFn(item.onClick) && item.onClick(selectedIndexes)}
                            />
                        ))}
                    </Dropdown.Menu>
                </Dropdown>
            </Grid.Column>
        )

        return (
            <Grid columns={3} style={styles.tableTopContent}>
                <Grid.Row>
                    <Grid.Column tablet={16} computer={6} style={{ padding: 0 }}>
                        {topLeftMenu.map((item, i) => React.isValidElement(item) ? item : (
                            <Button
                                {...item}
                                fluid={isMobile}
                                key={i}
                                onClick={() => isFn(item.onClick) && item.onClick(selectedIndexes)}
                                style={!isMobile ? item.style : objCopy({ marginBottom: 5 }, item.style)}
                            />
                        ))}
                    </Grid.Column>
                    {arrReverse([searchCol, right], isMobile)}
                </Grid.Row>
            </Grid>
        )
    }

    handleDragStart = e => e.dataTransfer.setData('Text', e.target.textContent)

    handlePageSelect = pageNo => {
        const { pageOnSelect } = this.props
        this.setState({ pageNo })
        isFn(pageOnSelect) && pageOnSelect(pageNo)
    }

    handleRowSelect(key, selectedIndexes) {
        const { onRowSelect } = this.props
        const index = selectedIndexes.indexOf(key)
        index < 0 ? selectedIndexes.push(key) : selectedIndexes.splice(index, 1)
        isFn(onRowSelect) && onRowSelect(selectedIndexes, key)
        this.setState({ selectedIndexes })
    }

    handleSelectAll(selectedIndexes) {
        const { data, onRowSelect } = this.props
        const total = data.size || data.length
        const n = selectedIndexes.length
        selectedIndexes = n === total || n > 0 && n < total ? [] : getKeys(data)
        isFn(onRowSelect) && onRowSelect(selectedIndexes)
        this.setState({ selectedIndexes })
    }

    render() {
        let {
            columns: columnsOriginal,
            data,
            emptyMessage,
            footerContent,
            perPage,
            searchExtraKeys,
            style,
            tableProps,
        } = this.props
        let {
            keywords,
            pageNo,
            selectedIndexes,
            sortAsc,
            sortBy,
        } = this.state
        keywords = keywords.trim()
        const columns = columnsOriginal.filter(x => !!x && !x.hidden)
        // Include extra searchable keys that are not visibile on the table
        const keys = arrUnique([
            ...columns.filter(x => !!x.key).map(x => x.key),
            ...(searchExtraKeys || [])]
        )
        let filteredData = !keywords ? data : search(data, keywords, keys)
        filteredData = !sortBy ? filteredData : sort(filteredData, sortBy, !sortAsc, false)
        selectedIndexes = selectedIndexes.filter(index => !!(isArr(data) ? data[index] : data.get(index)))
        // actual total
        const totalItems = data.size || data.length
        // filtered total
        const totalRows = filteredData.length || filteredData.size || 0
        const totalPages = Math.ceil(totalRows / perPage)
        const headers = this.getHeaders(totalRows, columns, selectedIndexes)
        const rows = this.getRows(filteredData, columns, selectedIndexes)
        pageNo = pageNo > totalPages ? 1 : pageNo
        this.state.pageNo = pageNo

        if (totalItems > 0 && totalRows === 0) {
            // search resulted in zero rows
            emptyMessage = { content: textsCap.noResultsMsg }
        } else if (isStr(emptyMessage)) {
            emptyMessage = { content: emptyMessage }
        }
        return (
            <Invertible {...{
                El: Segment,
                basic: true,
                className: 'data-table',
                style: { margin: 0, ...style }
            }}>
                {this.getTopContent(totalRows, selectedIndexes)}

                <div style={styles.tableContent} >
                    {totalRows === 0 && emptyMessage && <Message {...emptyMessage} />}
                    {
                        totalRows > 0 && (
                            <Invertible {...{ ...tableProps, El: Table }}>
                                <Table.Header>
                                    <Table.Row>{headers}</Table.Row>
                                </Table.Header>

                                <Table.Body>{rows}</Table.Body>

                                {!footerContent && totalPages <= 1 ? undefined : (
                                    <Table.Footer>
                                        <Table.Row>
                                            <Table.HeaderCell colSpan={columns.length + 1}>
                                                {this.getFooter(totalPages, pageNo)}
                                            </Table.HeaderCell>
                                        </Table.Row>
                                    </Table.Footer>
                                )}
                            </Invertible>
                        )
                    }
                </div >
            </Invertible >
        )
    }
}
DataTable.propTypes = {
    // data: PropTypes.oneOfType([
    //     PropTypes.array,
    //     PropTypes.instanceOf(Map),
    // ]),
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            content: PropTypes.any,
            headerProps: PropTypes.object,
            hidden: PropTypes.bool,
            key: PropTypes.string,
            title: PropTypes.string.isRequired
        })
    ).isRequired,
    // Object key to set initial sort by
    defaultSort: PropTypes.string,
    defaultSortAsc: PropTypes.bool.isRequired,
    emptyMessage: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string, PropTypes.object
    ]),
    footerContent: PropTypes.any,
    // initial search keywords
    keywords: PropTypes.string,
    // total of page numbers to be visible including current
    navLimit: PropTypes.number,
    // loading: PropTypes.bool,
    perPage: PropTypes.number,
    rowProps: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.object
    ]),
    searchable: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.element,
    ]),
    searchExtraKeys: PropTypes.array,
    searchHideOnEmpty: PropTypes.bool,
    searchOnChange: PropTypes.func,
    selectable: PropTypes.bool,
    tableProps: PropTypes.object.isRequired, // table element props
    topLeftMenu: PropTypes.arrayOf(PropTypes.object),
    topRightMenu: PropTypes.arrayOf(PropTypes.object)
}
DataTable.defaultProps = {
    columns: [],
    data: [],
    defaultSortAsc: true,
    emptyMessage: {
        content: textsCap.noDataAvailable,
        status: 'basic'
    },
    navLimit: 5,
    pageNo: 1,
    perPage: 10,
    searchable: true,
    searchHideOnEmpty: true,
    selectable: false,
    tableProps: {
        celled: true,
        selectable: true,
        sortable: true,
        unstackable: true,
        singleLine: true,
    }
}

const styles = {
    checkboxCell: {
        padding: '0px 5px',
        width: 25,
        cursor: 'pointer',
    },
    columnHeader: {
        textTransform: 'capitalize',
    },
    searchMobile: {
        margin: '15px 0',
        width: '100%',
    },
    tableContent: {
        display: 'block',
        margin: '1rem 0',
        overflowX: 'auto',
        width: '100%',
    },
    tableTopContent: {
        margin: '-1rem 0',
        width: '100%'
    }
}