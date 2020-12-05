import React from 'react'
import PropTypes from 'prop-types'
import uuid from 'uuid'
import { Accordion, Button } from 'semantic-ui-react'
import { isFn, objWithoutKeys } from '../utils/utils'
import { translated } from '../services/language'
import { closeModal, confirm } from '../services/modal'
import { RecursiveShapeType } from '../services/react'
import Text from './Text'

const textsCap = translated({
    faqs: 'frequently asked questions',
}, false)[0]
/**
 * @name    FAQ
 * @summary generates a list of recursive FAQs using Accordion
 * @param {Object} props
 */
export default function FAQ(props) {
    const { exclusive, modalId, questions = [] } = props
    return (
        <Accordion {...{
            ...objWithoutKeys(props, props.ignoredAttributes),
            defaultActiveIndex: [questions.findIndex(({ active }) => !!active) || 0],
            panels: questionsToPanels(questions, exclusive, modalId),
        }} />
    )
}
FAQ.asModal = (faqProps, confirmProps = {}) => {
    const { modalId = uuid.v1() } = faqProps || {}
    const { content, header = textsCap.faqs } = confirmProps
    return confirm(
        {
            cancelButton: null,
            confirmButton: null,
            ...confirmProps,
            header,
            content: (
                <div>
                    {content && <p style={{ padding: 15 }}>{content}</p>}
                    <FAQ {...{ ...faqProps, modalId }} />
                </div>
            ),
        },
        modalId,
        // remove spacing from confirm content
        { style: { padding: 0 } },
    )
}

/**
 * @name    QuestionPropType
 * @summary custom PropType for recursive validation
 */
// const RecursiveShapeType = (propsTypes = {}, recursiveKey = 'children') => {
//     const x = {}
//     x[recursiveKey] = PropTypes.arrayOf(Type)
//     function Type(...args) {
//         return PropTypes.shape({
//             ...propsTypes,
//             ...x,
//         }).apply(null, args)
//     }
//     return Type
// }
const QuestionShapeType = RecursiveShapeType({
    // @action: properties to be supplied to action Button
    action: PropTypes.object,
    // @active: only the first active one will be used to set `defaultActiveIndex` in the `Accordion`
    active: PropTypes.bool,
    // @answer: plain-text if no `@render` function supplied
    answer: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.objectOf(PropTypes.string),
    ]),
    // children: PropTypes.arrayOf(QuestionShapeType),
    question: PropTypes.string,
    render: PropTypes.func,
})
FAQ.propTypes = {
    ignoredAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
    questions: PropTypes.arrayOf(QuestionShapeType).isRequired,
    // @modalId: If FAQ is displayed in a modal,
    // supplying `modalId` will close the modal whenever question action(button) is clicked
    modalId: PropTypes.string,
    // any other properties supported by `Accordion`
}
FAQ.defaultProps = {
    exclusive: false,
    fluid: true,
    ignoredAttributes: [
        'ignoredAttributes',
        'modalId',
        'questions',
    ],
    styled: true,
}

/**
 * @name    questionsToPanels
 * @summary converts array of questions to array of panels for use with `Accordion`
 * 
 * @param   {Array}     questions 
 * @param   {Boolean}   exclusive 
 * @param   {String}    modalId 
 * 
 * @returns {Array}     panels
 */
const questionsToPanels = (questions, exclusive, modalId) => questions
    .map(({ action, answer, children = [], icon, question, render }, i) => {
        const key = `panel-${i}`
        const { ActionEl = Button } = action || {}
        const defaultActiveIndex = exclusive
            ? children.findIndex(({ active }) => !!active)
            : children.reduce((arr, { active }, index) => [
                ...arr,
                ...(active ? [index] : []),
            ], [])
        const title = [( // keep array to preserve default classNames etc
            <Text {...{
                children: question,
                color: null,
                invertedColor: 'white',
                key: 'children',
            }} />
        )]
        const content = [// keep array to preserve default classNames etc
            <div key='answer'>
                {isFn(render) && render(answer) || answer}
                {children.length > 0 && (
                    <Accordion.Accordion {...{
                        defaultActiveIndex,
                        panels: questionsToPanels(children, exclusive, modalId),
                        style: { margin: 0 },
                    }} />
                )}
            </div>,
            action && (
                <ActionEl {...{
                    ...action,
                    key: 'action',
                    onClick: (...args) => {
                        isFn(action.onClick) && action.onClick(...args)
                        // close modal on action
                        modalId && closeModal(modalId)
                    },
                    style: { marginTop: 15 },
                }} />
            ),
        ].filter(Boolean)
        return { content, icon, key, title }
    })
