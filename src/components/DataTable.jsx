import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button, Card, Dropdown, Grid, Icon, Image, Input, Menu, Table } from 'semantic-ui-react'
import { arrMapSlice, getKeys, isArr, isDefined, isFn, newMessage, objWithoutKeys, objCopy, search, sort, textCapitalize } from '../utils/utils'
import { FormInput } from '../components/FormBuilder'
import Paginator from './Paginator'
import { layoutBond } from '../services/window'

const mapItemsByPage = (data, pageNo, perPage, callback) => {
    const start = pageNo * perPage - perPage
    const end = start + perPage - 1
    return arrMapSlice(data, start, end, callback)
}
const words = {
    actions: 'actions',
    search: 'search',
}
const wordsCap = textCapitalize(words)
const texts = {
    deselectAll: 'Deselect all',
    noDataAvailable: 'No data availablesssss',
    noResultsMsg: 'Your search yielded no results',
    selectAll: 'Select all',
}

export default class DataTable extends ReactiveComponent {
    constructor(props) {
        super(props, { layout: layoutBond })

        this.state = {
            pageNo: props.pageNo || 1,
            keywords: '',
            selectedIndexes: [],
            sortAsc: true, // ascending/descending sort
            sortBy: props.defaultSort || ((props.columns || []).find(x => !!x.key) || {}).key,
        }
    }

    handleRowSelect(key, selectedIndexes) {
        const { onRowSelect } = this.props
        const index = selectedIndexes.indexOf(key)
        if (index < 0) {
            selectedIndexes.push(key)
        } else {
            selectedIndexes.splice(index, 1)
        }
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
        let { searchable, topLeftMenu, topRightMenu } = this.props
        const { keywords, layout } = this.state
        const isMobile = layout === 'mobile'
        topLeftMenu = (topLeftMenu || []).filter(x => !x.hidden)
        topRightMenu = (topRightMenu || []).filter(x => !x.hidden)

        if (topLeftMenu.length + topRightMenu.length === 0 && !searchable) return

        const searchCol = searchable && (
            <Grid.Column key="0" tablet={16} computer={5} style={{ padding: 0 }}>
                <Input
                    action={{
                        icon: 'search',
                        position: 'right'
                    }}
                    onChange={(e, d) => this.setState({ keywords: d.value })}
                    placeholder={wordsCap.search}
                    style={!isMobile ? undefined : styles.searchMobile}
                    type="text"
                    value={keywords}
                />
            </Grid.Column>
        )

        const right = topRightMenu && topRightMenu.length > 0 && (
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
            <Table.Row key={key} {...(isFn(rowProps) ? rowProps(item, key, items, isMap) : rowProps || {})}>
                {selectable && ( /* include checkbox to select items */
                    <Table.Cell onClick={() => this.handleRowSelect(key, selectedIndexes)} style={styles.checkboxCell}>
                        <Icon
                            name={(selectedIndexes.indexOf(key) >= 0 ? 'check ' : '') + 'square outline'}
                            size="large"
                            className="no-margin"
                        />
                    </Table.Cell>
                )}
                {columns.map((cell, j) => (
                    <Table.Cell
                        {...objWithoutKeys(cell, ['title'])}
                        key={j}
                        content={undefined}
                        textAlign={cell.textAlign || 'left'}
                        style={objCopy(cell.style, { padding: cell.collapsing ? '0 5px' : undefined })}
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

        const headers = columns.map((x, i) => (
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
        headers.splice(0, 0, (
            <Table.HeaderCell
                key="checkbox"
                onClick={() => this.handleAllSelect(selectedIndexes)}
                style={styles.checkboxCell}
                title={n === totalRows || n > 0 && n < totalRows ? texts.deselectAll : texts.selectAll}
            >
                <Icon
                    name={iconName}
                    size="large"
                    className="no-margin"
                />
            </Table.HeaderCell>
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
                        navLimit={navLimit || 5}
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
                    {totalRows === 0 ? emptyMessage && newMessage(emptyMessage) : (
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
            key: PropTypes.string,
            title: PropTypes.string.isRequired
        })
    ),
    // Object key to set initial sort by
    defaultSort: PropTypes.string,
    emptyMessage: PropTypes.object,
    footerContent: PropTypes.any,
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
    data: [],
    emptyMessage: {
        content: texts.noDataAvailable,
        status: 'basic'
    },
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