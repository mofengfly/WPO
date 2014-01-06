var Har = require('./../models/har.js');
var DateUtils = require('./../utils/date.js');

if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function () {
        function pad(n) { return n < 10 ? '0' + n : n; }
        function ms(n) { return n < 10 ? '00'+ n : n < 100 ? '0' + n : n }
        return this.getFullYear() + '-' +
            pad(this.getMonth() + 1) + '-' +
            pad(this.getDate()) + 'T' +
            pad(this.getHours()) + ':' +
            pad(this.getMinutes()) + ':' +
            pad(this.getSeconds()) + '.' +
            ms(this.getMilliseconds()) + 'Z';
    }
}
function parseTime(t){
    var time =  t.split(".");
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

    return (seconds + parseFloat("0." + milliseconds))*1000;
}
function createHAR(address, title, startTime, resources, page)
{
    var entries = [];
    resources.forEach(function (resource) {
        var request = resource.request,
            startReply = resource.startReply,
            endReply = resource.endReply;

        if (!request || !startReply || !endReply) {
            return;
        }

        // Exclude Data URI from HAR file because
        // they aren't included in specification

        request =request[0];
        if (request.url.match(/(^data:image\/.*)/i)) {
            return;
	}

        var startTime = parseTime(request.time);
        var endTime = parseTime(endReply.time);

        entries.push({
            startedDateTime: request.time,
            time: endTime - startTime,
            request: {
                method: request.method,
                url: request.url,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: request.headers,
                queryString: [],
                headersSize: -1,
                bodySize: -1
            },
            response: {
                status: endReply.status,
                statusText: endReply.statusText,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: endReply.headers,
                redirectURL: "",
                headersSize: -1,
                bodySize: startReply.bodySize,
                content: {
                    size: startReply.bodySize,
                    mimeType: endReply.contentType
                }
            },
            cache: {},
            timings: {
                blocked: 0,
                dns: -1,
                connect: -1,
                send: 0,
                wait: startReply.time - request.time,
                receive: endReply.time - startReply.time,
                ssl: -1
            },
            pageref: address
        });
    });

    return {
        log: {
            version: '1.2',
            creator: {
                name: "PhantomJS",
                version:'1'
//                version: phantom.version.major + '.' + phantom.version.minor +
//                    '.' + phantom.version.patch
            },
            pages: [{
                startedDateTime: startTime.toISOString(),
                id: address,
                title: title,
                pageTimings: {
                    onLoad: page.endTime - page.startTime
                }
            }],
            entries: entries
        }
    };
}

var phantom=require('node-phantom');
var fs = require('fs');
exports.netsiff = function(url, callback){
    phantom.create(function(err,ph){
        ph.createPage(function(err, page){
            page.address = url;
            page.resources = [];

            page.onLoadStarted = function () {
                page.startTime = new Date();
            };

            page.onResourceRequested = function (req) {
                page.resources[req[0].id] = {
                    request: req,
                    startReply: null,
                    endReply: null
                };
            };

            page.onResourceReceived = function (res) {
                try{
                    if (res.stage === 'start') {
                        page.resources[res.id] && (page.resources[res.id].startReply = res);
                    }
                    if (res.stage === 'end') {
                        page.resources[res.id] && (page.resources[res.id].endReply = res);
                    }
                }catch(e){
                }


            };
            page.open(page.address, function (err,status) {
                var har;
                if (status !== 'success') {
                    console.log('FAIL to load the address');
                    phantom.exit(1);
                } else {
                    page.endTime = new Date();
                    page.title = page.evaluate(function () {
                        return document.title;
                    });
                    var domain = page.evaluate(function () {
                        return location.host.replace(/\.|com|www/g, "");
                    });
                    var target_path;
                    page.evaluate(function(){
                        return location.host.replace(/\.|com|www/g, "");;
                    },function(err, domain){
                        var now = new Date();
                        var today = now.getFullYear()+"-"+(now.getMonth()+1)+"-"+now.getDate();
                        target_path = './public/capture_screen/' +today+'/'+domain + "_" + (+new Date) + '.png';
                        page.render(target_path);
                        har = createHAR(page.address, page.title, page.startTime, page.resources, page);
                        har.target_path = target_path;
                        var target_path = './temp_store/har' + Math.random();
                        fs.writeFileSync(target_path, JSON.stringify(har));
                        Har.saveHar(har, function(){
                            callback && callback();
                        });        n
                    },'title');
                }
            });
        });
    });



};
