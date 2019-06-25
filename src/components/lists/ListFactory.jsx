import React from 'react'
import PropTypes from 'prop-types'
import { ReactiveComponent } from 'oo7-react'
import { Button, Card, Container, Icon, Image, Menu } from 'semantic-ui-react'
import { isDefined, isFn, mergeObj } from '../utils'
import { FormInput } from '../forms/FormBuilder'

class ListFactory extends ReactiveComponent {
    constructor(props) {
        super(props)
    }

    render() {
        const { type } = this.props
        
        switch (type.toLowerCase()) {
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
        const isCardListEl = (card) => typeof(card) === CardListItem
        return (
            <Card.Group style={style} itemsPerRow={itemsPerRow || 1}>
                {items.map((card, i) => (
                    isCardListEl ? card : <CardListItem {...card} key={i} />
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

        const menuItems = actions.map((item, i) => {
            item.key = isDefined(item.key) ? item.key : i
            item.as = !isDefined(item.as) || isFn(item.onClick) ? Button : 'div'
            return item
        }).filter(item => !item.hide)
        return (
            <Card fluid={fluid} style={style}>
                <Card.Content content={React.isValidElement(header) ? header : <CardHeader {...header} />} />
                {description  && <Card.Description content={description} />}
                {actionsVisible && <Card.Content extra content={<Menu items={menuItems} widths={menuItems.length} />} />}
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