const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: String,
  email: String,
  number: String
  imageUrl: String

});

module.exports = mongoose.model('UserSettings', userSettingsSchema);