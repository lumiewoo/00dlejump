const path = require('path');

module.exports = {
  entry: {
    app: './js/app.js',
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    clean: true,
    filename: './js/app.js',
  },
};
