(function (global) {
    "use strict";
    var assert = require('assert');
    global.localStorage = require('localStorage');
    var XMLHttpRequest = {};

    XMLHttpRequest.open = function() {
        return true;
    };

    XMLHttpRequest.send = function() {
        return XMLHttpRequest.onreadystatechange();
    };

    XMLHttpRequest.response200 = function() {
        this.status = 200;
        this.readyState = 4;
        this.responseText = '{}';
    };

    XMLHttpRequest.response400 = function() {
        this.status = 400;
        this.readyState = 4;
        this.responseText = '{}';
    };

    var ACStats = require('../../src/acstats')(XMLHttpRequest, global);

    before(function(done) {
        done();
    });

    after(function(done) {
        done();
    });

    describe('ACStats Client', function() {
        var ACStatsInstance;

        beforeEach(function(done) {
            var options = {
                url: '//localhost/api/all',
                data: {
                    user: {

                    },
                    server: {

                    }
                }
            };

            global.localStorage = {};

            ACStatsInstance = new ACStats(options);
            done();
        });

        afterEach(function(done) {
            done();
        });

        it('Add event', function (done) {
            ACStatsInstance.event({name: 'First event', additional: {count: 2}});

            assert(ACStatsInstance.queue.getSize() === 1);
            assert(ACStatsInstance.queue.getData().events[0].name === 'First event');
            done();
        });

        it('Add 2 hits', function (done) {
            ACStatsInstance.hit({url: 'http://yandex.ru/first'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});

            assert(ACStatsInstance.queue.getSize() === 2);
            assert(ACStatsInstance.queue.getData().hits[0].url === 'http://yandex.ru/first');
            done();
        });

        it('Validate hit', function (done) {
            ACStatsInstance.hit({url: null});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});

            assert(ACStatsInstance.queue.getSize() === 1);
            assert(ACStatsInstance.queue.getData().hits[0].url === 'http://yandex.ru/second');
            done();
        });

        it('Flush data', function (done) {
            ACStatsInstance.hit({url: 'http://yandex.ru/first'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});

            assert(ACStatsInstance.queue.getSize() === 2);
            XMLHttpRequest.response200();
            ACStatsInstance.flush();
            assert(ACStatsInstance.queue.getSize() === 0);
            done();
        });

        it('Autoflush data', function (done) {
            ACStatsInstance.hit({url: 'http://yandex.ru/first'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            assert(ACStatsInstance.queue.getSize() === 9);
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            assert(ACStatsInstance.queue.getSize() === 10);
            XMLHttpRequest.response200();
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            assert(ACStatsInstance.queue.getSize() === 1);
            done();
        });

        it('Flush data with error response', function (done) {
            ACStatsInstance.hit({url: 'http://yandex.ru/first'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});

            assert(ACStatsInstance.queue.getSize() === 2);
            XMLHttpRequest.response400();
            ACStatsInstance.flush();
            assert(ACStatsInstance.queue.getSize() === 2);
            done();
        });

        it('Support storage', function (done) {
            assert(ACStatsInstance.queue.supportStorage() === true);
            done();
        });

        it('Init data with localstorage', function (done) {
            ACStatsInstance.queue.init();
            assert(ACStatsInstance.queue.getSize() === 0);
            ACStatsInstance.hit({url: 'http://yandex.ru/first'});
            assert(ACStatsInstance.queue.getSize() === 1);
            ACStatsInstance.queue.init();
            assert(ACStatsInstance.queue.getSize() === 1);
            ACStatsInstance.queue.init();
            assert(ACStatsInstance.queue.getSize() === 1);
            done();
        });

        it('Init with backup data with localstorage', function (done) {
            ACStatsInstance.queue.init();
            assert(ACStatsInstance.queue.getSize() === 0);
            ACStatsInstance.hit({url: 'http://yandex.ru/first'});
            assert(ACStatsInstance.queue.getSize() === 1);
            ACStatsInstance.queue.backupStorage(ACStatsInstance.queue.getData());
            ACStatsInstance.queue.init();
            assert(ACStatsInstance.queue.getSize() === 2);
            ACStatsInstance.queue.init();
            assert(ACStatsInstance.queue.getSize() === 2);
            done();
        });
    });
})(this);
