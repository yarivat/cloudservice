(function() {
  'use strict';

  function DataBaseNamesService() {

    var numbers = {
      2 : 'sqlserver',
      4 : 'mysql',
      6 : 'mongodb',
      7 : 'oracle',
      8 : 'postgresql',
      10 : 'newMysql',
      11 : 'newPostgre',
      12 : 'newDummy'
    };

    var names = {
      'sqlserver' : 2,
      'mysql' : 4,
      'mongodb': 6,
      'oracle': 7,
      'postgresql': 8,
      'newMysql': 10,
      'newPostgre': 11,
      'newDummy': 12
    };

    this.getName = function(dataNumber){
       return numbers[dataNumber];
    };

    this.getNumber = function (dataName){
      return names[dataName];
    };

  }

  angular.module('common.services')
    .service('DataBaseNamesService',[ DataBaseNamesService]);

})();

