/**
 * Created with JetBrains PhpStorm.
 * User: mofeng.lxw
 * Date: 13-11-2
 * Time: 下午5:36
 * To change this template use File | Settings | File Templates.
 */
var mongodb = require('./mongodb');

var Schema = mongodb.mongoose.Schema;

var HarSchema = new Schema({
    label: String,
    url: String,
    timestamp: String,
    "full_load_time":  String,
    "onload_event":    String,
    "oncontentload_event":    String,
    "start_render_time":   String,
    "time_to_first_byte":  String,
    "total_dns_time":       String,
    "total_transfer_time":  String,
    "total_server_time":    String,
    "avg_connecting_time":  String,
    "avg_blocking_time":    String,
    "total_size":           String,
    "text_size":            String,
    "media_size":           String,
    "cache_size":           String,
    "requests":             String,
    "redirects":            String,
    "bad_requests":         String,
    "domains":              String,
    "ps_scores":            String,
    "har":                   Schema.Types.Mixed,
    "weights_ratio":         Schema.Types.Mixed,
    "requests_ratio":        Schema.Types.Mixed,
    "domains_ratio":         Schema.Types.Mixed
});

var HarObj = mongodb.mongoose.model("Har", HarSchema);
var HarDAO = function () {
};

HarDAO.prototype.save = function (obj, callback) {
    var instance = new HarObj(obj);
    instance.save(function (err) {
        callback && callback(err);
    });
};

HarDAO.prototype.findByIdAndUpdate = function (obj, callback) {
    var _id = obj._id;
    delete obj._id;
    HarObj.findOneAndUpdate(_id, obj, function (err, obj) {
        callback(err, obj);
    });
}
HarDAO.prototype.findOne = function (params,fields,options,callback) {
    if (typeof fields == 'function'){
        callback = fields;
        fields = null;
        options = null;
    }
    if (typeof options == 'function'){
        callback = options;
        options = null;
    }

    HarObj.findOne(params, fields,options,function (err, obj) {
        callback(err, obj);
    });
}


HarDAO.prototype.findByName = function (name, callback) {
    HarObj.findOne({name: name}, function (err, obj) {
        callback(err, obj);
    });
};
HarDAO.prototype.findAll = function (params,fields,options,callback) {
    if (typeof fields == 'function'){
        callback = fields;
        fields = null;
        options = null;
    }
    if (typeof options == 'function'){
        callback = options;
        options = null;
    }
    HarObj.find(params, fields,options,function (err, obj) {
        callback(err, obj);
    });
};

module.exports = new HarDAO();