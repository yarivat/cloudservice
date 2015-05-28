/**
 * Refactored by nirkaufman on 1/4/15.
 */
(function () {


  angular.module('backand')
    .controller('ObjectDataController', [
      'NotificationService',
      'ColumnsService',
      'DataService',
      '$scope',
      '$modal',
      'usSpinnerService',
      'tableName',
      'ConfirmationPopup',
      '$filter',
      ObjectDataController
    ]);

  function ObjectDataController(
    NotificationService,
    ColumnsService,
    DataService,
    $scope,
    $modal,
    usSpinnerService,
    tableName,
    ConfirmationPopup,
    $filter
  ) {

    var self = this;

    $scope.$scope = $scope; //for ui-grid inner scope

    self.tableName = tableName;
    self.title = '';
    self.sort = '';
    self.refreshOnce = false;

    this.paginationOptions = {
      pageNumber: 1,
      pageSize: 20,
      pageSizes: [20, 50, 100, 1000]
    };

    (function init() {
      getData(true);
    }());

    self.createData = function (data) {
      DataService.post(tableName, data);
    };

    self.refresh = function () {
      getData();
    };

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
        'ObjectData.paginationOptions.pageNumber',
        'ObjectData.paginationOptions.pageSize']
      , getPageData);

    function getPageData(newVal, oldVal) {
      if (newVal !== oldVal)
        getData();
    }

    function getData(force) {
      usSpinnerService.spin("loading-data");

      ColumnsService.get(force)
        .then(successColumnsHandler, errorHandler)
        .then(loadData)
        .then(successDataHandler, errorHandler);
    }

    function loadData() {
      return DataService.get(self.tableName, self.paginationOptions.pageSize, self.paginationOptions.pageNumber, self.sort);
    }

    function successColumnsHandler (data) {
      self.columnDefs = data.fields;
      getEditRowData();
    }

    function successDataHandler(response) {
      self.gridOptions.totalItems = response.data.totalRows;
      if (self.gridOptions.totalItems === 0) {
        usSpinnerService.stop("loading-data");
        return;
      }

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

      addActionColumns();

      if(_.last(self.gridOptions.columnDefs))
        _.last(self.gridOptions.columnDefs).minWidth = 286; //for edit widget to be shown properly

      setTimeout(refreshGridDisplay(), 1); //fix bug with bootstrap tab and ui grid
      usSpinnerService.stop("loading-data");
    }

    function addActionColumns() {

      var actionColumnOptions = {
        width: 30,
        displayName: '',
        enableSorting: false,
        enableColumnMenu: false
      };

      var deleteColumnOptions = {
        name: 'delete',
        cellTemplate: '<div class="grid-icon" ng-click="getExternalScopes().ObjectData.deleteRow($event, row)"><i class="ti-trash"/></div>'
      };
      angular.extend(deleteColumnOptions, actionColumnOptions);
      self.gridOptions.columnDefs.unshift(deleteColumnOptions);

      var editColumnOptions = {
        name: 'edit',
        cellTemplate: '<div class="grid-icon" ng-click="getExternalScopes().ObjectData.editRow($event, row)"><i class="ti-pencil"/></div>'
      };
      angular.extend(editColumnOptions, actionColumnOptions);
      self.gridOptions.columnDefs.unshift(editColumnOptions);
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
      usSpinnerService.stop("loading-data");
      NotificationService.add('error', message);
    }

    function getCellEditTemplate (column) {
      if (column.form.hideInEdit || column.form.disableInEdit) return undefined;

      var callbackOptions = ' onbeforesave="getExternalScopes().ObjectData.onUpdateRowCell(row, col, $data)"';

      var type = getFieldType(column.type);

      if (type == 'dateTime')
        return '<div class="ui-grid-cell-contents"><span editable-date="MODEL_COL_FIELD" '
          + callbackOptions
          + '>{{COL_FIELD | date:"MM/dd/yyyy" CUSTOM_FILTERS }}</span> '
          + '<span editable-bstime="MODEL_COL_FIELD" e-show-meridian="false" '
          + callbackOptions
          + '>{{COL_FIELD | date:"HH:mm:ss" CUSTOM_FILTERS }}</span></div>';

      if (!_.isEmpty(column.relatedViewName)) {
        return '<div class="ui-grid-cell-contents" editable-text="MODEL_COL_FIELD" ' +
          'e-typeahead="item.value as item.value + \'. \' + item.label ' +
          'for item in getExternalScopes().ObjectData.getAutocomplete(col.field, $viewValue)" '
          + callbackOptions
          + '>{{COL_FIELD CUSTOM_FILTERS}}</div>';
      }

      return '<div class="ui-grid-cell-contents" editable-' + type + '="MODEL_COL_FIELD" '
        + callbackOptions
        + '>{{COL_FIELD CUSTOM_FILTERS}}</div>';
    }

    self.getAutocomplete = function (columnName, term) {
      return DataService.getAutocomplete(self.tableName, columnName, term)
        .then(function(result) {
          results = $filter('orderBy')(result.data, 'value');
          return results;
        });
    };

    self.onUpdateRowCell = function(row, col, newValue) {
      var updatedObject = angular.copy(row.entity);
      updatedObject[col.name] = newValue;
      var updatePromise = DataService.update(self.tableName, updatedObject, row.entity.__metadata.id);
      updatePromise
        .then(loadData)
        .then(successDataHandler);
      return updatePromise;
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
        case 'MultiSelect':
          return 'MultiSelect';
        case 'SingleSelect':
          return 'SingleSelect';
        case 'Numeric':
          return 'text'; // Also floats, so can't use number
        case 'DateTime':
          return 'dateTime';
        case 'ShortText':
          return 'text';
        case 'LongText':
          return 'textarea';
        case 'Boolean':
          return 'checkbox';
        default:
          return 'text'
      }
    }

    // edit row modal

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
          hide: formItem.hideInCreate && !rowItem || formItem.hideInEdit && rowItem,
          disable: formItem.disable || formItem.disableInCreate && !rowItem || formItem.disableInEdit && rowItem,
          required: formItem.required,
          value: rowItem ? rowItem.entity[formItem.key] : formItem.defaultValue,
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
        self.editRowData.form.push({
          disableInCreate: column.form.disableInCreate,
          hideInCreate: column.form.hideInCreate,
          disableInEdit: column.form.disableInEdit,
          hideInEdit: column.form.hideInEdit,
          disable: column.type === 'MultiSelect',
          required: column.advancedLayout.required,
          defaultValue: column.advancedLayout.defaultValue,
          key: column.name,
          type: getFieldType(column.type),
          relatedViewName: column.relatedViewName
        });
      });
    }

    function openModal () {
      var modalInstance = $modal.open({
        templateUrl: 'views/tables/data/edit_row.html',
        controller: 'EditRowController as EditRow',
        resolve: {
          editRowData: function () {
            return self.editRowData;
          },
          tableName: function () {
            return self.tableName;
          }
        }
      });

      modalInstance.result.then(function (result) {
        if (result.reopen) {
          self.newRow();
        }
        else {
          usSpinnerService.spin("loading-data");
        }
        loadData()
          .then(successDataHandler);
      });
    }

    self.deleteRow = function (event, rowItem) {
      ConfirmationPopup.confirm('Are you sure you want to delete the object?')
        .then(function (result) {
          if (!result)
            return;
          usSpinnerService.spin("loading-data");
          DataService.delete(self.tableName, rowItem.entity, rowItem.entity.__metadata.id)
            .then(loadData)
            .then(successDataHandler);
        });
    };
  }
}());
