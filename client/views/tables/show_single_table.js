(function  () {
  'use strict';
  angular.module('app')
    .controller('SingleTableShow', ['$scope', '$state', 'AppsService', 'usSpinnerService', 'NotificationService', 'ColumnsService','$timeout', '$log', SingleTableShow]);

  function SingleTableShow($scope, $state, AppsService, usSpinnerService, NotificationService, ColumnsService, $timeout, $log) {
    


    $log.debug($state.params);
    var self = this;
    var currentApp;
    self.messages = ["no stats yet..."];
    self.alertClass = "";

    ColumnsService.get($state.params.appName, $state.params.tableName)
      .then(function(data) {
        $log.debug("columns success:", data);
        // data.data.fields
      }, 
      function(err) {
        $log.debug("columns failure:", err);
        NotificationService.add('error', 'Can not get table info');
      }
    );

    this.reloadTables = function() {
      usSpinnerService.spin("loading");

      TablesService.get(self.currentApp.Name)
        .then(function (data) {
          usSpinnerService.stop("loading");
          self.tables = data.data.data;
        }, function(err) {
          usSpinnerService.stop("loading");
          NotificationService.add('error', 'Can not get tables list');
      });
    }

    this.sync = function() {
      self.syncing = true;
      NotificationService.add('info', 'Sync takes 1-2 minutes');
      TablesService.sync(self.currentApp.Name)
        .then(function (data) {
          self.syncing = false;
          //update messages
          self.messages = [];
          self.messages.push('New tables added: ' + data.data.added);
          self.messages.push('Tables with error:' + (data.data.newTables - data.data.added));

          if(data.data.errors !== '')
          {

              //data.data.errors = data.data.errors.replace(/\r?\n/g, "%0D%0A");
              NotificationService.add('error', 'Synchronizing tables completed with errors: ' + data.data.errors);
              self.alertClass = 'tables-alert-with-errors';
              self.messages.push('Errors: ' + data.data.errors);
          }
          else
          {
              NotificationService.add('success', 'Synchronizing tables was completed successfully');
              self.alertClass = '';
          }
          //refresh tables list
          self.reloadTables();

        }, function(err) {
          self.syncing = false;
          NotificationService.add('error', 'Can not sync tables');
        });
    }

    this.getMessages = function() {
        return self.messages;
    }

    //Sync the tables when loading the page
    // angular.element(document).ready(function () {
    //     if($state.params.sync === '1')
    //         $timeout(function() {
    //             $state.params.sync = 0;
    //             angular.element('#sync_button')[0].click();
    //         }, 100);
    // });

  }
}());
