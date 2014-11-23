'use strict';

angular.module('app.database', [])
  .config(config);

function config($stateProvider) {
  $stateProvider
    .state('database.show', {
      url: '/:name/',
      controller: 'DatabaseShow as dbshow',
      templateUrl: 'views/database/show.html'
    })
    .state('database.edit', {
        url: '/:name/edit',
        controller: 'DatabaseEdit as dbedit',
        templateUrl: 'views/database/edit.html'
      })

}