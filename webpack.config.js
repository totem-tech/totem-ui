// webpack v4
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')
const Dotenv = require('dotenv-webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CompressionPlugin = require("compression-webpack-plugin");

const plugins = [
	// compress build
	new CompressionPlugin({
		algorithm: "gzip",
		compressionOptions: {
			chunkSize: 300000,
			level: 9,
			filename: '[path][base].js'
		},
	}),
	// Copy static assets
	new CopyWebpackPlugin({
		patterns: [
			'./public/android-chrome-192x192.png',
			'./public/android-chrome-256x256.png',
			'./public/apple-touch-icon.png',
			'./public/browserconfig.xml',
			'./public/favicon.ico',
			'./public/favicon-16x16.png',
			'./public/favicon-32x32.png',
			'./public/mstile-150x150.png',
			'./public/safari-pinned-tab.svg',
			'./public/site.webmanifest',
			// {
			//   from: path.resolve(__dirname, 'public/'),
			//   // to: './dist',
			// }
		],
	}),

	...[
		// /path/,
		/abort-controller/, // utils/PromisE.js
		/discord.js/, // utils/PromisE.js
		/form-data/, // utils/utils.js
		/nano/, // utils/CouchDBStorage.js
		/node-localstorage/, // utils/DataStorage.js
		/node-fetch/, // utils/PromisE.js
		/twitter-lite/, // utils/twitterHelper.js
		/\@polkadot\/extension-dapp/, // utils/twitterHelper.js
	].map(regExp => new webpack.IgnorePlugin({ resourceRegExp: regExp })),
	// Includes .env variables into the frontend app
	new Dotenv(),

	//
	new webpack.ProvidePlugin({
		Buffer: ['buffer', 'Buffer'],
	}),

	new HtmlWebpackPlugin({
		cache: true,
		hash: true,
		minify: 'auto',
		template: 'public/index.html',
	}),
]
module.exports = {
	devServer: {
		static: path.join(__dirname, 'dist'),
		hot: true,
	},
	devtool: 'eval-source-map',
	entry: {
		app: ['babel-polyfill', './src/index.js'],
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							// Use the latest version of ECMAScript
							[
								'@babel/preset-env',
								{ targets: 'last 2 versions' },
							],
							// Use the React preset for JSX support
							'@babel/preset-react',
						],
					},
				},
			},
			{
				test: /\.css$/i,
				use: [
					'style-loader',
					{
						loader: 'css-loader',
						options: {
							esModule: false,
						}
					},
				],
			},
			{
				test: /\.(png|jpg|woff|woff2|eot|ttf|svg)$/i,
				use: [
					{
						loader: 'url-loader',
						options: {
							limit: 1000000,
							// Specify the fallback loader for non-data URIs
							fallback: 'file-loader',
							// Enable or disable encoding the URI as a base64 string
							// If you set this to `false`, the loader will generate a plain-text URI instead
							// This option only applies when the URI is smaller than the limit specified above
							// Default is `true`
							esModule: false,
						},
					},
				],
			},
			{
				test: /\.(md)$/,
				use: 'ignore-loader',
			},
		],
	},
	output: {
		path: __dirname + '/dist',
		publicPath: '/',
		// filename: `bundle.js`,
		filename: '[name].[contenthash:8].js',
	},
	// ignore nodejs modules and not found warning
	plugins,
	resolve: {
		extensions: ['*', '.js', '.jsx', '.mjs', '.ts'],
		// ignore or use a fallback plugin
		fallback: {
			assert: false,
			async_hooks: false,
			buffer: require.resolve('buffer'),
			crypto: require.resolve('crypto-browserify'),
			path: false, // ignore NodeJS 'path' module used in the utils/DataStorage.js file
			stream: require.resolve('stream-browserify'),
			util: require.resolve('util'),
		},
	},
	// create chunks
	// everything inside src/ will be a single file (app.js)

	optimization: {
		moduleIds: 'named',
		runtimeChunk: 'single',
		splitChunks: {
			chunks: 'all',
			maxInitialRequests: Infinity,
			// maxSize: 300000, // 300kb
			// minSize: 100000, //100kb
			cacheGroups: {
				// app: {
				// 	// maxSize: 100000, // 300kb
				// 	// minSize: 20000, //100kb
				// 	test: /[\\/]src[\\/]([a-zA-Z0-9]+[\\/])/,
				// 	name(module) {
				// 		// get the name. E.g. node_modules/packageName/not/this/part.js
				// 		// or node_modules/packageName
				// 		const packageName = module.context.match(/[\\/]src[\\/](.*?)([\\/]|$)/)[1]

				// 		console.log('app-test', module.context)
				// 		// one single file for all modules
				// 		return 'app'
				// 	},
				// },
				vendor: {
					// maxSize: 300000, // 300kb
					// minSize: 20000, // 20kb
					test: /[\\/]node_modules[\\/]/,
					name(module) {
						// get the name. E.g. node_modules/packageName/not/this/part.js
						// or node_modules/packageName
						const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1]

						// return 'vendor'
						// one single file for all modules
						// return 'vendor'
						// npm package names are URL-safe, but some servers don't like @ symbols
						return `vendor.${packageName.replace('@', '')}`
					},
				},
			},
		},
	},
}
