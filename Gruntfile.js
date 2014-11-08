module.exports = function (grunt) {
  grunt.initConfig({
    jscs: {
      all: '<%= jshint.all %>',
      options: {
        config: '.jscsrc'
      }
    },
    jshint: {
      all: [
        '*.js', 
        'lib/**/*.js', 
        'test/**/*.js'
      ],
      options: {
        jshintrc: true
      }
    },
    'mocha_istanbul': {
      all: {
        src: 'test/**/*.js'
      }
    },
    watch: {
      test: {
        files: '<%= jshint.all %>',
        tasks: [
          'test'
        ],
        options: {
          spawn: false
        }
      }
    }
  });

  grunt.registerTask('default', [
    'watch'
  ]);

  grunt.registerTask('test', [
    'jscs',
    'jshint',
    'mocha_istanbul'
  ]);

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-mocha-istanbul');
};
