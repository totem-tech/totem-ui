import React from 'react'
import PropTypes from 'prop-types'
import uuid from 'uuid'
import { Accordion, Button } from 'semantic-ui-react'
import { isFn, objWithoutKeys } from '../utils/utils'
import { translated } from '../services/language'
import { closeModal, confirm } from '../services/modal'
import { RecursiveShapeType } from '../services/react'
import Text from './Text'
import { useInverted } from '../services/window'

const textsCap = translated({
    faqs: 'frequently asked questions',
}, false)[0]
/**
 * @name    FAQ
 * @summary generates a list of recursive FAQs using Accordion
 * 
 * @param   {Object} props
 * 
 * @returns {Element}
 * @example
 * ```javascript
 * const questions = [
 *      { 
 *          // simple question-answer, default active
 *          active: true,
 *          answer: 'Read the docs!',
 *          question: 'How do I use Totem?',
 *      },
 *      { 
 *          // question with a simple button without render()
 *          action: { 
 *              content: 'Visit out webpage!',
 *              onClick: () => window.location.href = 'https://totemaccounting.com',
 *          },
 *          active: true,
 *          answer: 'Yes, we do!',
 *          question: 'Do you have a webpage?', 
 *      },
 *      {
 *          // question with custom render function
 *          answer: {
 *              text: 'You can use our support chat channel 24/7!',
 *              btnTxt: 'Contact support'
 *          },
 *          question: 'How can I get in touch?',
 *          render: answer => (
 *              <div>
 *                  <p>{answer.text}</p>
 *                  <button className='ui button'>{answer.btnTxt}</button>
 *              </div>
 *          )
 *      }
 * ]
 * // view as inline element
 * const faq = <FAQ questions={questions} exclusive={false} />
 * // open on a modal
 * const modalId = FAQ.asModal({ questions, exclusive: true })
 * ```
 */
export default function FAQ(props) {
    const { exclusive, modalId, questions = [] } = props
    const defaultActiveIndex = exclusive
        ? questions.findIndex(({ active }) => !!active)
        : questions.reduce((arr, { active }, index) => [
            ...arr,
            ...(active ? [index] : []),
        ], [])
    const inverted = useInverted()
    return (
        <Accordion {...{
            ...objWithoutKeys(props, props.ignoredAttributes),
            defaultActiveIndex,
            exclusive,
            inverted,
            panels: questionsToPanels(questions, exclusive, modalId),
        }} />
    )
}
FAQ.propTypes = {
    ignoredAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
    questions: PropTypes.arrayOf(RecursiveShapeType({
        // @action: properties to be supplied to action Button
        action: PropTypes.object,
        // @active: only the first active one will be used to set `defaultActiveIndex` in the `Accordion`
        active: PropTypes.bool,
        // @answer: plain-text if no `@render` function supplied
        answer: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.objectOf(PropTypes.string),
            PropTypes.element,
        ]),
        // children: PropTypes.arrayOf(QuestionShapeType),
        question: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.element,
        ]),
        render: PropTypes.func,
    })).isRequired,
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
 * @name    FAQ.asModal
 * @summary open FAQs on a modal
 * 
 * @param   {Object}    faqProps 
 * @param   {Object}    confirmProps 
 * 
 * @returns {String} modal ID
 */
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
        { className: 'no-padding'}
        // { style: { padding: 0 } },
    )
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
                        exclusive,
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
