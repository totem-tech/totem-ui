// webpack v4
const webpack = require('webpack')
const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: {
    main: './src/index.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        loader: 'url-loader?limit=100000'
      },
      {
        test: /\.(md)$/,
        loader: 'ignore-loader',
      },
      // {}
    ]
  },
  // ignore nodejs modules and not found warning
  plugins: [
    new webpack.IgnorePlugin(/abort-controller/),
    new webpack.IgnorePlugin(/form-data/),
    new webpack.IgnorePlugin(/nano/), // CouchDB Client
    new webpack.IgnorePlugin(/node-localstorage/),
    new webpack.IgnorePlugin(/node-fetch/),
    // Includes .env variables into the frontend app
    new Dotenv(),
  ],
  resolve: {
    extensions: ['*', '.js', '.jsx']
  },
  output: {
    path: __dirname + '/dist',
    publicPath: '/',
    filename: 'bundle.js'
  },
  devServer: {
    contentBase: './dist'
  },
  // solves "Can't resolve 'fs'" error
  node: {
    'fs': "empty",
  }
}


