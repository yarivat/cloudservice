/**
 * Created by nirkaufman on 1/4/15.
 */
(function () {

  angular.module('app')
    .controller('RulesController',
    ['$scope',
      'ConfirmationPopup',
      '$filter',
      'RulesService',
      'NotificationService',
      'DictionaryService',
      'AppState',
      'AppsService',
      'AppLogService',
      'usSpinnerService',
      RulesController]);

  function RulesController(
    $scope,
    ConfirmationPopup,
    $filter,
    RulesService,
    NotificationService,
    DictionaryService,
    AppState,
    AppsService,
    AppLogService,
    usSpinnerService) {

    var self = this;
    var appName;
    /**
     * init an empty items array on scope
     * register an event listener.
     * init the open modal
     */
    (function init() {
      self.items = [];
      loadDbType();
      $scope.$on('tabs:rules', getRules);
    }());

    var defaultRule = {
      'viewTable': RulesService.tableId,
      'additionalView': "",
      'databaseViewName': "",
      'useSqlParser': true
    };

    self.newAction = function (trigger) {
      self.action = {
        whereCondition: 'true',
        code: backandCallbackConstCode.start + '\n' +
        '\t// write your code here\n\n' +
        '\treturn {};\n' +
        backandCallbackConstCode.end
      };

      if (trigger) {
        self.action.dataAction = trigger;
      }

      self.clearTest();
      self.editAction();
};

    self.showAction = function (actionName) {
      var action = getRuleByName(actionName);
      refreshAction(action);
      self.clearTest();
    };

    function refreshAction(action) {
      self.editMode = false;
      self.requestTestForm = false;
      $scope.modal.toggleGroup();
      if (self.newRuleForm)
        self.newRuleForm.$setPristine();
      if (action && action.__metadata) {
        RulesService.getRule(action.__metadata.id).then(loadAction, errorHandler); }
      else {
        self.action = null; }
    }

    function loadAction(data)
    {
      self.action = data.data;
    }

    self.allowEditAction = function () {
      return (self.action && self.action.__metadata && !self.editMode);
    };

    self.editAction = function () {
      self.editMode = true;
      $scope.modal.toggleGroup();
    };

    self.clearTest = function () {
      self.test = {
        parameters: {},
        rowId: ''
      };
    };

    self.doneEdit = function () {
      refreshAction(self.action);
    };

    self.cancelEdit = function () {
      ConfirmationPopup.confirm('Changes will be lost. Are sure you want to cancel editing?')
        .then(function (result) {
          result ? refreshAction(self.action) : false;
        });
    };

    self.saveAction = function () {
      var ruleToSend = replaceSpecialCharInCode(self.action);
      updateOrPostNew(ruleToSend, self.action.__metadata)
        .then(getRules)
        .then(function () {
          self.newRuleForm.$setPristine();
          NotificationService.add('success', 'The action was saved');
        })
    };

    function updateOrPostNew(action, isUpdate) {
      if (isUpdate)
        return updateRule(action);
      else
        return postNewRule(action);
    }

    self.deleteAction = function () {
      ConfirmationPopup.confirm('Are sure you want to delete this rule?')
        .then(function(result){
          if(result){
            RulesService.remove(self.action)
              .then(getRules)
              .then(refreshAction);
          }
        });
    };

    self.allowTestForm = function () {
      var allow = self.action &&
        self.action.__metadata &&
        self.action.dataAction === 'OnDemand';
      return allow;
    };

    self.toggleTestForm = function () {
      self.requestTestForm = !self.requestTestForm;
    };

    self.showTestForm = function () {
      return (self.requestTestForm && self.allowTestForm());
    };

    self.allowTest = function() {
      var allow = self.newRuleForm && !self.newRuleForm.$dirty;
      return allow;
    };

    $scope.ace = {
      dbType: 'sql',
      editors: {},
      onLoad: function(_editor) {
        $scope.ace.editors[_editor.container.id] = _editor;
      }
    };

    $scope.modal = {
      title: 'Action',
      namePattern: /^\w+[\w ].*$/,
      dataActions: [
        {value: 'OnDemand', label: 'On demand - Execute from REST API', level1: 0, level2: 0},
        {value: 'BeforeCreate', label: 'Create - Before adding data', level1: 1, level2: 0},
        {value: 'AfterCreateBeforeCommit', label: 'Create - During data saved before it committed', level1: 1, level2: 1},
        {value: 'AfterCreate', label: 'Create - After data saved and committed', level1: 1, level2: 2},
        {value: 'BeforeEdit', label: 'Update - Before update data', level1: 2, level2: 0},
        {value: 'AfterEditBeforeCommit', label: 'Update - During data saved before it committed', level1: 2, level2: 1},
        {value: 'AfterEdit', label: 'Update - After data saved and committed', level1: 2, level2: 2},
        {value: 'BeforeDelete', label: 'Delete - Before delete', level1: 3, level2: 0},
        {value: 'AfterDeleteBeforeCommit',label: 'Delete - During record deleted but before it committed',level1: 3,level2: 1},
        {value: 'AfterDelete', label: 'Delete - After record deleted and committed', level1: 3, level2: 2},
      ],
      workflowActions: [
        {value: 'JavaScript', label: 'Server side JavaScript code'},
        {value: 'Notify', label: 'Send Email'},
        {value: 'Execute', label: 'Transactional database script'}
      ],
      dictionaryItems: {},
      insertAtChar: insertTokenAtChar,
      digest: digestIn,
      toggleGroup: toggleGroup,
      isCurGroup: isCurGroup,
      buildParameters: buildParametersDictionary
    };

    function isCurGroup(groupName) {
      return $scope.modal.curGroup == groupName;
    }

    function toggleGroup(groupName) {
      if ($scope.modal.isCurGroup(groupName)) {
        $scope.modal.curGroup = null;
      }
      else {
        $scope.modal.curGroup = groupName;
      }
    }

    /**
     * broadcast insert event from the parent scope
     * element id used by jquery to locate the element
     * @param elementId
     * @param token
     */
    function insertTokenAtChar(elementId, token) {
      // Handle case of ace editor:
      var aceEditor = $scope.ace.editors[elementId];
      if (aceEditor) {
        setTimeout(function() { // DO NOT USE $timeout - all changes to ui-ace must be done outside digest loop, see onChange method in ui-ace
          aceEditor.insert("{{" + token + "}}");
        })
      }
    // Handle regular text field using place-at-char directive:
      else {
        $scope.$parent.$broadcast('insert:placeAtCaret', [elementId, "{{" + token + "}}"]);
      }
    }

    function digestIn(){
      angular.element()
    }

    /**
     * success handle for getting dictionary items
     * @param data
     */
    function populateDictionaryItems(data) {
      var raw = data.data;
      var keys = Object.keys(raw);
      $scope.modal.dictionaryItems = {
        headings: {
          tokens: keys[0],
          props: keys[1],
          parameters: 'Parameters'
        },
        data: {
          tokens: raw[keys[0]],
          props: raw[keys[1]],
          parameters: []
        }
      };
    }

    function buildParametersDictionary() {
      var keys = [];
      if(self.action.inputParameters){
        angular.forEach(self.action.inputParameters.replace(/ /g, '').split(','), function (param){
          keys.push({token: param, label: param})
        })
      }
      $scope.modal.dictionaryItems.data.parameters =  keys;
    }

    /**
     * launch modal
     */


    /**
     * return the rule object by
     * the provided name     *
     * @param rulname
     * @returns {*|XMLList|XML}
     */
    function getRuleByName(rulename) {
      return angular.copy($filter('filter')(self.ruleList, function (f) {
        return f.name === rulename;
      })[0])
    }

    $scope.modal.handleTabKey = function(e){
      // get caret position/selection
      if(e.keyCode === 9) { // tab was pressed
        var start = e.currentTarget.selectionStart;
        var end = e.currentTarget.selectionEnd;

        var target = e.target;
        var value = target.value;

        // set textarea value to: text before caret + tab + text after caret
        target.value = value.substring(0, start)
        + "\t"
        + value.substring(end);

        // put caret at right position again (add one for the tab)
        e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 1;

        // prevent the focus lose
        e.preventDefault();
      }

    };

    /**
     * extend the default rule object and
     * delegate to rulesService post method
     *
     * @param rule
     */
    function postNewRule(rule) {
      var data = angular.extend(defaultRule, rule);
      return RulesService.post(data)
        .then(function (response) {
          self.action = response.data;
        });
    }

    /**
     * delegate to the update method on
     * rules service
     *
     * @param rule
     */
    function updateRule(rule) {
      return RulesService.update(rule);
    }

    function replaceSpecialCharInCode(rule){
      var ruleToSend = angular.copy(rule);
      ruleToSend.code = ruleToSend.code.replace(/\+/g, "%2B");
      return ruleToSend;
    }

    self.getInputParameters = function () {
      var inputParameters = [];
      if (self.action && self.action.inputParameters)
        inputParameters = self.action.inputParameters.replace(/ /g, '').split(',');
      return inputParameters;
    };

    self.testData = function () {
      usSpinnerService.spin('testing-action');
      RulesService.testRule(self.action, self.test)
        .then(getLog, errorHandler);
    };

    $scope.$watch('test.rowId', function(newVal, oldVal) {
        if(newVal === 0)
          self.test.rowId = '';
      });

    function getLog(response) {
      self.test.result = response.data;
      var guid = response.headers('Action-Guid');
      self.testUrl = RulesService.getTestUrl(self.action, self.test);
      AppLogService.getActionLog(AppState.get(), guid)
        .then(showLog, errorHandler);
    }

    function showLog(response) {
      self.test.logMessages = [];
      response.data.data.forEach(function (log) {
        self.test.logMessages.push({text: log.FreeText, isError: log.LogType === '501', time: log.Time});
        usSpinnerService.stop('testing-action');
      });
    }


    /**
     * reset the current active rule on scope
     */

    function loadDbType() {
      appName = AppState.get();
      AppsService.getCurrentApp(appName)
        .then(function(app) {
          $scope.ace.dbType = (app.databaseName == 'mysql' && 'mysql' || 'pgsql');
        });
    }

    /**
     * ajax call to get the rules list
     */
    function getRules() {
      DictionaryService.get().then(populateDictionaryItems);
      RulesService.get().then(buildTree, errorHandler);
    }

    self.treeSign = function (item) {
      return item.items.length === 0 ? '' : ( item.visible ? '-' : '+' );
    };

    /**
     * parse the raw data object to a tree
     * and bind it to self
     *
     * @param data
     */
    function buildTree(data) {
      self.ruleList = data.data.data;
      self.items = [
        {
          title: 'On Demand',
          visible: true,
          items: [
            {
              visible: false,
              title: 'Execute',
              description: 'These actions fire based on a direct call to the REST API',
              dataAction: 'OnDemand',
              items: []
            }]
        },
        {
          title: 'Create',
          visible: true,
          items: [
            {
              visible: false,
              title: 'Before',
              dataAction: 'BeforeCreate',
              description: 'These actions execute before an object is created in the database',
              items: []
            },
            {
              visible: false,
              title: 'During',
              dataAction: 'AfterCreateBeforeCommit',
              description: 'These actions execute while the object is being created, occurring during the same transaction context',
              items: []
            },
            {
              visible: false,
              title: 'After',
              dataAction: 'AfterCreate',
              description: 'These actions fire after a new record has been added to the database',
              items: []
            }]
        },
        {
          title: 'Update',
          visible: true,
          items: [
            {
              visible: false,
              title: 'Before',
              dataAction: 'BeforeEdit',
              description: 'These actions execute before an object is updated in the database',
              items: []
            },
            {
              visible: false,
              title: 'During',
              dataAction: 'AfterEditBeforeCommit',
              description: 'These actions execute while the object is being updated, occurring during the same transaction context',
              items: []
            },
            {
              visible: false,
              title: 'After',
              dataAction: 'AfterEdit',
              description: 'These actions fire after a record has been modified in the database',
              items: []
            }]
        },
        {
          title: 'Delete',
          visible: true,
          items: [
            {
              visible: false,
              title: 'Before',
              dataAction: 'BeforeDelete',
              description: 'These actions execute before an object is deleted from the database',
              items: []
            },
            {
              visible: false,
              title: 'During',
              dataAction: 'AfterDeleteBeforeCommit',
              description: 'These actions execute while the object is being deleted, occurring during the same transaction context',
              items: []
            },
            {
              visible: false,
              title: 'After',
              dataAction: 'AfterDelete',
              description: 'These actions fire after a new record has been deleted from the database',
              items: []
            }]
        }];

      //build the tree
      angular.forEach(self.ruleList, function (value, key) {
        var obj = {name: value.name};
        var da = $filter('filter')($scope.modal.dataActions, function (f) {
          return f.value === value.dataAction;
        })[0];
        if (da) {
          self.items[da.level1].items[da.level2].visible = true;
          self.items[da.level1].items[da.level2].items.push(obj);
        }
      });

    }


    self.codeRegex = /^\s*function\s+backandCallback\s*\(\s*userInput\s*,\s*dbRow,\s*parameters\s*,\s*userProfile\s*\)\s*\{(.|[\r\n])*}\s*$/;

    var backandCallbackConstCode = {
      start: '/* globals\n\  $http: http service for AJAX calls\n\*/\n' +
      '\'use strict\';\n' +
      'function backandCallback(userInput, dbRow, parameters, userProfile) {',
      end:   '}'
    };

  /**
     * delegate errors to the notification service
     * @param error
     * @param message
     */
    function errorHandler(error, message) {
      NotificationService.add('error', message);
    }

  }

}());
