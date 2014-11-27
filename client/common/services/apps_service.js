(function() {
  'use strict';

  function appsService($http, $q, CONSTS,DatabaseNamesService) {

    var self = this;

    var apps = {
      list: [],
      names: []
    };

    var currentApp;
    var appData = {};

    apps.deferred = $q.defer();

    function updateAppNames() {
      apps.names = [];

      apps.list.forEach(function(item) {
        apps.names.push(item.Name)
      })
    }

    this.setCurrentApp = function(data){
      currentApp = data;
      var Database_Source = data.Database_Source ? DatabaseNamesService.getName(data.Database_Source.Id) : undefined;
      currentApp.databaseName = Database_Source;
    };

    this.getCurrentApp = function(appName){
      appData.deferred = $q.defer();
      if ( currentApp && currentApp.Name === appName ){
         appData.deferred.resolve(currentApp);
      }else {
        self.find(appName)
          .success(function (data){
            self.setCurrentApp(data);
            currentApp.myStatus = {status : data.DatabaseStatus};
            return appData.deferred.resolve(currentApp)
        })
          .error(function(err){
            return appData.deferred.reject(err);
          })
      }
      return appData.deferred.promise;

    };

    function searchStringInArray (str, strArray) {
      for (var j=0; j<strArray.length; j++) {
        if (strArray[j].match(str)) return j;
      }
      return -1;
    }


    this.appNames = function(appName) {
      if (searchStringInArray(appName, apps.names) === -1){
        apps.names.push(appName);
      }
      return apps.names;
    };

    this.all = function() {
      $http({
        method: 'GET',
        url: CONSTS.appUrl + '/admin/myApps'
      })
      .success(function (data) {
        apps.list = data.data;
        updateAppNames();
        apps.deferred.resolve(apps);
      })
      .error(function (error) {
        apps.deferred.reject(error);
      });

      return apps.deferred.promise;
    };

    this.find = function(appName) {
      return $http({
        method: 'GET',
        url: CONSTS.appUrl + '/admin/myApps/'+appName+'?deep=true'});
    };

    this.add = function(name, title) {
      var deferred = $q.defer();

      $http({
        method: 'POST',
        url: CONSTS.appUrl + '/admin/myApps/',
        data: {
                Name: name,
                Title: title
              }
      })
      .success(function(data) {
        deferred.resolve(data.data);
      })
      .error(function(error) {
        deferred.reject(error);
      });

      return deferred.promise;
    };

    this.update = function(name,title) {
      return $http({
        method: 'PUT',
        url: CONSTS.appUrl + '/admin/myApps/'+name,
        data: {
          Title: title
        }
      });
    };

    this.refreshApp = function(appName){
      self.find(appName)
        .success( function(appItem){
          self.setCurrentApp(appItem)
      })
    };

  }

  angular.module('common.services')
    .service('AppsService',['$http', '$q', 'CONSTS','DatabaseNamesService', appsService]);

})();
