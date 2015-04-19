(function  () {
  'use strict';
  angular.module('backand.database')
    .controller('DatabaseTodoExample', ['$state', 'DatabaseNamesService', 'NotificationService', 'DatabaseService', '$http', '$scope','$analytics', DatabaseTodoExample]);

  function DatabaseTodoExample($state, DatabaseNamesService, NotificationService, DatabaseService, $http, $scope, $analytics) {

    var self = this;

    (function init() {
      self.appName = $state.params.appName;
      self.loading = false;
      $http({
        method: 'GET',
        url: 'examples/todo/model.json'
      })
        .then(function (result) {
          self.generatorCode = angular.toJson(result.data, true);
        });
    }());

    self.create = function(){
      self.loading = true;
      var product = DatabaseNamesService.getNumber("newMysql");

      var sampleApp = "todo-mysql";

      DatabaseService.createDB(self.appName, product, sampleApp)
        .success(function(data) {
          NotificationService.add('info', 'Creating new database... It may take 1-2 minutes');
          $analytics.eventTrack('create todo', {name: self.appName});
          $state.go('playground.todo');
        })
        .error(function(err) {
          self.loading = false;
          NotificationService.add('error', err)
        })
    };

    $scope.ace = {
      dbType: 'json',
      editors: {},
      onLoad: function(_editor) {
        $scope.ace.editors[_editor.container.id] = _editor;
        _editor.$blockScrolling = Infinity;
      }
    };

  }
}());