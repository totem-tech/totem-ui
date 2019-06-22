const { setNetworkDefault, denominationInfo: { init } } = require('oo7-substrate')
init({
	denominations: {
		Rock: 27,
		Block: 18,
		Chunk: 9,
		Chip: 0,
	},
	primary: 'Rock',
	unit: 'Chip',
	ticker: 'XEM'
})