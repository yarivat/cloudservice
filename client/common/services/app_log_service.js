(function() {
  'use strict';

  function AppLogService($http, $q, CONSTS) {

    var self = this;

    this.getAppLog = function(appName, size, page, isAdmin, sort){
      var filterParam = '';
      if(isAdmin)
        filterParam = '[{fieldName:"Admin", operator:"equals", value:"true"}]';
      else
        filterParam = '[{fieldName:"Admin", operator:"equals", value:"false"}]';
      var sortParam = '[{fieldName:"id", order:"desc"}]';
      if(sort)
        sortParam = sort;
      return $http({
        method: 'GET',
        url: CONSTS.appUrl + '/1/table/data/durados_v_ChangeHistory',
        headers: {
          'AppName': appName
        },
        params: {
          'pageSize': String(size),
          'pageNumber': String(page),
          'filter' : filterParam,
          'sort' : sortParam
        }
      });
    };

    function arrangeMsg(item){
      var log = '';
      switch(item.Action){
        case 'Update' :
              log = item.Action +" "+ item.FieldName +' from '+item.OldValue+" to "+item.NewValue;
              break;
        case 'Insert' :
          log = item.Action +" "+ item.FieldName +" "+item.NewValue;
          break;
        case 'Delete' :
          log = item.Action +" "+ item.FieldName +" "+item.OldValue;
          break;
      }
      return log;
    }

    this.createLogMsg = function(array){
      var logMsgs = [];
      array.forEach(function(item){
        var msg = arrangeMsg(item);
        var info = msg.substr(0,100) + " by " + item.Username;
        var infoLong = msg + + " by " + item.Username;
        var long = (msg.length>100);
        logMsgs.push({info : info, infoLong: infoLong ,long: long, open: false, time: item.UpdateDate, user: item.Username});
      });
      return logMsgs;
    }


  }

  angular.module('common.services')
    .service('AppLogService',['$http', '$q', 'CONSTS', AppLogService]);

})();
