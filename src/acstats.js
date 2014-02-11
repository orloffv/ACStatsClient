(function(root, factory) {
    "use strict";
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.acstats = factory;
    }
})(this, function() {
    "use strict";

    var XHR = {
        XMLHttpFactories: [
            function () {return new XMLHttpRequest();},
            function () {return new ActiveXObject("Msxml2.XMLHTTP");},
            function () {return new ActiveXObject("Msxml3.XMLHTTP");},
            function () {return new ActiveXObject("Microsoft.XMLHTTP");}
        ],
        createXMLHTTPObject: function() {
            var xmlhttp = false;
            var factories = XHR.XMLHttpFactories;
            var i;
            var numFactories = factories.length;
            for (i = 0; i < numFactories; i++) {
                try {
                    xmlhttp = factories[i]();
                    break;
                } catch (e) {
                    // pass
                }
            }
            return xmlhttp;
        },
        post: function(url, payload, callback) {
            if (typeof payload !== 'object') {
                throw new Error('Expected an object to POST');
            }
            payload = JSON.stringify(payload);
            callback = callback || function() {};
            var request = XHR.createXMLHTTPObject();
            if (request) {
                try {
                    try {
                        var onreadystatechange = function(args) {
                            try {
                                if (onreadystatechange && request.readyState === 4) {
                                    onreadystatechange = undefined;

                                    if (request.status === 200) {
                                        callback(null, JSON.parse(request.responseText));
                                    } else if (typeof(request.status) === "number" &&
                                        request.status >= 400  && request.status < 600) {
                                        // return valid http status codes
                                        callback(new Error(request.status.toString()));
                                    } else {
                                        // IE will return a status 12000+ on some sort of connection failure,
                                        // so we return a blank error
                                        // http://msdn.microsoft.com/en-us/library/aa383770%28VS.85%29.aspx
                                        callback(new Error());
                                    }
                                }
                            } catch (ex) {
                                //jquery source mentions firefox may error out while accessing the
                                //request members if there is a network error
                                //https://github.com/jquery/jquery/blob/a938d7b1282fc0e5c52502c225ae8f0cef219f0a/src/ajax/xhr.js#L111
                                var exc;
                                if (typeof ex === 'object' && ex.stack) {
                                    exc = ex;
                                } else {
                                    exc = new Error(ex);
                                }
                                callback(exc);
                            }
                        };

                        request.open('POST', url, true);
                        if (request.setRequestHeader) {
                            request.setRequestHeader('Content-Type', 'application/json');
                        }
                        request.onreadystatechange = onreadystatechange;
                        request.send(payload);
                    } catch (e1) {
                        // Sending using the normal xmlhttprequest object didn't work, try XDomainRequest
                        if (typeof XDomainRequest !== "undefined") {
                            var ontimeout = function(args) {
                                callback(new Error());
                            };

                            var onerror = function(args) {
                                callback(new Error());
                            };

                            var onload = function(args) {
                                callback(null, JSON.parse(request.responseText));
                            };

                            request = new XDomainRequest();
                            request.onprogress = function() {};
                            request.ontimeout = ontimeout;
                            request.onerror = onerror;
                            request.onload = onload;
                            request.open('POST', url, true);
                            request.send(payload);
                        }
                    }
                } catch (e2) {
                    callback(e2);
                }
            }
        }
    };

    var breaker = {};

    var each = function(obj, iterator, context) {
        if (obj === null) {
            return;
        }

        if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
            obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
                if (iterator.call(context, obj[i], i, obj) === breaker) {
                    return;
                }
            }
        } else {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (iterator.call(context, obj[key], key, obj) === breaker) {
                        return;
                    }
                }
            }
        }
    };

    var extend = function(obj) {
        each(Array.prototype.slice.call(arguments, 1), function(source) {
            for (var prop in source) {
                if (source.hasOwnProperty(prop)) {
                    obj[prop] = source[prop];
                }
            }
        });

        return obj;
    };

    var getTimestamp = function() {
        return Math.round(new Date().getTime()/1000);
    };

    var ACStats = (function(root) {
        var ACStats = function(options) {
            this.options = extend({data: {}, url: ''}, options);
            this.queue = {};
        };

        ACStats.prototype.add = function(data, type) {
            if (this.getSize() >= 10) {
                this.flush();
            }

            if (!this.queue[type]) {
                this.queue[type] = [];
            }

            this.queue[type].push(extend({createdTimestamp: getTimestamp()}, data, this.options.data));
        };

        ACStats.prototype.getSize = function() {
            var count = 0;
            each(this.queue, function(items) {
                count += items.length;
            });

            return count;
        };

        ACStats.prototype.hit = function(data) {
            if (!data.url) {
                return false;
            }

            return this.add(data, 'hits');
        };

        ACStats.prototype.event = function(data) {
            if (!data.name) {
                return false;
            }

            return this.add(data, 'events');
        };

        ACStats.prototype.flush = function(callback) {
            var data = this.queue;
            this.queue = {};
            data.timestamp = getTimestamp();

            XHR.post(this.options.url, data, callback);
        };

        return ACStats;
    })(this);

    return ACStats;
});
