var mongoose = require('mongoose');
var RoomsSchema = mongoose.Schema({
    roomName: String,
    password: String
});

const Room = module.exports = mongoose.model('Room', RoomsSchema);