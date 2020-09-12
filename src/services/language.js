import DataStorage from '../utils/DataStorage'
import { clearClutter, downloadFile, generateHash, textCapitalize } from '../utils/utils'
import client from './chatClient'
import storage from './storage'
import { getUrlParam } from './window'

const translations = new DataStorage('totem_static_translations', true)
export const EN = 'EN'
const MODULE_KEY = 'language'
const rw = value => storage.settings.module(MODULE_KEY, value) || {}
let _selected = rw().selected || EN
export const BUILD_MODE = getUrlParam('build-mode').toLowerCase() == 'true'
    && window.location.hostname !== 'totem.live'
export const languages = Object.freeze({
    BN: 'Bengali',
    DE: 'German',
    EN: 'English',
    ES: 'Spanish',
    FR: 'French',
    HI: 'Hindi',
    IT: 'Italian',
    JA: 'Japanese',
    KO: 'Korean',
    NL: 'Dutch',
    PL: 'Polish',
    RU: 'Russian',
    TR: 'Turkish',
    UK: 'Ukrainian',
    ZH: 'Chinese',
})

// downloadTextListCSV generates a CSV file with all the unique application texts
// that can be used to translate by opening the file in Google Drive
// NB: this function should not be used when BUILD_MODE is false (URL param 'build-mode' not 'true')
export const downloadTextListCSV = !BUILD_MODE ? null : () => {
    const langCodes = [EN, ...Object.keys(languages).filter(x => x != EN)]
    const rest = langCodes.slice(1)
    const cols = textCapitalize('abcdefghijklmnopqrstuvwxyz').split('')
    const str = langCodes.join(',') + '\n' + (window.enList || []).map((x, i) => {
        const rowNo = i + 2
        const functions = rest.map((_, c) => `"=GOOGLETRANSLATE($A${rowNo}, $A$1, ${cols[c + 1]}$1)"`).join(',')
        return `"${clearClutter(x)}", ` + functions
    }).join(',\n')
    downloadFile(str, `English-texts-${new Date().toISOString()}.csv`, 'text/csv')
}

// retrieve latest translated texts from server and save to local storage
export const fetchNSaveTexts = async () => {
    const selected = getSelected()
    if (selected === EN) return setTexts(selected, null, null)

    const selectedHash = generateHash(getTexts(selected) || '')
    const engHash = generateHash(getTexts(EN) || '')
    const func = client.languageTranslations.promise
    const [textsEn, texts] = await Promise.all([
        func(EN, engHash),
        func(selected, selectedHash),
    ])

    if (!texts && !textsEn) return
    console.log('Language text list updated', { selected, texts, textsEn })
    // save only if update required
    setTexts(selected, texts, textsEn)
}

// get selected language code
export const getSelected = () => _selected

export const getTexts = langCode => translations.get(langCode)

// set selected language code
export const setSelected = async (selected, delay = true) => {
    rw({ selected })
    _selected = selected
    // retrieve translated texts from server
    await fetchNSaveTexts()
    // reload page
    setTimeout(() => window.location.reload(true), delay)
}

// save translated list of texts retrieved from server
export const setTexts = (langCode, texts, enTexts) => translations.setAll(new Map(
    // remove all language cache if selected is English
    langCode === EN ? [] : [
        [EN, enTexts || translations.get(EN)],
        [langCode, texts || translations.get(langCode)],
    ].filter(Boolean)
))

export const translated = (texts = {}, capitalized = false) => {
    const langCode = getSelected()
    // translation not required
    if (langCode === EN && !BUILD_MODE) return [texts, capitalized && textCapitalize(texts)]

    const en = translations.get(EN) || []
    // list of selected language texts
    const selected = translations.get(langCode) || []
    // attempt to build a single list of english texts for translation
    if (BUILD_MODE) {
        window.enList = window.enList || []
        Object.values(texts).forEach(text => {
            text = clearClutter(text)
            enList.indexOf(text) === -1 && enList.push(text)
        })
        window.enList = enList.sort()
    }

    Object.keys(texts).forEach(key => {
        const text = clearClutter(texts[key])
        const enIndex = en.indexOf(text)
        const translatedText = selected[enIndex]
        // fall back to original/English,
        // if selected language is not supported 
        // or due to network error language data download failed
        // or somehow supplied text wasn't translated
        if (!translatedText) return
        texts[key] = translatedText
    })
    return [texts, capitalized && textCapitalize(texts)]
}

export default {
    translations,
    translated,
    setTexts,
    getSelected,
    setSelected,
}

if (BUILD_MODE) {
    require('./languageFiles').default.forEach(path =>
        require(`../${path.split('./src/')[0]}`)
    )
    console.log('Language texts ready to be downloaded for translation.\nGo to the "Utilities > Admin Tools"')
}
