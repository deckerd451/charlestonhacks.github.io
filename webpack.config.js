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
      fs: false,
      http: require.resolve("stream-http"),
      net: false,
      crypto: require.resolve("crypto-browserify"),
      querystring: require.resolve("querystring-es3"),
      stream: require.resolve("stream-browserify"),
      url: require.resolve("url/"),
      zlib: require.resolve("browserify-zlib"),
      os: require.resolve("os-browserify"),
      buffer: require.resolve("buffer/"), // added this line
    },
  },
  plugins: [
    new Dotenv()
  ]
};
