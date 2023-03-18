// import * as languageHelper from '../utils/languageHelper'

const languageHelper = require('../utils/languageHelper')
module.exports = languageHelper

if (languageHelper.BUILD_MODE) {
	require('./languageFiles').default.forEach(path =>
		require(`../${path.split('./src/')[0]}`)
	)
	console.log(
		'Language texts ready to be downloaded for translation.\nGo to the "Utilities > Admin Tools"'
	)
}
