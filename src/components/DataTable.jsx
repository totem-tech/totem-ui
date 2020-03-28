import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button, Dropdown, Grid, Icon, Input, Table } from 'semantic-ui-react'
import { arrMapSlice, getKeys, isArr, isFn, objWithoutKeys, objCopy, search, sort } from '../utils/utils'
import Message from '../components/Message'
import Paginator from './Paginator'
import { translated } from '../services/language'
import { layoutBond } from '../services/window'

const mapItemsByPage = (data, pageNo, perPage, callback) => {
    const start = pageNo * perPage - perPage
    const end = start + perPage - 1
    return arrMapSlice(data, start, end, callback)
}
const [words, wordsCap] = translated({
    actions: 'actions',
    search: 'search',
}, true)
const [texts] = translated({
    deselectAll: 'Deselect all',
    noDataAvailable: 'No data available',
    noResultsMsg: 'Your search yielded no results',
    selectAll: 'Select all',
})

export default class DataTable extends ReactiveComponent {
    constructor(props) {
        super(props, { layout: layoutBond })

        const { columns, defaultSort, defaultSortAsc, pageNo } = props
        this.state = {
            pageNo: pageNo,
            keywords: '',
            selectedIndexes: [],
            sortAsc: defaultSortAsc, // ascending/descending sort
            sortBy: defaultSort || (columns.find(x => !!x.key) || {}).key,
        }
    }

    handleRowSelect(key, selectedIndexes) {
        const { onRowSelect } = this.props
        const index = selectedIndexes.indexOf(key)
        index < 0 ? selectedIndexes.push(key) : selectedIndexes.splice(index, 1)
        isFn(onRowSelect) && onRowSelect(selectedIndexes, key)
        this.setState({ selectedIndexes })
    }

    handleAllSelect(selectedIndexes) {
        const { data, onRowSelect } = this.props
        const total = data.size || data.length
        const n = selectedIndexes.length
        selectedIndexes = n === total || n > 0 && n < total ? [] : getKeys(data)
        isFn(onRowSelect) && onRowSelect(selectedIndexes)
        this.setState({ selectedIndexes })
    }

    getTopContent(totalRows, selectedIndexes) {
        let { searchable, selectable, topLeftMenu, topRightMenu } = this.props
        const { keywords, layout } = this.state
        const isMobile = layout === 'mobile'
        topLeftMenu = (topLeftMenu || []).filter(x => !x.hidden)
        topRightMenu = (topRightMenu || []).filter(x => !x.hidden)

        if (topLeftMenu.length + topRightMenu.length === 0 && !searchable) return

        const searchCol = searchable && (
            <Grid.Column key="0" tablet={16} computer={5} style={{ padding: 0 }}>
                <Input
                    icon='search'
                    iconPosition='left'
                    action={!keywords ? undefined : {
                        basic: true,
                        icon: { className: 'no-margin', name: 'close' },
                        onClick: () => this.setState({ keywords: '' })
                    }}
                    onChange={(e, d) => this.setState({ keywords: d.value })}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                        const keywords = e.dataTransfer.getData("Text")
                        if (!keywords.trim()) return
                        this.setState({ keywords })
                    }}
                    placeholder={wordsCap.search}
                    style={!isMobile ? undefined : styles.searchMobile}
                    type="text"
                    value={keywords}
                />
            </Grid.Column>
        )

        const right = selectable && topRightMenu && topRightMenu.length > 0 && (
            <Grid.Column
                computer={3}
                floated="right"
                key="1"
                style={{ padding: 0 }}
                tablet={16}
            >
                <Dropdown
                    button
                    disabled={selectedIndexes.length === 0}
                    fluid
                    style={{ textAlign: 'center' }}
                    text={wordsCap.actions}
                >
                    <Dropdown.Menu direction="left" style={{ minWidth: 'auto' }}>
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
                    {(keywords || totalRows > 0) && (
                        isMobile ? [right, searchCol] : [searchCol, right]
                    )}
                </Grid.Row>
            </Grid>
        )
    }

    getRows(filteredData, columns, selectedIndexes) {
        let { perPage, rowProps, selectable } = this.props
        const { pageNo } = this.state

        return mapItemsByPage(filteredData, pageNo, perPage, (item, key, items, isMap) => (
            <Table.Row
                key={key + (!isMap ? JSON.stringify(item) : '')}
                {...(isFn(rowProps) ? rowProps(item, key, items, isMap) : rowProps || {})}
            >
                {selectable && ( /* include checkbox to select items */
                    <Table.Cell onClick={() => this.handleRowSelect(key, selectedIndexes)} style={styles.checkboxCell}>
                        <Icon
                            name={(selectedIndexes.indexOf(key) >= 0 ? 'check ' : '') + 'square outline'}
                            size="large"
                            className="no-margin"
                        />
                    </Table.Cell>
                )}
                {columns.filter(x => !x.hidden).map((cell, j) => (
                    <Table.Cell
                        {...objWithoutKeys(cell, ['title'])}
                        content={undefined}
                        draggable={cell.draggable !== false}
                        key={j}
                        onDragStart={cell.draggable === false ? undefined : e => e.dataTransfer.setData("Text", e.target.textContent)}
                        style={{
                            cursor: cell.draggable !== false ? 'grab' : undefined,
                            padding: cell.collapsing ? '0 5px' : undefined,
                            ...cell.style
                        }}
                        textAlign={cell.textAlign || 'left'}
                    >
                        {!cell.content ? item[cell.key] : (
                            isFn(cell.content) ? cell.content(item, key, items, isMap) : cell.content
                        )}
                    </Table.Cell>
                ))}
            </Table.Row>
        ))
    }

    getHeaders(totalRows, columns, selectedIndexes) {
        let { selectable } = this.props
        const { sortAsc, sortBy } = this.state

        const headers = columns.filter(x => !x.hidden).map((x, i) => (
            <Table.HeaderCell
                key={i}
                onClick={() => x.key && this.setState({ sortBy: x.key, sortAsc: sortBy === x.key ? !sortAsc : true })}
                sorted={sortBy !== x.key ? null : (sortAsc ? 'ascending' : 'descending')}
                style={styles.columnHeader}
                textAlign="center"
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
        const title = `${deselect ? texts.deselectAll : texts.selectAll} (${numRows})`
        headers.splice(0, 0, (
            <Table.HeaderCell
                key="checkbox"
                onClick={() => this.handleAllSelect(selectedIndexes)}
                style={styles.checkboxCell}
                title={title}
            >
                <Icon
                    name={iconName}
                    size="large"
                    className="no-margin"
                />
            </Table.HeaderCell >
        ))
        return headers
    }

    getFooter(totalPages, pageNo) {
        let { footerContent, navLimit, pageOnSelect } = this.props
        const { layout } = this.state
        const isMobile = layout === 'mobile'

        return (
            <React.Fragment>
                {footerContent && <div style={{ float: 'left', width: isMobile ? '100%' : undefined }}>{footerContent}</div>}
                {totalPages <= 1 ? undefined : (
                    <Paginator
                        total={totalPages}
                        current={pageNo}
                        navLimit={navLimit}
                        float={isMobile ? undefined : 'right'}
                        onSelect={pageNo => { this.setState({ pageNo }); isFn(pageOnSelect) && pageOnSelect(pageNo); }}
                    />
                )}
            </React.Fragment>
        )
    }

    render() {
        let { data, columns: columnsOriginal, emptyMessage, footerContent, perPage, searchExtraKeys } = this.props
        let { keywords, pageNo, selectedIndexes, sortAsc, sortBy } = this.state
        keywords = keywords.trim()
        const columns = columnsOriginal.filter(x => !!x && !x.hidden)
        const keys = columns.filter(x => !!x.key).map(x => x.key)
        // Include extra searchable keys that are not visibile on the table
        if (isArr(searchExtraKeys)) {
            searchExtraKeys.forEach(key => keys.indexOf(key) === -1 & keys.push(key))
        }
        const filteredData = sort(
            !keywords ? data : search(data, keywords, keys),
            sortBy,
            !sortAsc,
            false
        )
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
            emptyMessage = { content: texts.noResultsMsg }
        }
        return (
            <div className="data-table">
                {this.getTopContent(totalRows, selectedIndexes)}

                <div style={styles.tableContent}>
                    {totalRows === 0 && emptyMessage && <Message {...emptyMessage} />}
                    {totalRows > 0 && (
                        <Table celled selectable sortable unstackable singleLine>
                            <Table.Header>
                                <Table.Row>
                                    {headers}
                                </Table.Row>
                            </Table.Header>

                            <Table.Body>
                                {rows}
                            </Table.Body>

                            {!footerContent && totalPages <= 1 ? undefined : (
                                <Table.Footer>
                                    <Table.Row>
                                        <Table.HeaderCell colSpan={columns.length + 1}>
                                            {this.getFooter(totalPages, pageNo)}
                                        </Table.HeaderCell>
                                    </Table.Row>
                                </Table.Footer>
                            )}
                        </Table>
                    )}
                </div>
            </div>
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
            hidden: PropTypes.bool,
            key: PropTypes.string,
            title: PropTypes.string.isRequired
        })
    ).isRequired,
    // Object key to set initial sort by
    defaultSort: PropTypes.string,
    defaultSortAsc: PropTypes.bool.isRequired,
    emptyMessage: PropTypes.object,
    footerContent: PropTypes.any,
    // total of page numbers to be visible including current
    navLimit: PropTypes.number,
    // loading: PropTypes.bool,
    perPage: PropTypes.number,
    rowProps: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.object
    ]),
    searchable: PropTypes.bool,
    searchExtraKeys: PropTypes.array,
    selectable: PropTypes.bool,
    topLeftMenu: PropTypes.arrayOf(PropTypes.object),
    topRightMenu: PropTypes.arrayOf(PropTypes.object)
}
DataTable.defaultProps = {
    columns: [],
    data: [],
    defaultSortAsc: true,
    emptyMessage: {
        content: texts.noDataAvailable,
        status: 'basic'
    },
    navLimit: 5,
    pageNo: 1,
    perPage: 10,
    searchable: true,
    selectable: false,
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