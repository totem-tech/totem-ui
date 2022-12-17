import React from 'react'
import {
    className,
    isFn,
    isMap,
    isObj,
    objWithoutKeys
} from '../utils/utils'
import DataTable from './DataTable'

const DataTableVertical = (props) => {
    let {
        columns = [],
        columnsHidden = [],
        data: items = [],
        tableProps = {},
    } = props
    if (isObj(items)) items = [items]
    columns = columns.filter(x =>
        !!x
        && !x.hidden
        && !columnsHidden.includes(x.name || x.key)
    )

    const vData = columns.map(column => {
        const { content, key, title } = column
        const isAMap = isMap(items)
        const row = Array
            .from(items)
            .map((x, i) => {
                const index = isAMap
                    ? x[0]
                    : i
                const item = isAMap
                    ? x[1]
                    : x
                return isFn(content)
                    ? content(item, index, items, props)
                    : item[key]
            })
        return [title, ...row]
    })
    const maxLen = vData.reduce((max, next) =>
        next.length > max
            ? next.length
            : max,
    0)
    const vColumns = new Array(maxLen)
        .fill(0)
        .map((_, i) => ({
            ...i === 0 && objWithoutKeys(columns[0], 'key', 'content'),
            active: i === 0,
            draggable: false,
            key: `${i}`,
            style: {
                fontWeight:  i > 0 
                    ? undefined
                    : 'bold',
                paddingLeft: i == 0
                    ? 25
                    : undefined,
                paddingRight: i === maxLen - 1
                    ? 25
                    : undefined,
                ...columns[0].style,
            },
        }))
        
    return (
        <DataTable {...{
            perPage: columns.length,
            ...props,
            columns: vColumns,
            data: vData,
            headers: false,
            searchable: false,
            sortBy: false,
            tableProps: {
                className: className([
                    tableProps.className,
                    'vertical',
                ]),
                ...tableProps,
            }
        }} />
    )
}
DataTableVertical.defaultProps = {
    // columns: [
    //     { key: 'first', title: 'First' },
    //     { key: 'second', title: 'Second' },
    //     { key: 'third', title: 'Third' },
    // ],
    // data: [
    //     { first: 'first', second: 'second', third: 'third' },
    //     { first: 'first', second: 'second', third: 'third' },
    //     { first: 'first', second: 'second', third: 'third' },
    //     { first: 'first', second: 'second', third: 'third' },
    // ],
    // // "data" to be rotated to "dataV"
    // dataV: [
    //     { 0: 'first', 1: 'first', 2: 'first', 3: 'first' },
    //     { 0: 'second', 1: 'second', 1: 'second', 3: 'second' },
    //     { 0: 'third', 1: 'third', 2: 'third', 3: 'third' },
    // ],
}
export default React.memo(DataTableVertical)