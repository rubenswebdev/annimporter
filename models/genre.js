var mongoose = require('mongoose');

var Model = mongoose.Schema({
  name: String
});

module.exports = mongoose.model('Genre', Model);