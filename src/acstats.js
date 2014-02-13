(function(root, factory) {
    "use strict";
    if (typeof exports === 'object') {
        module.exports = function(MockXMLHttpRequest, global) {
            return factory(global ? global : root, MockXMLHttpRequest);
        };
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.acstats = factory(root);
    }
})(this, function(root, MockXMLHttpRequest) {
    "use strict";
    root = typeof root === 'object' ? root : window;

    var XHR = {
        XMLHttpFactories: [
            function () {return MockXMLHttpRequest ? MockXMLHttpRequest : new XMLHttpRequest();},
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

                                    if (request.status === 200 || request.status === 201) {
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
                        try {
                            request.open('POST', url, true);
                            if (request.setRequestHeader) {
                                request.setRequestHeader('Content-Type', 'application/json');
                            }
                            request.onreadystatechange = onreadystatechange;
                            request.send(payload);
                        } catch (e3) {
                            callback(e3);
                        }
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
            } else {
                callback(new Error());
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

    var inArray = function(array, item) {
        if (array === null) {
            return false;
        }
        var i, l;

        for (i = 0, l = array.length; i < l; i++) {
            if (array[i] === item) {
                return true;
            }
        }
        return false;
    };

    var getTimestamp = function() {
        return Math.round(new Date().getTime()/1000);
    };

    var Queue = function(options) {
        this.options = options;
        this.localstorageKey = 'acstats';
        this.localstorageBackupKey = 'acstatsBackup';
        this.init();
    };

    Queue.prototype = {
        getSize: function() {
            var count = 0;
            each(this.data, function(items) {
                count += items.length;
            });

            return count;
        },
        reset: function() {
            this.data = {};
            if (this.supportStorage()) {
                root.localStorage[this.localstorageKey] = {};
            }
        },
        init: function() {
            this.data = {};

            if (this.supportStorage()) {
                var data = root.localStorage[this.localstorageKey];
                if (data) {
                    this.data = data;
                }

                var backupData = root.localStorage[this.localstorageBackupKey];

                if (backupData) {
                    this.restore(backupData);
                    this.backupStorage(null);
                }
            }
        },
        push: function(type, data) {
            if (!this.data[type]) {
                this.data[type] = [];
            }

            this.data[type].push(data);
            this.syncStorage();
        },
        restore: function(data) {
            var that = this;
            each(data, function(items, type) {
                if (inArray(that.options.allowedTypes, type)) {
                    if (!that.data[type]) {
                        that.data[type] = [];
                    }

                    that.data[type].push.apply(that.data[type], items);
                }
            });
            this.syncStorage();
        },
        getData: function() {
            return this.data;
        },
        supportStorage: function() {
            try {
                return 'localStorage' in root && root.localStorage !== null;
            } catch (e) {
                return false;
            }
        },
        syncStorage: function() {
            if (this.supportStorage()) {
                root.localStorage[this.localstorageKey] = this.data;
            }
        },
        backupStorage: function(data) {
            if (this.supportStorage()) {
                root.localStorage[this.localstorageBackupKey] = data;
            }
        }
    };

    var ACStats = (function(root) {
        var ACStats = function(options) {
            this.options = extend({data: {}, url: '', flushLimit: 10}, options);
            this.queue = new Queue({allowedTypes: ['hits', 'sessions', 'events']});
            this.flushing = false;
            this.sendData = {};
        };

        ACStats.prototype = {
            add: function(data, type) {
                if (this.queue.getSize() >= this.options.flushLimit) {
                    this.flush();
                }

                this.queue.push(type, extend({createdTimestamp: getTimestamp()}, data, this.options.data));
            },
            hit: function(data) {
                if (!data.url) {
                    return false;
                }

                return this.add(data, 'hits');
            },
            event: function(data) {
                if (!data.name) {
                    return false;
                }

                return this.add(data, 'events');
            },
            session: function(data) {
                return this.add(data, 'sessions');
            },
            flush: function(callback) {
                if (this.queue.getSize() === 0) {
                    return false;
                }

                if (this.flushing) {
                    return false;
                }

                this.flushing = true;

                var that = this;
                this.sendData = this.queue.getData();
                this.queue.backupStorage(this.sendData);
                this.queue.reset();
                this.sendData.timestamp = getTimestamp();

                XHR.post(this.options.url, this.sendData, function(err, response) {
                    that.flushing = false;

                    if (err) {
                        that.queue.restore(that.sendData);
                    }

                    that.queue.backupStorage(null);

                    if (callback) {
                        callback(err, response);
                    }
                });
            }
        };

        return ACStats;
    })(this);

    return ACStats;
});
