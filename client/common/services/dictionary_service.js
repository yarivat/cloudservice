(function () {

  function DictionaryService($http, CONSTS) {

    var self = this;
    var baseUrl = '/1/table/dictionary/';

    self.appName = null;
    self.tableId = null;
    self.tableName = null;

    self.get = function () {
      return $http({
          method: 'GET',
          url: CONSTS.appUrl + baseUrl + self.tableName + '/?deep=false&withSystemTokens=true',
          headers: {AppName: self.appName}
        })
      }
    }

    angular.module('app')
      .service('DictionaryService', ['$http','CONSTS',DictionaryService]);
  }());