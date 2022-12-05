import React, { isValidElement } from 'react'
import PropTypes from 'prop-types'
import { EMAIL_REGEX, isFn, isStr, URL_REGEX } from '../utils/utils'

/**
 * @name	StringReplace
 * @summary	embolden quoted texts
 * 
 * @param	{String|*}	children    if not string, it will be stringified.
 * @param   {Sting|*}   Component   (optonal) Default: `span`
 * @param   {String|*}  content     alternative to `children`
 * @param   {Function}  modifier    (optional) callback to modify the matched values to be displayed
 * @param	{RegExp}	regex		(optional) Regular expression to match texts to be embolden.
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
        content = children,
        modifier,
        regex,
        unmatchedModifier,
    } = props
    if (!(regex instanceof RegExp) || isValidElement(content)) return content
    
    content = isStr(content)
        ? content
        : JSON.stringify(content, null, 4)

	const matches = content.match(regex)
	let arr = [content]
	if (matches) {
        const replacements = matches.map(str =>
            <Component {...(
                isFn(componentProps)
                    ? componentProps(str)
                    : componentProps
            )}>
                {isFn(modifier)
                    ? modifier(str)
                    : str}
            </Component>
        )
		matches.forEach((match, i) => {
            arr = arr.map(s =>
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
    arr = arr.map((children, i) =>
        <React.Fragment {...{
            children: isFn(unmatchedModifier) && !isValidElement(children)
                ? unmatchedModifier(children)
                : children,
            key: i
        }} />
    )
	return arr
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
        modifier: quoted => {
            quoted = !props.keepQuotes
                ? quoted.replace(/\"/g, '')
                : quoted
            return isFn(modifier)
                ? modifier(quoted)
                : quoted
        },
    }} />
)
Embolden.propTypes = {
    keepQuotes: PropTypes.bool,
    modifier: PropTypes.func,
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
export const Linkify = props => (
    <StringReplace {...{
        ...props,
        componentProps: url => {
            const cProps = {
                href: url,
                target: '_blank',
                ...isFn(props.componentProps)
                    ? props.componentProps(url)
                    : props.componentProps,
            }
            if (url.match(EMAIL_REGEX)) cProps.href = `mailto:${url}`
            return cProps
        },
    }} />
)
Linkify.propTypes = {
    //... all properties accepted by <StringReplace />
}
Linkify.defaultProps = {
    Component: 'a',
    regex: URL_REGEX,
}
