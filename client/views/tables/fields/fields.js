/**
 * Created by nirkaufman on 1/4/15.
 */
(function () {
  /**
   * get the fields items from the server in response
   * to 'tabs:fields' event.
   *
   * @param $scope
   * @param ColumnsService
   * @param NotificationService
   * @constructor
   */
  function FieldsController($scope, ColumnsService, TablesService, NotificationService) {

    var self = this;

    self.newTypes = {
      ShortText: 'string',
      LongText: 'text',
      Numeric: 'float',
      DateTime: 'datetime',
      Boolean: 'boolean',
      SingleSelect: 'object',
      MultiSelect: 'collection',
      Point: 'point'
    };

    /**
     * init an empty items array, send an ajax
     * call to populate the items array and
     * register an event listener on scope
     */
    (function init() {
      self.items = [];
      getFields(true);
      $scope.$on('appname:saved', reloadFields);
      $scope.$on('after:sync', afterSync);
    }());

    self.getTableId = function (tableName) {
      return TablesService.getTableByName(tableName).__metadata.id;
    };

    /**
     * Force to load the view
     */
    function reloadFields() {
        ColumnsService.get(true).then(successHandler, errorHandler)
    }

    /**
     * ajax call to get the fields items
     */
    function getFields(force) {
      if(self.view == null && ColumnsService.tableName != null)
        ColumnsService.get(force).then(successHandler, errorHandler)
    }

    /**
     * extract and bind the data to the scope
     * @param data
     */
    function successHandler(data) {
      self.items = data.fields;
      self.view = data;
    }

    /**
     * watch for changes in view object
     */
    $scope.$watch(function () { return self.view }, function (newVal,oldValue){
      if(newVal != null && oldValue != null && newVal !== oldValue) {
        ColumnsService.commit(self.view);
        if(self.view.name != self.view.__metadata.name)
          $scope.$emit('appname:updated',self.view.name);
      }
    }, true);

    /**
     * Commit the changes
     */
    function afterSync(){
      ColumnsService.forceCommit(self.view).then(reloadFields,errorHandler);
    }

    /**
     * delegate any error to notification service
     * @param error
     * @param message
     */
    function errorHandler(error, message) {
      NotificationService.add('error', message);
    }
  }

  angular.module('backand')
    .controller('FieldsController', ['$scope', 'ColumnsService', 'TablesService', 'NotificationService', FieldsController]);
}());
