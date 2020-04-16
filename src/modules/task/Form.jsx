import React, {Component} from 'react'
import {Bond} from 'oo7'
import {Dropdown, Checkbox} from 'semantic-ui-react'
import FormBuilder, { findInput } from '../../components/FormBuilder'
// services
import {convertTo, currencies, currencyDefault, selected as selectedCurrency} from '../../services/currency'
import {bond, get as getIdentity, getSelected} from '../../services/identity'
import {translated} from '../../services/language'
import partners from '../../services/partner'
import { arrSort } from '../../utils/utils'

const [texts, textsCap] = translated({
    advancedLabel: 'advanced options',
    assignee: 'select a partner to assign task',
    assigneePlaceholder: 'select from partner list',
    assignToPartner: 'assign to a partner',
    assigneeTypeConflict: 'task type and parter type must be the same.',
    business: 'business',
    buyLabel: 'task type',
    buyOptionLabelBuy: 'buying',
    buyOptionLabelSell: 'selling',
    currency: 'currency',
    description: 'detailed description',
    descriptionPlaceholder: 'enter more details about the task',
    formHeader: 'create a new task',
    marketplace: 'marketplace',
    myself: 'myself',
    personal: 'personal',
    publishToMarketPlace: 'publish to marketplace',
    bountyLabel: 'bounty amount',
    bountyPlaceholder: 'enter bounty amount',
    tags: 'categorise with tags',
    taskType: 'task relationship',
    title: 'task title',
    titlePlaceholder: 'enter a very short task description'
}, true)

export default class Form extends Component {
    constructor(props) {
        super(props)

        // list of input names
        this.names = Object.freeze({
            advancedGroup: 'advancedGroup',
            assignee: 'assignee',
            business: 'business',
            buy: 'buy',
            currency: 'currency',
            description: 'description',
            publish: 'publish',
            bounty: 'bounty',
            tags: 'tags',
            title: 'title',
        })

        this.currency = selectedCurrency()
        const publishDefault = 'no'
        
        this.state = {
            onChange: (_, values) => this.setState({values}),
            onSubmit: this.handleSubmit,
            values: {},
            inputs: [
                {
                    label: textsCap.title,
                    max: 160,
                    min: 3,
                    name: this.names.title,
                    placeholder: textsCap.titlePlaceholder,
                    required: true,
                    type: 'text',
                    value: '',
                },
                {
                    bond: new Bond(),
                    label: textsCap.bountyLabel,
                    inlineLabel: (
                        <Dropdown {...{
                            basic: true,
                            className:'no-margin',
                            defaultValue: this.currency,
                            direction: 'left',
                            onChange: this.handleCurrencyLabelChange,
                            options: Object.keys(currencies).map(value => ({
                                key: value,
                                text: value,
                                title: currencies[value], // description causes texts to overlap
                                value,
                            })),
                        }}/>
                        ),
                    labelPosition: 'right',
                    min: 0, // allows bounty-free tasks
                    name: this.names.bounty,
                    placeholder: textsCap.bountyPlaceholder,
                    required: true,
                    type: 'number',
                    useInput: true,
                    value: 0,
                },
                {
                    inline: true,
                    label: textsCap.marketplace,
                    multiple: false,
                    name: this.names.publish,
                    onChange: this.handlePublishChange,
                    options: [
                        { label: textsCap.assignToPartner, value: 'no' },
                        { label: textsCap.publishToMarketPlace, value: 'yes' },
                    ],
                    radio: true,
                    required: true,
                    type: 'checkbox-group',
                    value: publishDefault,
                },
                {
                    bond: new Bond(),
                    hidden:  (values, i) => {
                        // return !isDefined(values[this.names.business]) || values[this.names.publish] === 'yes' 
                        return values[this.names.publish] === 'yes' ? true : false
                    },
                    label: textsCap.assignee,
                    name: this.names.assignee,
                    options: [],
                    placeholder: textsCap.assigneePlaceholder,
                    required: true,
                    selection: true,
                    search: true,
                    type: 'dropdown',
                    validate: (_, {value}) => {
                        console.log({value, identity: getIdentity(value), value})
                        if (getIdentity(value)) return
                        const isBusiness = !!values[this.names.business]
                        const assigneeIsBusiness = partners.get(value).type === 'business'
                        return isBusiness === assigneeIsBusiness ? null : textsCap.assigneeTypeConflict
                        
                    }
                },
                // Advanced section (Form type "group" with accordion)
                {
                    accordion: {
                        collapsed: true,
                        styled: false, // enable/disable the boxed layout
                    },
                    icon: 'pen',
                    inline: false,
                    label: textsCap.advancedLabel,
                    name: this.names.advancedGroup,
                    type: 'group',
                    styleContainer: {width: '100%'},
                    grouped: true,
                    inputs: [
                        {
                            inline: true,
                            label: textsCap.taskType,
                            name: this.names.business,
                            options: [
                                { label: textsCap.business, value: 1},
                                { label: textsCap.personal, value: 0},
                            ],
                            radio: true,
                            required: true,
                            type: 'checkbox-group',
                        },
                        {
                            inline: true,
                            label: textsCap.buyLabel,
                            name: this.names.buy,
                            options: [
                                { label: textsCap.buyOptionLabelBuy, value: true },
                                { label: textsCap.buyOptionLabelSell, value: false },
                            ],
                            radio: true,
                            type: 'checkbox-group',
                            value: true,
                        },
                        {
                            label: textsCap.description,
                            max: 500,
                            min: 3,
                            name: this.names.description,
                            placeholder: textsCap.descriptionPlaceholder,
                            required: false,
                            type: 'textarea',
                            value: '',
                        },
                        {
                            allowAdditions: true,
                            label: textsCap.tags,
                            multiple: true,
                            name: this.names.tags,
                            onAddItem: (_, {value}) => {
                                const {inputs} = this.state
                                const tagsIn = findInput(inputs, this.names.tags)
                                // option already exists
                                if (tagsIn.options.find(x => x.value === value)) return
                                tagsIn.options = arrSort([...tagsIn.options, {
                                    key: value,
                                    text: value,
                                    value,
                                }], 'text')
                                this.setState({inputs})
                            },
                            options: [],
                            selection: true,
                            search: true,
                            type: 'dropdown',
                        },
                    ],
                },
            ]
        }
    }

    componentWillMount() {
        this.bond = Bond.all([bond, partners.bond])
        this.tieId = this.bond.tie(() => {
            const {inputs} = this.state
            const assigneeIn = findInput(inputs, this.names.assignee)
            const selected = getSelected()
            const options = Array.from(partners.getAll())
                .map(([address, {name, userId}]) => !userId ? null : {
                    description: userId,
                    key: address,
                    text: name,
                    value: address,
                })
                .filter(Boolean)
            if (!options.find(x => x.address === selected.address )) {
                options.push(({
                    description: texts.myself,
                    key: selected.address,
                    text: selected.name,
                    value: selected.address,
                }))
            }

            assigneeIn.options = arrSort(options, 'text')
            this.setState({inputs})
        })
    }

    handleCurrencyLabelChange = async (_, {value})=> {
        const {inputs, values} = this.state
        const name = this.names.bounty
        const bountyIn = findInput(inputs, name)
        let msg = null
        // check if selected currency is supported by attempting a conversion
        try {
            await convertTo(0, value, currencyDefault)
            this.currency = value
            bountyIn.bond.changed(values[name])
        } catch(error) {
            msg = { content: error, status: 'error'}
        }
        bountyIn.invalid = !!msg
        bountyIn.message = msg
        this.setState({inputs})                                
    }

    handlePublishChange = (_, values) => {
        const {inputs} = this.state
        const publish = values[this.names.publish] === 'yes'
        const assigneeIn = findInput(inputs, this.names.assignee)
        assigneeIn.hidden = publish
        this.setState({inputs})
    }

    handleSubmit = (_, values) => {
        console.log({values})
    }

    render =()=> <FormBuilder {...{...this.props, ...this.state}} />
}
Form.defaultProps = {
    header: textsCap.formHeader,
    subheader: '',
}