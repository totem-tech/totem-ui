const fs = require('fs')
/*
 * Automate building list of files for translation
 */
const src = './src'
const exts = ['js', 'jsx']
const exclude = [
    './src/assets',
    './src/legacies',
    './src/utils',
]
const destFile = './src/services/languageFiles.js'
const isDir = path => fs.lstatSync(path).isDirectory()
const getPaths = async (dir, extensions, exclude = []) => {
    let result = []
    if (exclude.includes(dir)) return []
    if (!isDir(dir)) return [dir]

    const files = fs.readdirSync(dir)
    for (let i = 0;i < files.length;i++) {
        result.push(await getPaths(
            `${dir}/${files[i]}`,
            extensions,
            exclude,
        ))
    }

    return result
        .flat()
        .filter(hasExtension(extensions))
}
const hasExtension = (extensions = []) => (path = '') => {
    if (!path) return false
    for (let i = 0;i < extensions.length;i++) {
        if (path.endsWith(extensions[i])) return true
    }
    return false
}
getPaths(
    src,
    exts,
    exclude
).then(files => {
    const arrStr = JSON.stringify(files, null, 4)
    const fileContents = `export default ${arrStr}`
    // create a js file that exports the files array 
    fs.writeFileSync(destFile, fileContents)
})