(function(root, factory) {
    "use strict";
    if (typeof exports === 'object') {
        module.exports = function(MockXMLHttpRequest, global) {
            return factory(global ? global : root, MockXMLHttpRequest);
        };
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    }

    root.ACStats = factory(root);
})(this, function(root, MockXMLHttpRequest) {
    "use strict";

    var isEmptyObject = function(obj) {
        var name;
        for (name in obj ) {
            if (obj.hasOwnProperty(name)) {
                return false;
            }
        }

        return true;
    };

    root = typeof root === 'object' ? root : window;
    MockXMLHttpRequest = (MockXMLHttpRequest && typeof MockXMLHttpRequest === 'object' && isEmptyObject(MockXMLHttpRequest)) ? undefined : MockXMLHttpRequest;

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
                callback(new Error());

                return false;
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

    var isLocalStorageNameSupported = function() {
        var storage = root.localStorage;

        try {
            storage.setItem('test', '1');
            storage.removeItem('test');

            return 'localStorage' in root && root.localStorage;
        } catch (error) {
            return false;
        }
    };

    var ObjectId = (function () {
        var increment = 0;
        var pid = Math.floor(Math.random() * (32767));
        var machine = Math.floor(Math.random() * (16777216));

        if (isLocalStorageNameSupported()) {
            var mongoMachineId = parseInt(root.localStorage.mongoMachineId, 10);
            if (mongoMachineId >= 0 && mongoMachineId <= 16777215) {
                machine = Math.floor(root.localStorage.mongoMachineId);
            }
            // Just always stick the value in.
            root.localStorage.mongoMachineId = machine;
            if (typeof document !== 'undefined') {
                document.cookie = 'mongoMachineId=' + machine + ';expires=Tue, 19 Jan 2038 05:00:00 GMT';
            }
        } else {
            if (typeof document !== 'undefined') {
                var cookieList = document.cookie.split('; ');
                for (var i in cookieList) {
                    if (cookieList.hasOwnProperty(i)) {
                        var cookie = cookieList[i].split('=');
                        if (cookie[0] === 'mongoMachineId' && cookie[1] >= 0 && cookie[1] <= 16777215) {
                            machine = cookie[1];
                            break;
                        }
                    }
                }
            }
            if (typeof document !== 'undefined') {
                document.cookie = 'mongoMachineId=' + machine + ';expires=Tue, 19 Jan 2038 05:00:00 GMT';
            }
        }

        function ObjId() {
            if (!(this instanceof ObjectId)) {
                return new ObjectId(arguments[0], arguments[1], arguments[2], arguments[3]).toString();
            }

            if (typeof (arguments[0]) === 'object') {
                this.timestamp = arguments[0].timestamp;
                this.machine = arguments[0].machine;
                this.pid = arguments[0].pid;
                this.increment = arguments[0].increment;
            }
            else if (typeof (arguments[0]) === 'string' && arguments[0].length === 24) {
                this.timestamp = Number('0x' + arguments[0].substr(0, 8));
                this.machine = Number('0x' + arguments[0].substr(8, 6));
                this.pid = Number('0x' + arguments[0].substr(14, 4));
                this.increment = Number('0x' + arguments[0].substr(18, 6));
            }
            else if (arguments.length === 4 && arguments[0] !== null) {
                this.timestamp = arguments[0];
                this.machine = arguments[1];
                this.pid = arguments[2];
                this.increment = arguments[3];
            }
            else {
                this.timestamp = Math.floor(new Date().valueOf() / 1000);
                this.machine = machine;
                this.pid = pid;
                this.increment = increment++;
                if (increment > 0xffffff) {
                    increment = 0;
                }
            }
        }
        return ObjId;
    })();

    ObjectId.prototype.getDate = function () {
        return new Date(this.timestamp * 1000);
    };

    ObjectId.prototype.toArray = function () {
        var strOid = this.toString();
        var array = [];
        var i;
        for(i = 0; i < 12; i++) {
            array[i] = parseInt(strOid.slice(i*2, i*2+2), 16);
        }
        return array;
    };

    /**
     * Turns a WCF representation of a BSON ObjectId into a 24 character string representation.
     */
    ObjectId.prototype.toString = function () {
        var timestamp = this.timestamp.toString(16);
        var machine = this.machine.toString(16);
        var pid = this.pid.toString(16);
        var increment = this.increment.toString(16);
        return '00000000'.substr(0, 8 - timestamp.length) + timestamp +
            '000000'.substr(0, 6 - machine.length) + machine +
            '0000'.substr(0, 4 - pid.length) + pid +
            '000000'.substr(0, 6 - increment.length) + increment;
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
                this.storageSet({});
            }
        },
        init: function() {
            this.data = {};

            if (this.supportStorage()) {
                var data = this.storageGet();
                if (data) {
                    this.data = data;
                }

                var backupData = this.storageGet(this.localstorageBackupKey);

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
            return isLocalStorageNameSupported();
        },
        syncStorage: function() {
            if (this.supportStorage()) {
                this.storageSet(this.data);
            }
        },
        backupStorage: function(data) {
            if (this.supportStorage()) {
                this.storageSet(data, this.localstorageBackupKey);
            }
        },
        storageSet: function(data, key) {
            key = key || this.localstorageKey;
            try {
                root.localStorage[key] = JSON.stringify(data);
            } catch(e) {
                return {};
            }
        },
        storageGet: function(key) {
            key = key || this.localstorageKey;
            try {
                return JSON.parse(root.localStorage[key]);
            } catch(e) {
                return {};
            }
        }
    };

    var ACStats = (function(root) {
        var ACStats = function(options) {
            this.options = extend({data: {}, url: '', flushLimit: 10, autoFlushInterval: 1000 * 60 * 3}, options);
            this.queue = new Queue({allowedTypes: ['hits', 'sessions', 'events', 'times']});
            this.flushing = false;
            this.sendData = {};
            this.initAutoFlush();
        };

        ACStats.prototype = {
            add: function(data, type, force) {
                if (this.queue.getSize() >= this.options.flushLimit) {
                    this.flush();
                }

                this.queue.push(type, extend({createdTimestamp: getTimestamp()}, data, this.options.data));

                if (force === true) {
                    this.flush();
                }
            },
            hit: function(data, force) {
                if (!data.url) {
                    return false;
                }

                return this.add(data, 'hits', force);
            },
            time: function(data, force) {
                if (!data.url) {
                    return false;
                }

                return this.add(data, 'times', force);
            },
            event: function(data, force) {
                if (!data.name) {
                    return false;
                }

                return this.add(data, 'events', force);
            },
            session: function(data, force) {
                return this.add(data, 'sessions', force);
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

                    that.sendData = null;
                    that.queue.backupStorage(null);

                    if (callback) {
                        callback(err, response);
                    }
                });
            },
            initAutoFlush: function() {
                if (!this.options.autoFlushInterval) {
                    return false;
                }

                var that = this;
                var autoFlush = function() {
                    that.flush();
                };

                this.autoFlushId = setInterval(autoFlush, this.options.autoFlushInterval);
            },
            ObjectId: ObjectId
        };

        return ACStats;
    })(this);

    return ACStats;
});
