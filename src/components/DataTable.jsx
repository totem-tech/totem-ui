import React, { Component, isValidElement } from 'react'
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
	arrMapSlice,
	getKeys,
	isArr,
	isFn,
	objWithoutKeys,
	search,
	sort,
	isStr,
	arrUnique,
	isObj,
	isDefined,
} from '../utils/utils'
import { Invertible } from './Invertible'
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

const textsCap = translated(
	{
		actions: 'actions',
		deselectAll: 'deselect all',
		noDataAvailable: 'no data available',
		noResultsMsg: 'your search yielded no results',
		search: 'search',
		selectAll: 'select all',
	},
	true
)[1]

export default class DataTable extends Component {
	constructor(props) {
		super(props)

		let { columns, defaultSort, defaultSortAsc, pageNo, sortBy } = props
		if (!defaultSort && sortBy !== false) {
			const { key, sortKey } = columns.find(x =>
				!!x.key && x.sortable !== false
			) || {}
			defaultSort = sortKey || key
		}
		this.state = {
			isMobile: rxLayout.value === MOBILE,
			keywords: undefined,
			pageNo: pageNo,
			selectedIndexes: [],
			sortAsc: defaultSortAsc, // ascending/descending sort
			sortBy: defaultSort,
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
		const paginator = totalPages > 1 && (
			<Paginator {...{
				current: pageNo,
				float: isMobile ? 'left' : 'right',
				key: 'paginator',
				navLimit: navLimit,
				total: totalPages,
				onSelect: this.handlePageSelect,
			}} />
		)
		const footer = footerContent && (
			<div {...{
				children: footerContent,
				key: 'footer-content',
				style: { float: !!paginator ? 'left' : '' },
			}} />
		)
		return [paginator, footer].filter(Boolean)
	}

	getHeaders(totalRows, columns, selectedIndexes) {
		let { columnsHidden, headers: showHeaders, selectable, tableProps: tp } = this.props
		if (!showHeaders) return

		const { sortAsc, sortBy } = this.state
		const { sortable } = { ...DataTable.defaultProps.tableProps, ...tp }

		const columnsVisible = columns.filter(
			x => !columnsHidden.includes(x.name) && !x.hidden
		)
		const headers = columnsVisible.map((x, i) => {
			const columnSortable = sortable && x.key && x.sortable !== false
			const sortKey = x.sortKey || x.key
			return (
				<Table.HeaderCell {...{
					...x.headerProps,
					content: x.title,
					key: i,
					onClick: () =>
						columnSortable &&
						this.setState({
							sortBy: sortKey,
							sortAsc: sortBy === sortKey ? !sortAsc : true,
						}),
					sorted:
						sortBy !== sortKey
							? null
							: sortAsc
							? 'ascending'
							: 'descending',
					style: {
						...(x.headerProps || {}).style,
						...styles.columnHeader,
					},
					textAlign: 'center',
				}} />
			)
		})

		if (!selectable) return headers
		// include checkbox to select items
		const n = selectedIndexes.length
		const iconName = `${n > 0 ? 'check ' : ''}square${
			n === 0 || n != totalRows ? ' outline' : ''
		}`
		const deselect = n === totalRows
			|| (n > 0 && n < totalRows)
		const numRows = deselect ? n : totalRows
		const t = deselect
			? textsCap.deselectAll
			: textsCap.selectAll
		const title = `${t} (${numRows})`
		headers.splice(
			0,
			0,
			<Table.HeaderCell
				key='checkbox'
				onClick={() => this.handleSelectAll(selectedIndexes)}
				style={styles.checkboxCell}
				title={title}
			>
				<Icon name={iconName} size='large' className='no-margin' />
			</Table.HeaderCell>
		)
		return headers
	}

	getRows(filteredData, columns, selectedIndexes, pageNo) {
		let { columnsHidden, perPage, rowProps, selectable } = this.props
		const nonAttrs = [
			'content',
			'draggableValueKey',
			'headerProps',
			'sortable',
			'sortKey',
			'title',
		]
		return mapItemsByPage(
			filteredData,
			pageNo,
			perPage,
			(item, key, items, isMap) => (
				<Table.Row {...{
					key,
					...(isFn(rowProps)
						? rowProps(item, key, items, this.props)
						: rowProps || {}),
				}} >
					{selectable /* include checkbox to select items */ && (
						<Table.Cell
							onClick={() =>
								this.handleRowSelect(key, selectedIndexes)
							}
							style={styles.checkboxCell}
						>
							<Icon
								className='no-margin'
								name={
									(selectedIndexes.indexOf(key) >= 0
										? 'check '
										: '') + 'square outline'
								}
								size='large'
							/>
						</Table.Cell>
					)}
					{columns.filter(({ hidden, name }) =>
						!hidden && !columnsHidden.includes(name)
					)
						.map((cell, j) => {
							let {
								collapsing,
								content,
								draggable,
								draggableValueKey,
								key: contentKey,
								onDragStart,
								style,
								textAlign = 'left',
								title,
							} = cell || {}
							draggable = draggable !== false
							content = isFn(content)
								? content(item, key, items, this.props)
								: cell.content || item[contentKey]
							style = {
								cursor: draggable ? 'grab' : undefined,
								padding: collapsing ? '0 5px' : undefined,
								...style,
							}
							const dragValue = draggableValueKey
								? item[draggableValueKey] || ''
								: null
							const props = {
								...objWithoutKeys(cell, nonAttrs),
								key: key + j,
								draggable,
								onDragStart: !draggable
									? undefined
									: this.handleDragStartCb(dragValue, onDragStart, item),
								style,
								textAlign,
							}
							if (!isValidElement(content) && isObj(content)) {
								// Prevents Objects being thrown on DOM which can cause error being thrown by React
								console.warn('DataTable: unwanted object found on', {
									key: contentKey,
									title: title,
									content,
								})
								content = JSON.stringify(content, null, 4)
							}
							return <Table.Cell {...props}>{content}</Table.Cell>
						})}
				</Table.Row>
			)
		)
	}

	getTopContent(totalRows, selectedIndexes) {
		let {
			data,
			keywords: keywordsP,
			searchable,
			searchHideOnEmpty,
			searchOnChange,
			selectable,
			showSelectedCount,
			topLeftMenu: actionButtons,
			topRightMenu: menuOnSelect,
		} = this.props
		const {
			isMobile,
			keywords = keywordsP,
		} = this.state
		actionButtons = (actionButtons || [])
			.filter(x => !x.hidden)
		menuOnSelect = (menuOnSelect || [])
			.filter(x => !x.hidden)
		const showSearch = searchable && (
			keywords
			|| totalRows > 0
			|| !searchHideOnEmpty
		)
		const numItems = actionButtons.length + menuOnSelect.length
		if ( numItems === 0 && !showSearch) return

		const hasSearchOnChange = isFn(searchOnChange)
		const showActions = selectable
			&& menuOnSelect
			&& menuOnSelect.length > 0
			&& selectedIndexes.length > 0
		const triggerSearchChange = keywords => {
			this.setState({ keywords })
			hasSearchOnChange && searchOnChange(keywords, this.props)
		}
		const showCount = !!showSelectedCount && !!selectedIndexes.length
		const actions = showActions && (
			<Dropdown {...{
				button: true,
				disabled: selectedIndexes.length === 0,
				fluid: isMobile,
				style: {
					margin: !isMobile ? undefined : '5px 0',
					textAlign: 'center',
				},
				// // Semantic only allows string. Grrrr!
				// text: (
				// 	<span>
				// 		{textsCap.actions}
				// 		{showCount && (
				// 			<span style={{ color: 'grey' }}>
				// 				{' '}({selectedIndexes.length})
				// 			</span>
				// 		)}
				// 	</span>
				// ),
				text: `${textsCap.actions}${!showCount ? '' : ' (' + selectedIndexes.length + ')'}`
			}}>
				<Dropdown.Menu direction='right' style={{ minWidth: 'auto' }}>
					{menuOnSelect.map((item, i) =>
						React.isValidElement(item) && item || (
							<Dropdown.Item {...{
								...item,
								key: i,
								onClick: () => isFn(item.onClick)
									&& item.onClick(selectedIndexes) 
							}} />
						)
					)}
				</Dropdown.Menu>
			</Dropdown>
		)

		// if searchable is a valid element search is assumed to be externally handled
		const searchEl = showSearch &&
			(React.isValidElement(searchable)
			&& searchable
			|| (
				<Input {...{
					action: !keywords
						? undefined
						: {
								basic: true,
								icon: {
									className: 'no-margin',
									name: 'close',
								},
								onClick: () => triggerSearchChange(''),
							},
					fluid: isMobile,
					icon: 'search',
					iconPosition: 'left',
					onChange: (_, d) => triggerSearchChange(d.value),
					onDragOver: e => e.preventDefault(),
					onDrop: e => {
						const keywords = e.dataTransfer.getData('Text')
						if (!keywords.trim()) return
						triggerSearchChange(keywords)
					},
					placeholder: textsCap.search,
					type: 'search', // enables escape to clear
				value: keywords || '',
			}} />
		))
		
		const leftBtns = (
			<Grid.Column
				tablet={16}
				computer={showSearch ? 9 : 16}
				style={{ padding: 0 }}
			>
				{!isMobile && actions}
				{actionButtons.map((item, i) => {
					if (React.isValidElement(item) || !isObj(item)) return item
					let { El = Button, onClick, style } = item
					return (
						<El {...{
							...objWithoutKeys(item, ['El']),
							fluid: isMobile,
							key: i,
							onClick: !isFn(onClick)
								? null
								: e => onClick(selectedIndexes, data, e),
							style: {
								...(isMobile ? { marginBottom: 5 } : {}),
								...style,
							},
						}} />
					)
				})}
			</Grid.Column>
		)

		return (
			<Grid columns={showSearch ? 2 : 1} style={styles.tableTopContent}>
				<Grid.Row>
					{leftBtns}
					<Grid.Column
						tablet={16}
						computer={7}
						style={{
							padding: 0,
							textAlign: 'right',
						}}
					>
						{searchEl}
						{isMobile && actions}
					</Grid.Column>
				</Grid.Row>
			</Grid>
		)
	}

	handleDragStartCb = (dragValue, onDragStart, item) => e => {
		e.dataTransfer.setData(
			'Text',
			dragValue !== null
				? `${dragValue}`
				: e.target.textContent,
		)
		isFn(onDragStart) && onDragStart(e, dragValue, item)
	}

	handlePageSelect = pageNo => {
		const { pageOnSelect } = this.props
		this.setState({ pageNo })
		isFn(pageOnSelect) && pageOnSelect(pageNo, this.props)
	}

	handleRowSelect(currentIndex, selectedIndexes) {
		const { onRowSelect } = this.props
		const index = selectedIndexes.indexOf(currentIndex)
		index < 0
			? selectedIndexes.push(currentIndex)
			: selectedIndexes.splice(index, 1)
		isFn(onRowSelect) && onRowSelect(selectedIndexes, currentIndex)
		this.setState({ selectedIndexes })
	}

	handleSelectAll(selectedIndexes) {
		const { data, onRowSelect } = this.props
		const total = data.size || data.length
		const n = selectedIndexes.length
		selectedIndexes = n === total || (n > 0 && n < total)
			? []
			: getKeys(data)
		isFn(onRowSelect) && onRowSelect(selectedIndexes)
		this.setState({ selectedIndexes })
	}

	render() {
		let {
			columns: columnsOriginal,
			data,
			emptyMessage,
			footerContent,
			keywords: keywordsP,
			perPage,
			searchExtraKeys,
			style,
			tableProps,
		} = this.props
		let { keywords, pageNo, selectedIndexes, sortAsc, sortBy } = this.state

		keywords = `${isDefined(keywords) ? keywords : keywordsP || ''}`.trim()
		const columns = columnsOriginal.filter(x => !!x && !x.hidden)
		// Include extra searchable keys that are not visibile on the table
		const keys = arrUnique([
			...columns
				.filter(x => !!x.key)
				.map(x => x.key),
			...(searchExtraKeys || []),
		])
		let filteredData = !keywords
			? data
			: search(data, keywords, keys)
		filteredData = !sortBy
			? filteredData
			: sort(filteredData, sortBy, !sortAsc, false)
		selectedIndexes = selectedIndexes.filter(
			index => !!(isArr(data) ? data[index] : data.get(index))
		)
		// actual total
		const totalItems = data.size || data.length
		// filtered total
		const totalRows = filteredData.length || filteredData.size || 0
		const totalPages = Math.ceil(totalRows / perPage)
		pageNo = pageNo > totalPages ? 1 : pageNo
		this.state.pageNo = pageNo
		const headers = this.getHeaders(totalRows, columns, selectedIndexes)
		const rows = this.getRows(
			filteredData,
			columns,
			selectedIndexes,
			pageNo
		)

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
				style: {
					margin: 0,
					padding: 0,
					...style,
				},
			}} >
				{this.getTopContent(totalRows, selectedIndexes)}

				<div style={styles.tableContent}>
					{totalRows === 0 && emptyMessage && (
						<Message {...emptyMessage} />
					)}
					{totalRows > 0 && (
						<Invertible {...{
							...DataTable.defaultProps.tableProps, // merge when prop supplied
							...tableProps,
							El: Table,
						}} >
							<Table.Header>
								<Table.Row>{headers}</Table.Row>
							</Table.Header>

							<Table.Body>{rows}</Table.Body>

							{!footerContent && totalPages <= 1 ? undefined : (
								<Table.Footer>
									<Table.Row>
										<Table.HeaderCell
											colSpan={columns.length + 1}
										>
											{this.getFooter(totalPages, pageNo)}
										</Table.HeaderCell>
									</Table.Row>
								</Table.Footer>
							)}
						</Invertible>
					)}
				</div>
			</Invertible>
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
			// function/element/string: content to display for the each cell on this column.
			// function props: currentItem, key, allItems, props
			content: PropTypes.any,
			// indicates whether column cell should be draggable.
			// Default: true
			draggable: PropTypes.bool,
			// Property that should be used when dropped.
			// Default: text content of the cell
			draggableValueKey: PropTypes.string,
			// column header cell properties
			headerProps: PropTypes.object,
			// whether to hide the column
			hidden: PropTypes.bool,
			// object property name. The value of the property will be displayed only if `content` is not provided.
			key: PropTypes.string,
			// (optional) specify a name for the column. Can be useful to hide the column externally using `columnsHidden` prop
			name: PropTypes.string,
			// (optional) specify a key to use for sorting this column. Can be used when column content is React Element
			// if undefined, will use `key` for sorting purposes
			sortKey: PropTypes.string,
			// indicates whether this column should be sortable
			// if undefined, will use tableProps.sortable
			sortable: PropTypes.bool,
			title: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
		})
	).isRequired,
	// array of column `name`s to hide
	columnsHidden: PropTypes.array,
	// Object key to set initial sort by
	defaultSort: PropTypes.string,
	defaultSortAsc: PropTypes.bool.isRequired,
	emptyMessage: PropTypes.oneOfType([
		PropTypes.object,
		PropTypes.string,
		PropTypes.object,
	]),
	footerContent: PropTypes.any,
	headers: PropTypes.bool,
	// Search keywords. If search input is visible, this will set only the initial value.
	keywords: PropTypes.string,
	// total of page numbers to be visible including current
	navLimit: PropTypes.number,
	// event triggered whenever a row is de/selected.
	// args: [selectedIndexes Array, currentIndex]
	// If data is a Map, index is the key of the entry related to the row.
	onRowSelect: PropTypes.func,
	// event triggered when a page is selected by user.
	// args: [pageNo Number, props Object]
	pageOnSelect: PropTypes.func,
	// loading: PropTypes.bool,
	perPage: PropTypes.number,
	rowProps: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
	// Indicates whether table should be searchable and the search input be visible
	// If element supplied, the `keywords` prop is expected to be set externally
	searchable: PropTypes.oneOfType([PropTypes.bool, PropTypes.element]),
	searchExtraKeys: PropTypes.array,
	searchHideOnEmpty: PropTypes.bool,
	searchOnChange: PropTypes.func,
	selectable: PropTypes.bool,
	// if truthy, will show number of items selected
	showSelectedCount: PropTypes.bool,
	tableProps: PropTypes.object.isRequired, // table element props
	topLeftMenu: PropTypes.arrayOf(PropTypes.object),
	topRightMenu: PropTypes.arrayOf(PropTypes.object),
}
DataTable.defaultProps = {
	columns: [],
	columnsHidden: [],
	data: [],
	defaultSortAsc: true,
	emptyMessage: {
		content: textsCap.noDataAvailable,
		status: 'basic',
	},
	headers: true,
	navLimit: 5,
	pageNo: 1,
	perPage: 10,
	searchable: true,
	searchHideOnEmpty: true,
	selectable: false,
	showSelectedCount: true,
	tableProps: {
		celled: true,
		selectable: true,
		sortable: true,
		unstackable: true,
		singleLine: false,
	},
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
	tableContent: {
		display: 'block',
		margin: '1rem 0',
		overflowX: 'auto',
		width: '100%',
	},
	tableTopContent: {
		margin: '-1rem 0',
		width: '100%',
	},
}
