/**
 * Refactored by nirkaufman on 1/4/15.
 */
(function () {


  angular.module('backand')
    .controller('ViewData', [
      'NotificationService',
      'ColumnsService',
      'DataService',
      '$scope',
      '$modal',
      'usSpinnerService',
      '$timeout',
      '$rootScope',
      'tableName',
      ViewData
    ]);

  function ViewData(NotificationService, ColumnsService, DataService, $scope, $modal, usSpinnerService, $timeout, $rootScope, tableName) {
    var self = this;

    $scope.$scope = $scope; //for ui-grid inner scope

    self.tableName = tableName;
    self.title = '';
    self.sort = '';
    self.refreshOnce = false;
    $rootScope.data = self;

    this.paginationOptions = {
      pageNumber: 1,
      pageSize: 20,
      pageSizes: [20, 50, 100, 1000]
    };

    /**
     * init the data
     */
    (function init() {
      getData();
    }());

    self.createData = function (data) {
      DataService.post(tableName, data);
    };

    self.refresh = function(){
      getData();
    }

    self.gridOptions = {
      enablePaginationControls: false,
      useExternalSorting: true,
      excludeProperties: '__metadata',
      excessColumns: 20,
      onRegisterApi: function (gridApi) {
        $scope.gridApi = gridApi;
        //declare the events

        $scope.gridApi.core.on.sortChanged($scope, function (grid, sortColumns) {
          if (sortColumns[0])
            self.sort = '[{fieldName:"' + sortColumns[0].name + '", order:"' + sortColumns[0].sort.direction + '"}]';
          else
            self.sort = '';
          getData();
        });
      }
    };



    $scope.$watchGroup([
        'data.paginationOptions.pageNumber',
        'data.paginationOptions.pageSize']
      , getPageData);

    function getPageData(newVal, oldVal) {
      if (newVal !== oldVal)
        getData();
    }

    function getData() {
      $timeout(function() { usSpinnerService.spin("loading") });

      ColumnsService.get(false)
        .then(successColumnsHandler, errorHandler)
        .then(function () {
          return DataService.get(self.tableName, self.paginationOptions.pageSize, self.paginationOptions.pageNumber, self.sort);
        })
        .then(successDataHandler, errorHandler);
    }

    function successColumnsHandler (data) {
      self.columnDefs = data.fields;
      getEditRowData();
    }

    function successDataHandler(response) {
      self.gridOptions.data = response.data.data;
      var columns = [];
      if (response.data.data.length > 0) {
        columns = _.without(Object.keys(response.data.data[0]), '__metadata');
      }

      fixDatesInData();

      self.gridOptions.columnDefs = columns.map(function (column) {
        var columnInfo = _.find(self.columnDefs, {name: column});

        return {
          minWidth: 80,
          name: column,
          cellTemplate: getCellEditTemplate(columnInfo)
        }
      });

      self.gridOptions.columnDefs.unshift({
        width: 30,
        name: ' ',
        enableSorting: false,
        enableColumnMenu: false,
        cellTemplate: '<div class="grid-edit" ng-click="getExternalScopes().data.editRow($event, row)"><i class="ti-pencil"/></div>'
      });

      if(_.last(self.gridOptions.columnDefs))
        _.last(self.gridOptions.columnDefs).minWidth = 286; //for edit widget to be shown properly

      self.gridOptions.totalItems = response.data.totalRows;

      setTimeout(refreshGridDisplay(), 1); //fix bug with bootstrap tab and ui grid
      usSpinnerService.stop("loading");
    }

    function refreshGridDisplay() {
      if (!self.refreshOnce) {
        setTimeout("$('#grid-container').trigger('resize');", 1); //resize the tab to fix the width issue with UI grid
        self.refreshOnce = true;
      }
    }

    this.pageMax = function (pageSize, currentPage, max) {
      return Math.min((pageSize * currentPage), max);
    };

    function errorHandler(error, message) {
      usSpinnerService.stop("loading");
      NotificationService.add('error', message);
    }

    function getCellEditTemplate (column) {
      if (column.form.hideInEdit || column.form.disableInEdit) return undefined;

      //var show =  !column.form.hideInCreate : !column.form.hideInEdit,
      //var disabled: scope.isNew ? field.form.disableInCreate : field.form.disableInEdit,

      var callbackOptions = ' onbeforesave="$root.data.onUpdateRowCell(row, col, $data)"';

      var type = getFieldType(column.type);

      if (type == 'dateTime')
        return '<span class="ui-grid-cell-contents" editable-date="MODEL_COL_FIELD" '
          + callbackOptions
          + '>{{COL_FIELD | date:"MM/dd/yyyy" CUSTOM_FILTERS }}</span>'
          + '<span class="ui-grid-cell-contents" editable-bstime="MODEL_COL_FIELD" e-show-meridian="false" '
          + callbackOptions
          + '>{{COL_FIELD | date:"HH:mm:ss" CUSTOM_FILTERS }}</span>';

      return '<div class="ui-grid-cell-contents" editable-' + type + '="MODEL_COL_FIELD" '
        + callbackOptions
        + '>{{COL_FIELD CUSTOM_FILTERS}}</div>';
    }

    self.onUpdateRowCell = function(row, col, newValue) {
      var updatedObject = angular.copy(row.entity);
      updatedObject[col.name] = newValue;
      return DataService.update(self.tableName, updatedObject);
    };

    function fixDatesInData() {
      self.columnDefs.forEach(function(columnDef) {
        if (columnDef.type == 'DateTime') {
          self.gridOptions.data.forEach(function(row) {
            row[columnDef.name] = new Date(row[columnDef.name]);
          });
        }
      });
    }

    function getFieldType(type) {
      switch (type) {
        case 'Numeric':
          return 'text'; // Also floats, so can't use number
        case 'DateTime':
          return 'dateTime';
        case 'ShortText':
          return 'text';
        case 'SingleSelect':
          return null;
        case 'LongText':
          return 'textarea';
        case 'Boolean':
          return 'checkbox';
        default:
          return 'text'
      }
    }


    // edit row modal

    self.getLabel = function (text) {
      return text.replace(/_/g, ' ');
    };

    self.newRow = function () {
      getEditRowEntity();
      openModal();
    };

    self.editRow = function (event, rowItem) {
      getEditRowEntity(rowItem);
      openModal();
    };

    function getEditRowEntity(rowItem) {
      self.editRowData.id = rowItem ? rowItem.entity.__metadata.id : null;
      self.editRowData.entities = [];
      self.editRowData.form.forEach(function (formItem) {
        self.editRowData.entities.push({
          key: formItem.key,
          value: rowItem ? rowItem.entity[formItem.key] : null,
          type: formItem.type
        });
      });
    }

    function resetEditRowData() {
      self.editRowData = {
        form: []
      };
    }

    function getEditRowData () {
      resetEditRowData();
      self.columnDefs.forEach(function (column) {
        if (!column.form.hideInCreate && !column.form.disableInCreate && column.type != 'MultiSelect') {
          self.editRowData.form.push({
            key: column.name,
            type: getFieldType(column.type)
          });
        }
      });
    }

    function openModal () {
      var modalInstance = $modal.open({
        templateUrl: 'views/tables/data/edit_row.html'
      });

      self.saveRow = function () {
        var record = {};
        self.editRowData.entities.forEach(function (entity) {
          if (entity.value !== null)
            record[entity.key] = entity.value;
        });

        if (self.editRowData.id) {
          record.Id = self.editRowData.id;
          return DataService.update(self.tableName, record)
            .then(modalInstance.close);
        }
        else
          return DataService.post(self.tableName, record)
            .then(modalInstance.close);

      };


      self.saveAndNew = function () {
        self.saveRow()
          .then(self.newRow)
      };

      self.cancelEditRow = function () {
        modalInstance.dismiss('cancel');
      };
    }
  }
}());
