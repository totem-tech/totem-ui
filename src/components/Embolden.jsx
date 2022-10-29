import React, { isValidElement } from 'react'
import { isStr } from '../utils/utils'

/**
 * @name	Embolden
 * @summary	embolden quoted texts
 * 
 * @param	{String|*}	children
 * @param	{RegExp}	regex		(optional) Regular expression to match texts to be embolden.
 * 									Default: regex that matches quoted texts
 * 
 * @example 
 * ```javascript
 * <Embolden>This is "quoted" text</Embolden>
 * 
 * // Result: ['This is ', <b>"quoted"</b>, ' text']
 * ```
 * 
 * @returns {[]Element}
 */
const Embolden = ({ children, regex = /"[^"]+"/g }, keepQuotes = true) => {
    if (isValidElement(children)) return children
    
    children = isStr(children)
        ? children
        : JSON.stringify(children, null, 4)

	const matches = children.match(regex)
	let arr = [children]
	if (matches) {
        const replacements = matches.map(quoted =>
            <b>
                {!keepQuotes
                    ? quoted.split('"').join('')
                    : quoted}
            </b>
        )
		matches.forEach((quoted, i) => {
			arr = arr.map(s =>
                s.split(quoted)
                    .map((x, j) =>
                        j === 0
                            ? [x]
                            : [replacements[i], x])
            )
                // double flattening required due to 3-dimentional Array
                .flat().flat()
		})
	}
	return arr.map((children, i) =>
        <React.Fragment {...{
            children,
            key: i
        }} />
    )
}

export default React.memo(Embolden)