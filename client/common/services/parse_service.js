(function () {
  'use strict';

  angular.module('common.services')
    .service('ParseService', ['$http', 'CONSTS', 'AppsService', ParseService]);

  function ParseService($http, CONSTS, AppsService) {

    var self = this;

    self.get = function () {
      return $http({
        method: 'GET',
        url: CONSTS.appUrl + '/1/parse/'
      });
    };

    self.post = function (parseUrl, parseSchema, appName) {
      return $http({
        method: 'POST',
        url: CONSTS.appUrl + '/1/parse/',
        data: {
          parseUrl: parseUrl,
          parseSchema: parseSchema
        },
        headers: {
          AppName: appName
        }
      })
    }
  }

})();
