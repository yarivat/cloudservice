(function() {
  'use strict';

  function TablesService($http, $q, CONSTS) {

    this.sync = function(appName) {
        return $http({
            method: 'GET',
            url: CONSTS.appUrl + '/1/app/sync',
            headers: { AppName: appName }
        });
    };

    this.get = function(appName) {
      return $http({
        method: 'GET',
        url: CONSTS.appUrl + '/1/table/config?pageSize=200&pageNumber=1',
        headers: { AppName: appName },
        params: {
            filter: '[{fieldName:"SystemView", operator:"equals", value: false}]',
            sort: '[{fieldName:"captionText", order:"asc"}]'
        }
      });
    };
  }

  angular.module('common.services')
    .service('TablesService', ['$http', '$q', 'CONSTS', TablesService]);
})();