const { setNetworkDefault, denominationInfo: { init } } = require('oo7-substrate')
init({
	denominations: {
		Rock: 18,
		KiloChunks: 15,
		Chunk: 12,
		KiloChips: 9,
		Chip: 6,
		KiloBlips: 3,
		Blip: 0,
	},
	primary: 'Chunk',
	unit: 'Blip',
	ticker: 'XCH'
})