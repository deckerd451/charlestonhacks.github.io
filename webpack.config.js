const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: './index.js',
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      querystring: require.resolve("querystring-es3"),
      http: require.resolve("stream-http"),
      os: require.resolve("os-browserify"),
      zlib: require.resolve("browserify-zlib"),
      fs: false,
      net: false,
      tls: false,
    },
  },
  plugins: [
    new Dotenv()
  ]
};
