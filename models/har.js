var Utils = require('./../utils/index.js');
var DateUtils = require('./../utils/date.js');

var HarDAO = require('./harDAO.js');

function Har(file){
    this.har = file;
    this.origin = this.har;
    this.init();
}
Har.prototype.init = function(){
    var self = this;

    self.full_load_time = 0;

    self.total_dns_time      = 0.0;
    self.total_transfer_time = 0.0;
    self.total_server_time   = 0.0 ;
    self.avg_connecting_time = 0.0;
    self.avg_blocking_time   = 0.0;

    self.total_size = 0 ;
    self.text_size  = 0;
    self.media_size = 0;
    self.cache_size = 0 ;

    self.redirects    = 0  ;
    self.bad_requests = 0  ;

    self.domains = {};

    self.total_size = 0;
    self.max_timestamp = 0;


};
Har.prototype.analyze = function(){
    var self = this;
    var entries =  self.har["log"]["entries"];
    for (var i = 0, len = entries.length; i < len; i++) {
        //Micro timgings
        self.entry = entries[i];
        self.total_dns_time      += self.get_dns_time()   ;
        self.total_transfer_time += self.get_transfer_time()  ;
        self.total_server_time   += self.get_server_time()    ;
        self.avg_connecting_time += self.get_connecting_time()  ;
        self.avg_blocking_time   += self.get_blocking_time() ;

        //Update Request/Page time frame
        self.update_timeframe();

        //Time to first byte
        self.time_to_first_byte = self.get_time_to_first_byte();

        //Size of response body
        self.total_size += self.get_response_size();
        //Size of text (JavaScript, CSS, HTML, XML, JSON, plain text)
        //and media (images, flash) files
        if (self.is_text()) {
            self.text_size += self.get_response_size() ;
        } else if( self.is_media()) {
            self.media_size += self.get_response_size() ;
        }
        //Cached size
        if (self.is_long_term_cache()){
            self.cache_size += self.get_response_size() ;
        }
        //Redirects (3xx) and bad requests (4xx, 5xx)
        if (self.is_redirect()){
            self.redirects += 1;
        } else if (self.is_bad_request()) {
            self.bad_requests += 1;
        }
        //Update domain info
        self.update_domain_info();
    }
    //Label
    self.label = self.get_label();
    self.screenPath =  this.har.target_path;
    //URL
    self.url = self.get_url() ;

    //Requests
    self.requests = self.get_number_of_requests() ;

    //Full load time
    self.full_load_time = self.get_full_load_time() ;

    //onLoad envent time
    self.onload_event = self.get_onload_event() ;
    self.oncontentload_event = self.get_onContentLoad();

    //Render Start
    self.start_render_time = self.get_start_render_time();

    //Average values
    //self.avg_connecting_time = self.get_avg_connecting_time() ;
    self.avg_blocking_time = self.get_avg_blocking_time();

    //From bytes to kilobytes
    self.total_size = Utils.to_kilobytes(self.total_size);

    self.text_size  = Utils.to_kilobytes(self.text_size);
    self.media_size =  Utils.to_kilobytes(self.media_size) ;
    self.cache_size =  Utils.to_kilobytes(self.cache_size);

};
Har.prototype.is_media = function(){
    var self = this,
        mime_type = self.entry["response"]["content"]["mimeType"];
    if(!mime_type){
        return;
    }
    var is_media = mime_type.indexOf("flash")>=0 || mime_type.indexOf("image")>=0;
    if (is_media) {
        return true;
    }

};
Har.prototype.is_text = function(){
    var self = this,
        mime_type = self.entry["response"]["content"]["mimeType"],
        is_text;
        if(!mime_type){
           return;
        }
        is_text = mime_type.indexOf("javascript")>=0 ||
            mime_type.indexOf("text")>=0 ||
            mime_type.indexOf("html")>=0 ||
            mime_type.indexOf("xml")>=0  ||
            mime_type.indexOf("json")>=0;

    if (is_text) {
        return true;
    }
};
Har.prototype.is_bad_request = function(){
    var self = this;
    if (self.entry["response"]["status"] >= 400) {
        return true;
    }
};
Har.prototype.is_redirect = function(){
    var self = this;
    if (self.entry["response"]["status"] >= 300 &&
        self.entry["response"]["status"] < 400) {
        return true;
    }
};

Har.prototype.update_timeframe = function(){
//    # Original time format: 2000-01-01T00:00:00.000+00:00
    var self = this,
        time_request_started,
        time_request_completed;
    var time =  self.entry["startedDateTime"].split(".");
    var seconds =  DateUtils.parseFormatted(time[0], "yyyy-MM-ddTHH:mm:s").getTime()/1000,
        milliseconds = time[1];
    //Exclude timezone
    try{
        milliseconds = milliseconds.split("+")[0] ;
    }
    catch (e){
        milliseconds = milliseconds.split("-")[0] ;
        milliseconds = milliseconds.replace("Z", "");
    }

    time_request_started = seconds + parseFloat("0." + milliseconds);
    time_request_completed = time_request_started + self.entry["time"]/1000;
    if (time_request_completed > self.max_timestamp) {
        self.max_timestamp = time_request_completed;
    }
    if (!self.min_timestamp) {
        self.min_timestamp = time_request_started;
        self.is_first = true;
    } else {
        self.is_first = false;

    }
    if (time_request_started < self.min_timestamp) {
        self.min_timestamp = time_request_started ;
    }


};
function Headers(headers) {
    this.as_dict = {};
    var header;
    for (var i = 0, len = headers.length; i < len; i++) {
        header = headers[i]
        this.as_dict[header["name"]] = header["value"];
    }
}




Har.prototype.is_long_term_cache = function(){
    var self = this;
    var headers = new Headers(self.entry["response"]["headers"]);
    var cache_control = headers.as_dict["Cache-Control"];
    if (cache_control && cache_control.indexOf("no-cache")==-1 && cache_control.indexOf("max-age=0")==-1) {
        var date = headers.as_dict["Date"];
        date = new Date(date).getTime();

        // Extract EXPIRES from HTTP header
        var expires = headers.as_dict["Expires"]
        expires = new Date(expires).getTime();
        if (expires > date)
        return true;
    } else {
        return false;
    }
};
Har.prototype.get_response_size = function(){
    var self = this;
    var compressed_size = Math.max(self.entry["response"]["bodySize"], 0);
    if (compressed_size == 0) {
        return self.entry["response"]["content"]["size"];
    } else {
        return compressed_size;
    }
};

Har.prototype.get_time_to_first_byte = function(){
    var self = this;
    if (self.is_first) {
        return self.get_blocking_time() +
            self.get_dns_time() +
            self.get_connecting_time() +
            self.get_send_time() +
            self.get_server_time();
    } else {
        return self.time_to_first_byte
    }
};
Har.prototype.get_dns_time = function(){
    var self = this;
    return Math.max(self.entry["timings"]["dns"], 0);
};
Har.prototype.get_transfer_time = function(){
    var self = this;
    return Math.max(self.entry["timings"]["receive"], 0) + Math.max(self.entry["timings"]["send"], 0)
};
Har.prototype.get_connecting_time = function(){
    var self = this;
    return Math.max(self.entry["timings"]["connect"], 0);
};
Har.prototype.get_blocking_time = function(){
    var self = this;
    return Math.max(self.entry["timings"]["blocked"], 0);
};
Har.prototype.update_domain_info = function(){
    var self = this,
        domain,
        mongo_domain,
        domain_requests,
        domain_data_size;
    domain = self.entry["request"]["url"].split("//")[1].split("/")[0];

   //WORKAROUND: Mongo prevents using dots in key names
    mongo_domain = domain.replace(/\./g, "|");

    if(!self.domains[mongo_domain]) {
        self.domains[mongo_domain] = [0 , 0];
    }
    //{DOMAIN: [NUMBER OF REQUESTS, TOTAL DATA FROM HOST IN KB], ...}
    domain_requests  = self.domains[mongo_domain][0];
    domain_data_size = self.domains[mongo_domain][1];

    domain_requests  += 1;
    domain_data_size += Utils.to_kilobytes(self.get_response_size());

    self.domains[mongo_domain] = [domain_requests, domain_data_size]
};
Har.prototype.get_label = function(){
    var self = this;
    return self.har["log"]["pages"][0]["id"];
};
Har.prototype.get_url = function(){
    var self = this;
    return self.har["log"]["entries"][0]["request"]["url"];
};
Har.prototype.get_number_of_requests = function(){
    var self = this;
    return self.har["log"]["entries"].length;

};
Har.prototype.get_full_load_time = function(){
    var self = this;
   return self.har["log"]["pages"][0]["pageTimings"]["_myTime"] ||
          parseInt((self.max_timestamp - self.min_timestamp) * 1000)
};
Har.prototype.get_onload_event = function(){
    var self = this;
    var onload_event = self.har["log"]["pages"][0]["pageTimings"]["onLoad"];
    if (onload_event > 0) {
        return onload_event
    } else {
        return "n/a"
    }
};
Har.prototype.get_onContentLoad = function(){
    var self = this;
    var onContentLoad = self.har["log"]["pages"][0]["pageTimings"]["onContentLoad"];
    if (onContentLoad > 0) {
        return onContentLoad;
    } else {
        return "n/a";
    }
};

Har.prototype.get_start_render_time = function(){
    return this.har["log"]["pages"][0]["pageTimings"]["_renderStart"] || "n/a";
};
Har.prototype.to_kilobytes = function(){};
Har.prototype.get_avg_blocking_time = function(){
    var self = this;
    return Math.round(self.avg_blocking_time / self.requests, 0);
};
Har.prototype.get_send_time = function(){
    var self = this;
    return Math.max(self.entry["timings"]["send"], 0);
};
Har.prototype.get_server_time = function(){
    var self = this;
    return Math.max(self.entry["timings"]["wait"], 0)
};
Har.prototype.get_avg_connecting_time = function(){
    var self = this;
    return Math.round(self.avg_connecting_time / self.requests, 0);
};
Har.prototype.weight_ratio = function(){
    var self = this,
        resources = {},
        entries = self.har["log"]["entries"],
        mime_type,
        size,
        entry;
    for (var i = 0, len =entries.length; i < len; i++){
        entry = entries[i];
        if(!entry["response"]["content"]["mimeType"]){
            break;
        }
        mime_type = entry["response"]["content"]["mimeType"].split(";")[0];
        if (mime_type) {
            mime_type = self.get_normalized_value(mime_type);
            size = entry["response"]["content"]["size"];
            if(!resources[mime_type]){
                resources[mime_type] = 0;
            }
            resources[mime_type] = resources[mime_type] + Utils.to_kilobytes(size);
        }
    }
    return resources;

};
Har.prototype.req_ratio = function(){
    var self = this,
        resources = {},
        entries = self.har["log"]["entries"],
        mime_type,
        size,
        entry;
    for (var i = 0, len =entries.length; i < len; i++){
        entry = entries[i];
        if(!entry["response"]["content"]["mimeType"]){
            break;
        }
        mime_type = entry["response"]["content"]["mimeType"].split(";")[0];
        if (mime_type) {
            mime_type = self.get_normalized_value(mime_type);
            size = entry["response"]["content"]["size"];
            if(!resources[mime_type]){
                resources[mime_type] = 0;
            }
            resources[mime_type] = resources[mime_type] + 1;
        }
    }
    return resources;
};




Har.prototype.get_normalized_value = function(string){
    if (string.indexOf("javascript") >=0) {
        return "javascript"
    } else if(string.indexOf("flash") >=0){
        return "flash";
    }  else if(string.indexOf("text/plain")>=0 || string.indexOf("html")>=0){
        return "text/html";
    } else if(string.indexOf("xml")>=0){
        return "text/xml";
    } else if(string.indexOf("css")>=0){
        return "text/css";
    } else if(string.indexOf("gif")>=0){
        return "image/gif";
    } else if(string.indexOf("png")>=0){
        return "image/png";
    } else if(string.indexOf("json")>=0){
        return "json";
    } else if(string.indexOf("jpeg")>=0){
        return "image/jpeg";
    } else {
        return "other";
    }
};




exports.Har = Har;
exports.saveHar = function (data, callback){
    var har = new Har(data);
    har.analyze();
    var result = {
        "screen_path": data.target_path,
        "label":                har.label,
        "url":                  har.url,
        "timestamp":            DateUtils.format(new Date(), "yyyy-MM-dd hh:mm:ss"),
        "full_load_time":       har.full_load_time|| 0,
        "onload_event":         har.onload_event|| 0,
        "oncontentload_event":   har.oncontentload_event|| 0,
        "start_render_time":    har.start_render_time|| 0,
        "time_to_first_byte":   har.time_to_first_byte|| 0,
        "total_dns_time":       har.total_dns_time|| 0,
        "total_transfer_time":  har.total_transfer_time|| 0,
        "total_server_time":    har.total_server_time|| 0,
        "avg_connecting_time":  har.avg_connecting_time || 0,
        "avg_blocking_time":    har.avg_blocking_time|| 0,
        "total_size":           har.total_size|| 0,
        "text_size":            har.text_size|| 0,
        "media_size":           har.media_size|| 0,
        "cache_size":           har.cache_size|| 0,
        "requests":             har.requests|| 0,
        "redirects":            har.redirects|| 0,
        "bad_requests":         har.bad_requests|| 0,
        "domains":              har.domains.length|| 0,
        "domains_ratio":        har.domains || 0,
        "ps_scores":            0,
        "har":                  har.origin,
        "weights_ratio":        har.weight_ratio(),
        "requests_ratio":       har.req_ratio()
    };
    HarDAO.save(result, function(){
        callback && callback();
    });
};









