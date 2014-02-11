module.exports = function(grunt) {
    "use strict";
    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),
        mochacli: {
            options: {
                require: ['should'],
                files: 'tests/spec/**/*.js',
                timeout: 30000,
                ui: 'bdd'
            },
            spec: {
                options: {
                    reporter: 'spec'
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            application: {
                files: {
                    src: [
                        'tests/spec/**/*.js',
                        'src/**/*.js'
                    ]
                }
            }
        }
    });

    //Загрузка модулей, которые предварительно установлены
    grunt.loadNpmTasks('grunt-mocha-cli');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    //Эти задания будут выполнятся сразу же когда вы в консоли напечатание grunt, и нажмете Enter
    grunt.registerTask('tests', ['jshint', 'mochacli']);

    grunt.registerTask('default', function() {
        var _tasks, tasks, table;

        grunt.log.header('Available tasks');

        _tasks = [];
        Object.keys(grunt.task._tasks).forEach(function(name) {
            var task = grunt.task._tasks[name];
            if (task.meta.info === 'Gruntfile' && !task.multi && name !== 'default') {
                _tasks.push(task);
            }
        });

        tasks = _tasks.map(function(task) {
            var info = task.info;
            if (task.multi) { info += ' *'; }
            return [task.name, info];
        });

        table = function(arr) {
            arr.forEach(function(item) {
                grunt.log.writeln(grunt.log.table([30, 120], [item[0], item[1]]));
            });
        };

        table(tasks);
    });
};
