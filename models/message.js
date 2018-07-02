var mongoose = require('mongoose');
var MessagesSchema = mongoose.Schema({
    text: String,
    time: Date,
    author: String,
    from:String
});

const Message = module.exports = mongoose.model('Message', MessagesSchema);