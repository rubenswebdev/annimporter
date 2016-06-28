var mongoose = require('mongoose');

var Model = mongoose.Schema({
  id: Number,
  gid: Number,
  type: String,
  name: String,
  original_creator: String,
  precision: String,
  updated: String,
  pictures: [{src:String, width: Number, height: Number}],
  vintage: String,
  title: {
    text: String,
    lang: String
  },
  alternative_titles: [{
    text: String,
    lang: String
  }],
  genres: [{type: String, lowercase: true}],
  themes: [{type: String, lowercase: true}],
  description: String,
  number_episodes: Number,
  obs_episodes: String,
  episodes: [{
      num: Number,
      gid: Number,
      lang: String,
      title: String,
      part: String
  }],
  opening: [String],
  ending: [String],
  rating: Number,
  staff: [{
    gid: Number,
    task: String,
    person: String,
    person_id: String
  }],
  cast: [{
    gid: Number,
    lang: String,
    role: String,
    person: String,
    person_id: String
  }],
  credit: [{
    gid: Number,
    task: String,
    company: String,
    company_id: Number
  }],
  relatedPrev: [{
    rel: String,
    id: Number
  }],
  relatedNext: [{
    rel: String,
    id: Number
  }],
  last_update: {type: Date}
});

module.exports = mongoose.model('Anime', Model);