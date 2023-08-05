import React, {
    isValidElement,
    useEffect,
    useState,
} from 'react'
import PropTypes from 'prop-types'
import {
    EMAIL_REGEX,
    isFn,
    isStr,
    textEllipsis,
    URL_REGEX,
} from '../utils/utils'
import { useInverted } from '../utils/window'

/**
 * @name	StringReplace
 * @summary	
 * 
 * @param	{String|*}	children    if not string, it will be stringified.
 * @param   {Sting|*}   Component   (optonal) wrapper component for matched strings
 *                                  Default: `span`
 * @param   {String|*}  content     alternative to `children`
 * @param   {Function}  replacer    (optional) callback to replace the matched values
 * @param	{RegExp}	regex		(optional) Regular expression to match texts to be replaced.
 * 									Default: regex that matches quoted texts
 * 
 * @example 
 * ```javascript
 * <StringReplace>This is "quoted" text</StringReplace>
 * 
 * // Result: ['This is ', <b>"quoted"</b>, ' text']
 * ```
 * 
 * @returns {[]Element}
 */
const StringReplace = props => {
    let {
        children,
        Component = 'span',
        componentProps,
        content = children || '',
        regex,
        replacer,
        unmatchedReplacer,
    } = props
    if (!(regex instanceof RegExp) || isValidElement(content)) return content
    const [elements, setElements] = useState([])

    content = isStr(content)
        ? content
        : JSON.stringify(content, null, 4)

    useEffect(() => {
        try {
            const matches = content.match(regex)
            let elements = [content]
            if (matches) {
                const replacements = matches.map(str =>
                    <Component {...(
                        isFn(componentProps)
                            ? componentProps(str)
                            : componentProps
                    )}>
                        {isFn(replacer)
                            ? replacer(str)
                            : str}
                    </Component>
                )
                matches.forEach((match, i) => {
                    elements = elements.map(s =>
                        isValidElement(s) // already replaced
                            ? s
                            : `${s}`
                                .split(match)
                                .map((x, j) =>
                                    j === 0
                                        ? [x]
                                        : [replacements[i], x])
                    )
                        // double flattening required due to 3-dimentional Array
                        .flat().flat()
                })
            }
            elements = elements.map((unmatched, i) =>
                <React.Fragment {...{
                    children: isFn(unmatchedReplacer) && !isValidElement(unmatched)
                        ? unmatchedReplacer(unmatched)
                        : unmatched,
                    key: i
                }} />
            )
            setElements(elements)
        } catch (err) {
            console.warn('StringReplace', err)
        }
    }, [content])

    return elements
}
export default StringReplace

/**
 * @name    Embolden
 * @summary turns quoted strings into bold text.
 * 
 * @param   {Object}    props 
 * @param   {RegExp}    props.regex         (optional) regular expression to match and embolden texts.
 *                                          Default: `/"[^"]+"/g`
 * @param   {keepQuotes} props.keepQuotes   (optional) whether to keep the double quotes or remove them.
 *                                          Default: `true`
 * 
 * @returns {Element}
 */
export const Embolden = props => (
    <StringReplace {...{
        ...props,
        replacer: quoted => {
            quoted = !props.keepQuotes
                ? quoted.replace(/\"/g, '')
                : quoted
            return isFn(props.replacer)
                ? replacer(quoted)
                : quoted
        },
    }} />
)
Embolden.propTypes = {
    keepQuotes: PropTypes.bool,
    //... all other properties accepted by <StringReplace />
}
Embolden.defaultProps = {
    Component: 'b',
    keepQuotes: true,
    regex: /"[^"]+"/g,
}

/**
 * @name    Linkify
 * @summary turns URLs and email addresses into clickable links
 * 
 * @param   {Object}    props
 * 
 * @returns {Element}
 */
export const Linkify = props => {
    const {
        componentProps,
        removeHttps,
        replacer,
        shorten,
    } = props
    const inverted = useInverted()
    return (
        <StringReplace {...{
            ...props,
            // must re-render on dark mode change
            key: inverted,
            componentProps: url => {
                const cProps = isFn(componentProps)
                    ? componentProps(url)
                    : componentProps
                const urlProps = {
                    href: url.match(EMAIL_REGEX)
                        ? `mailto:${url}`
                        : !/^[a-zA-z]+\:/.test(url) // add protocol if missing
                            ? `https://${url}`
                            : url,
                    target: '_blank',
                    ...cProps,
                }

                return urlProps
            },
            replacer: !shorten
                ? replacer
                : url => {
                    try {
                        let shortUrl = !removeHttps
                            ? url
                            : url.replace(/^(http|https)\:\/\//, '')
                        if (shorten) shortUrl = textEllipsis(
                            shortUrl,
                            shorten,
                            5,
                            false,
                        )
                        const finalUrl = isFn(replacer)
                            ? replacer(shortUrl, url)
                            : shortUrl
                        return finalUrl
                    } catch (err) {
                        console.warn('Linkify', err)
                        return url
                    }
                }
        }} />
    )
}
Linkify.propTypes = {
    removeHttps: PropTypes.bool,
    shorten: PropTypes.number,
    // @replacer function: args => (shortUrl, url)
    replacer: PropTypes.func,
    //... all properties accepted by <StringReplace />
}
Linkify.defaultProps = {
    Component: 'a',
    regex: URL_REGEX,
    removeHttps: true,
    shorten: 45,
}
