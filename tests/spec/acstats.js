(function () {
    "use strict";
    var assert = require('assert');
    var ACStats = require('../../src/acstats');

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

            ACStatsInstance = new ACStats(options);
            done();
        });

        afterEach(function(done) {
            done();
        });

        it('Add event', function (done) {
            ACStatsInstance.event({name: 'First event', additional: {count: 2}});

            assert(ACStatsInstance.getSize() === 1);
            assert(ACStatsInstance.queue.events[0].name === 'First event');
            done();
        });

        it('Add 2 hits', function (done) {
            ACStatsInstance.hit({url: 'http://yandex.ru/first'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});

            assert(ACStatsInstance.getSize() === 2);
            assert(ACStatsInstance.queue.hits[0].url === 'http://yandex.ru/first');
            done();
        });

        it('Validate hit', function (done) {
            ACStatsInstance.hit({url: null});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});

            assert(ACStatsInstance.getSize() === 1);
            assert(ACStatsInstance.queue.hits[0].url === 'http://yandex.ru/second');
            done();
        });

        it('Flush data', function (done) {
            ACStatsInstance.hit({url: 'http://yandex.ru/first'});
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});

            assert(ACStatsInstance.getSize() === 2);
            ACStatsInstance.flush();
            assert(ACStatsInstance.getSize() === 0);
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
            assert(ACStatsInstance.getSize() === 9);
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            assert(ACStatsInstance.getSize() === 10);
            ACStatsInstance.hit({url: 'http://yandex.ru/second'});
            assert(ACStatsInstance.getSize() === 1);
            done();
        });
    });
})();
