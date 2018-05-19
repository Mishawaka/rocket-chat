var mongoose = require('mongoose');
var UsersSchema = mongoose.Schema({
    username: String,
    name: String,
    password: String
});

const User = module.exports = mongoose.model('User', UsersSchema);