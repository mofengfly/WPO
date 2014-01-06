// DB Connection
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/har');
exports.mongoose = mongoose;
