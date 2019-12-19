import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button, Card, Icon, Image, Menu } from 'semantic-ui-react'
import { isDefined, isFn } from '../utils/utils'
import { FormInput } from '../components/FormBuilder'
import Paginator from './Paginator'
import DataTable, { mapItemsByPage } from './DataTable'

// ToDo: deprecate?? 
export default class ListFactory extends ReactiveComponent {
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
ListFactory.defaultProps = {
    type: 'DataTable'
}

export class CardList extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            pageNo: props.pageNo || 1,
            perPage: props.perPage || 10
        }
    }

    render() {
        let { items, itemsPerRow, navLimit, pageOnSelect, style } = this.props
        const { pageNo, perPage } = this.state
        const totalPages = Math.ceil(items.length / perPage)
        itemsPerRow = itemsPerRow || 1
        const showPaginator = items.length > perPage
        return (
            <React.Fragment>
                {showPaginator && (
                    <div style={{ textAlign: 'center', margin: 30 }}>
                        <Paginator
                            total={totalPages}
                            current={pageNo}
                            navLimit={navLimit || 3}
                            onSelect={pageNo => { this.setState({ pageNo }); isFn(pageOnSelect) && pageOnSelect(pageNo); }}
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
                name={icon.name || 'question'}
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
                        style={{ cursor: hasOnClick ? 'pointer' : 'default' }}
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