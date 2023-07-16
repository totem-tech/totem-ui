import React from 'react'
import {
    className,
    isFn,
    isMap,
    isObj,
    objWithoutKeys
} from '../utils/utils'
import DataTable from './DataTable'
import { useIsMobile } from '../utils/reactjs'

const DataTableVertical = React.memo(props => {
    let {
        columns = [],
        columnsHidden = [],
        data: items = [],
        isMobile = useIsMobile(),
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
                    ? content(
                        item,
                        index,
                        items,
                        props,
                    )
                    : content || item[key]
            })
        return [title, ...row]
    })

    const maxLen = vData.reduce((max, next) =>
        next.length > max
            ? next.length
            : max,
        0,
    )

    const padding = isMobile
        ? 15
        : 25
    const vColumns = new Array(maxLen)
        .fill(0)
        .map((_, i) => ({
            active: i === 0,
            draggable: false,
            dynamicProps: (_, index) => {
                const column = { ...columns[index] }
                const isHeader = i === 0
                if (isHeader) return column.headerProps

                // Content is already populated in the `vData`.
                // Remove both `content` and `key` properties.
                delete column.content
                delete column.key
                return column
            },
            key: `${i}`,
            style: {
                fontWeight: i > 0
                    ? undefined
                    : 'bold',
                paddingLeft: i == 0
                    ? padding
                    : undefined,
                paddingRight: i === maxLen - 1
                    ? padding
                    : undefined,
                ...columns[0].style,
            },
        }))

    return (
        <DataTable {...{
            debug: true,
            perPage: columns.length,
            ...props,
            columns: vColumns,
            data: !items?.size && !items.length
                ? [] // if not data provided empty message will be displayed
                : vData,
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
})
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
export default DataTableVertical