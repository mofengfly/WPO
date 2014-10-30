/*
 * GET home page.
 */
var DateUtils = require('./../utils/date.js');
var Har = require('./../models/har.js');
var HarDAO = require('./../models/harDAO.js');
var fs = require('fs');
var NetSniff = require('./netsniff.js');



exports.index = function (req, res) {
    var mode = 'url';
//    var label = req.query[mode];
    var label = 'http://www.test.com/';

    c.mode = mode;
    c.label = label;
    HarDAO.findAll(
        {label: label},
        "timestamp",
        {"timestamp": 1},
        function(err,data){
            if(err){
                throw err;
            }
            console.log(data);
            if(!data.length) {
                return;
            }
            c.timestamp = [];
            var item;
            var min = data[0].timestamp,max = data[0].timestamp;
            for (var result in data) {
                item = data[result];
                c.timestamp.push(item["timestamp"]);
                if (c.timestamp>max){
                    max=c.timestamp;
                }
                if (c.timestamp<min){
                    min=c.timestamp ;
                }
            }
            console.log(min);
            console.log(max);
            c.query = "/superposed/display?" +
                "step_1_label=" + c.label +
                "&step_1_start_ts=" +min +
                "&step_1_end_ts=" + max;
            res.render('index', { title: "详细视图", c:c});
        });
};


exports.doLogin = function (req, res) {
    var user = {
        username: 'admin',
        password: 'admin'
    }

    if (req.body.username === user.username && req.body.password === user.password) {
        req.session.user = user;
        return res.redirect('/home');
    } else {
        req.session.error = '用户名或密码不正确';
        return res.redirect('/login');
    }

};

exports.logout = function (req, res) {
    req.session.user = null;
    res.redirect('/');
};



exports.home = function (req, res) {
    // Find all hars.
    HarDAO.findAll(function(err, hars) {
        if (err) return console.error(err);
        res.render('home1', { title: 'HAR', hars: hars});
    });

};
exports.load = function (req, res) {
    res.render('load', { title: 'load'});
};



exports.upload = function (req, res) {
//    获得文件的临时路径
    var tmp_path = req.files['har'].path;
    // 指定文件上传后的目录 - 示例为"images"目录。
    var target_path = './uploads/' + req.files['har'].name;
    // 移动文件
    fs.rename(tmp_path, target_path, function(err) {
        if (err) throw err;
        // 删除临时文件夹文件,
        fs.unlink(tmp_path, function() {
            if (err) throw err;
//            res.send('File uploaded to: ' +
//                target_path + ' - ' + req.files['har'].size + ' bytes');
            fs.readFile(target_path, 'utf-8',function (err, data) {
                if (err) throw err;
                Har.saveHar(JSON.parse(data), function(){
                    res.redirect('/home');
                });
            });
        });
    });
};
exports.monitor = function (req, res) {
    var url = req.query['url'];
    var urlReg=new RegExp("((^http)|(^https)|(^ftp)):\/\/(\\w)+\.(\\w)+");

    if(!url||!urlReg.test(url)){
        res.send("请输入正确的URL地址");
        return;
    }
    NetSniff.netsiff(url, function(){
        res.redirect('/home');
    });

};


exports.handleHar = function (req, res) {

    fs.readFile(target_path, 'utf-8',function (err, data) {
//        res.setHeader('Content-Length', data.length);
        var har = new Har.Har(JSON.parse(data));
        har.analyze();
        var result = [{
            "label":                har.label|| "",
            "url":                  har.url|| 0,
            "timestamp":            +new Date(),
            "full_load_time":       har.full_load_time || 0,
            "onload_event":         har.onload_event || 0,
            "onContentLoadEvent":   har.oncontentload_event,
            "start_render_time":    har.start_render_time || 0,
            "time_to_first_byte":   har.time_to_first_byte|| 0,
            "total_dns_time":       har.total_dns_time|| 0,
            "total_transfer_time":  har.total_transfer_time|| 0,
            "total_server_time":    har.total_server_time|| 0,
            "avg_connecting_time":  har.avg_connecting_time || 0,
            "avg_blocking_time":    har.avg_blocking_time || 0,
            "total_size":           har.total_size|| 0,
            "text_size":            har.text_size|| 0,
            "media_size":           har.media_size|| 0,
            "cache_size":           har.cache_size|| 0,
            "requests":             har.requests|| 0,
            "redirects":            har.redirects || 0,
            "bad_requests":         har.bad_requests || 0,
            "domains":              0,
            "ps_scores":            0,
            "har":                  har.origin || 0,
            "weights_ratio":        0,
            "requests_ratio":       0,
            "domains_ratio":        har.domains || 0
        }];
//        res.end(JSON.stringify(result));
        res.render('home1', { title: "处理har文件", hars: result});
    });

};

var c = {};
function _set_options_in_selector(mode, label) {
    // Read data for selector box from database


}


exports.detail = function(req, res){
    var mode = 'url';
    var label = req.query[mode];

    c.mode = mode;
    c.label = label;
    console.log(label);
    HarDAO.findAll(
        {label: label},
        "timestamp",
        {"timestamp": 1},
        function(err,data){
            if(err){
               throw err;
            }
            if(!data.length) {
               return;
            }
            c.timestamp = [];
            var item;
            var min = data[0].timestamp,max = data[0].timestamp;
            for (var result in data) {
                item = data[result];
                c.timestamp.push(item["timestamp"]);
                if (c.timestamp>max){
                    max=c.timestamp;
                }
                if (c.timestamp<min){
                    min=c.timestamp ;
                }
            }
            console.log(min);
            console.log(max);
            c.query = "/superposed/display?" +
                "step_1_label=" + c.label +
                "&step_1_start_ts=" +min +
                "&step_1_end_ts=" + max;
            res.render('detail', { title: "详细视图", c:c});

        });
};

exports.runinfo = function(req, res){
    res.setHeader('Content-Type', 'text/json');
    var timestamp = req.query['timestamp'];
    HarDAO.findOne({"timestamp":timestamp}, function(err,data){
        var test_results = data,
            domains_req_ratio = {},
            domains_weight_ratio = {},
            hostname,
            value;
        for(var item in test_results["domains_ratio"]){
            if(test_results["domains_ratio"].hasOwnProperty(item)){
               hostname = item.replace("/\|/g", ".");
               value = test_results["domains_ratio"][item];
                domains_req_ratio[hostname] = value[0];
                domains_weight_ratio[hostname] = value[1];
            }
        }
//        Summary stats
        var summary = {
            "url":  test_results["url"],
            "full_load_time":       test_results["full_load_time"],
            "onload_event":         test_results["onload_event"],
            "start_render_time":    test_results["start_render_time"],
            "time_to_first_byte":   test_results["time_to_first_byte"],
            "total_dns_time":       test_results["total_dns_time"],
            "total_transfer_time":  test_results["total_transfer_time"],
            "total_server_time":    test_results["total_server_time"],
            "avg_connecting_time":  test_results["avg_connecting_time"],
            "avg_blocking_time":    test_results["avg_blocking_time"],
            "total_size":           test_results["total_size"],
            "text_size":            test_results["text_size"],
            "media_size":           test_results["media_size"],
            "cache_size":           test_results["cache_size"],
            "requests":             test_results["requests"],
            "redirects":            test_results["redirects"],
            "bad_requests":         test_results["bad_requests"],
            "domains":              test_results["domains"]
        };
//        Page Speed Scores
        var scores = {};
//        for(var item in test_results["ps_scores"]){
//            if(test_results["ps_scores"].hasOwnProperty(item)){
//                scores[item] = test_results["ps_scores"][item];
//            }
//        }


//        Data for HAR Viewer
        var har_id = test_results["_id"];
        var target_path = './temp_store/' + har_id;
        fs.writeFileSync(target_path, JSON.stringify(test_results["har"]));

//      Final JSON
        var results = JSON.stringify({
            "summary":       summary,
            "pagespeed":     scores,
            "weights":       test_results["weights_ratio"],
            "requests":      test_results["requests_ratio"],
            "d_weights":     domains_weight_ratio,
            "d_requests":    domains_req_ratio,
            "har":           har_id,
            "screen_path":  test_results['har']["target_path"].substring(8)
        });

        res.send(results);
    });
};
exports.timeline = function(req, res){
//    res.setHeader('Content-Type', 'text/json');
//    var data= "Full Load Time#Total Requests#Total Size#Page Speed Score#onLoad Event#Time to First Byte#Total DNS Time#Total Transfer Time#Total Server Time#Avg. Connecting Time#Avg. Blocking Time#Text Size#Media Size#Cache Size#Redirects#Bad Rquests#Domains;2013-11-06 20:29:17;2979;89;1334;100;2660;108;21.0;200.0;895.0;0.0;0.0;719;606;1163;58;0;15"
//    res.send(data);

//     Parameters from GET request
    var label = req.query['label'],
        mode = req.query['mode'];
//        # Metrics
    var METRICS = ["timestamp", "full_load_time", "requests", "total_size",
        "ps_scores", "onload_event", "start_render_time",
        "time_to_first_byte", "total_dns_time",
        "total_transfer_time", "total_server_time",
        "avg_connecting_time", "avg_blocking_time", "text_size",
        "media_size", "cache_size", "redirects", "bad_requests",
        "domains"];

    var  TITLES = [ "Full Load Time", "Total Requests",
        "Total Size", "Page Speed Score", "onLoad Event",
        "Start Render Time", "Time to First Byte",
        "Total DNS Time", "Total Transfer Time", "Total Server Time",
        "Avg. Connecting Time", "Avg. Blocking Time", "Text Size",
        "Media Size", "Cache Size", "Redirects", "Bad Rquests",
        "Domains"];

//     Set of metrics to exclude (due to missing data)
    var exclude = [];
    var data = [];
    for (var i = 0, len = METRICS.length; i < len; i++) {
        data.push('');
    }

//  Read data for timeline from database in custom format (hash separated)
    var result =  HarDAO.findAll(
        {label: mode},
        METRICS.join(' '), function(err, results){
            var result,
                index;
            for (var i = 0, len = results.length; i < len; i++) {
                result = results[i];
                index = 0;
                for (var j = 0, mLen = METRICS.length; j < mLen; j++) {
                    var metric = METRICS[j],
                        point;
                    if (metric != "ps_scores") {
                         point = result[metric] + '';
                    } else {
                        point = result[metric]["Total Score"] + '';
                    }
                    console.log(point);
                    if (point == "n/a" || !point) {
                        exclude.push(metric);
                    }
                    data[index] +=  point + "#";
                    index += 1;

                }

            }
//             Update list of titles
            if (exclude.join('').indexOf("onload_event")>-1 ) {
//                console.log(TITLES.indexOf("onLoad Event"));
                TITLES.splice(TITLES.indexOf("onLoad Event"), 1);
            }
            if (exclude.join('').indexOf("start_render_time")>-1) {
                TITLES.splice(TITLES.indexOf("Start Render Time"), 1);
            }
            var header = '',
                output;
            for (var i = 0, len = TITLES.length; i < len; i++) {
                header += TITLES[i] + "#"
            }
            output = header + ";"
            for (var i = 0, len = data.length; i < len; i++) {
                if (data[i].indexOf('n/a')==-1) {
                    output += data[i].slice(0, data[i].length-1) + ";"
                }
            }
            res.send(output) ;

        });
};
exports.harviewer = function(req, res){
//    res.set_cookie("phaseInterval", "-1", max_age=365*24*3600 )

    res.render('harviewer', { title: ""});
};
exports.download = function(req, res){
//    res.set_cookie("phaseInterval", "-1", max_age=365*24*3600 )
    var id = req.query['id'];
    var target_path = './temp_store/' + id;
    fs.readFile(target_path, 'utf-8', function(err, data){
        if(err) throw err;
//        console.dir(JSON.parse(data));
        var data = "onInputData(" + data + ");";
        res.setHeader("Content-Type", 'text/plain');
        res.send(data);
    });
};



