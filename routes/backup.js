
exports.handleHar = function (req, res) {
    var target_path = './uploads/har';
//    res.setHeader('Content-Type', 'text/json');
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

