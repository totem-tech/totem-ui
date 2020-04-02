import React, {Component} from 'react'
import {Bond} from 'oo7'
import {Dropdown, Checkbox} from 'semantic-ui-react'
import FormBuilder, { findInput } from '../../components/FormBuilder'
// services
import {convertTo, currencies, currencyDefault, selected as selectedCurrency} from '../../services/currency'
import {bond, getSelected} from '../../services/identity'
import {translated} from '../../services/language'
import partners from '../../services/partner'
import { arrSort } from '../../utils/utils'

const [texts, textsCap] = translated({
    assignee: 'assignee',
    assigneePlaceholder: 'select a partner identity',
    assignToPartner: 'assign to a partner',
    buyLabel: 'payment direction',
    buyOptionLabelBuy: 'i will receive the reward',
    buyOptionLabelSell: 'i will pay the reward',
    currency: 'currency',
    description: 'description',
    descriptionPlaceholder: 'enter description about the task',
    formHeader: 'create task',
    myself: 'myself',
    publishToMarketPlace: 'publish to marketplace',
    rewardLabel: 'reward amount',
    rewardPlaceholder: 'enter reward amount',
    showAdvancedLabel: 'show advanced options',
    tags: 'tags',
    title: 'title',
    titlePlaceholder: 'enter a short title'
}, true)

export default class Form extends Component {
    constructor(props) {
        super(props)

        // list of input names
        this.names = Object.freeze({
            advancedGroup: 'advancedGroup',
            buy: 'buy',
            assignee: 'assignee',
            currency: 'currency',
            description: 'description',
            publish: 'publish',
            reward: 'reward',
            showAdvanced: 'showAdvanced',
            tags: 'tags',
            title: 'title',
        })

        this.currency = selectedCurrency()
        
        this.state = {
            onChange: (_, values) => this.setState({values}),
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
                    label: textsCap.description,
                    max: 500,
                    min: 3,
                    name: this.names.description,
                    placeholder: texts.descriptionPlaceholder,
                    required: true,
                    type: 'textarea',
                    value: '',
                },
                {
                    inline: true,
                    multiple: false,
                    name: this.names.publish,
                    onChange: this.handlePublishChange,
                    radio: true,
                    options: [
                        { label: textsCap.assignToPartner, value: false },
                        { label: textsCap.publishToMarketPlace, value: true },
                    ],
                    type: 'checkbox-group',
                    value: true,
                },
                {
                    hidden: true,
                    label: textsCap.assignee,
                    name: this.names.assignee,
                    options: [],
                    placeholder: textsCap.assigneePlaceholder,
                    required: true,
                    selection: true,
                    search: true,
                    type: 'dropdown',
                },
                {
                    bond: new Bond(),
                    label: textsCap.rewardLabel,
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
                    min: 0, // allows reward-free tasks
                    name: this.names.reward,
                    placeholder: textsCap.rewardPlaceholder,
                    required: true,
                    type: 'number',
                    useInput: true,
                    value: 0,
                },
                {
                    label: textsCap.showAdvancedLabel,
                    name: this.names.showAdvanced,
                    onChange: this.toggleAdvanced,
                    type: 'Checkbox',
                },
                {
                    // hidden: true,
                    inline: false,
                    name: this.names.advancedGroup,
                    type: 'group',
                    widths: 16,
                    inputs: [
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
                        }
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
        const name = this.names.reward
        const rewardIn = findInput(inputs, name)
        let msg = null
        // check if selected currency is supported by attempting a conversion
        try {
            await convertTo(0, value, currencyDefault)
            this.currency = value
            rewardIn.bond.changed(values[name])
        } catch(error) {
            msg = { content: error, status: 'error'}
        }
        rewardIn.invalid = !!msg
        rewardIn.message = msg
        this.setState({inputs})                                
    }

    handlePublishChange = (_, values) => {
        const {inputs} = this.state
        const publish = values[this.names.publish]
        const assigneeIn = findInput(inputs, this.names.assignee)
        assigneeIn.hidden = publish
        this.setState({inputs})
    }

    handleSubmit = (_, values) => {

    }
    toggleAdvanced = () => {
        const {inputs} = this.state
        const aGroupIn = findInput(inputs, this.names.advancedGroup)
        aGroupIn.hidden = !aGroupIn.hidden
        this.setState({inputs})
    }

    render =()=> <FormBuilder {...{...this.props, ...this.state}} />
}
Form.defaultProps = {
    header: textsCap.formHeader,
    subheader: '',
}