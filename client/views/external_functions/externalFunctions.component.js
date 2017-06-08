/**
 * @ngdoc directive
 * @name backand.externalFunctions.directive.externalFunctions
 * @module backand.externalFunctions
 *
 * @description
 * a main Component
 *
  * @author Mohan Singh ( gmail::mslogicmaster@gmail.com, skype :: mohan.singh42 )
 */
(function () {
  'use strict';
  angular
    .module('backand.externalFunctions')
    .directive('externalFunctions', [function () {
      return {
        restrict: 'E',
        scope: true,
        templateUrl: 'views/external_functions/externalFunctions.html',
        controllerAs: '$ctrl',
        bindToController: true,
        controller: [
          '$log',
          'usSpinnerService',
          'CloudService',
          '$modal',
          '$state',
          'modalService',
          'NotificationService',
          '$rootScope',
          'APP_CONSTS',
          'AppsService',
          'AnalyticsService',
          function ($log, usSpinnerService, CloudService, $modal, $state, modalService, NotificationService, $rootScope, APP_CONSTS, AppsService, AnalyticsService) {
            $log.info('Component externalFunctions has initialized');
            var $ctrl = this;
            /**
            * call initialization to initialize controllers properties 
            */
            initialization();

            /**
             *
             * public methods
             */
            $ctrl.onSaveConnection = onSaveConnection;
            $ctrl.updateFunction = updateFunction;
            $ctrl.onLoadConnection = onLoadConnection;
            /**
             * public properties
             */
            $ctrl.activeConnection = {};
            $ctrl.hasFunctions = false;
            /**
             * @name initialization
             * @description
             * function to initialize properties and call function at very first.
             */
            function initialization() {
              // options to <users> Component
              $ctrl.options = {
                view: 'launcher',
                source: $state.params.source,
                title: 'Registered Users'
              };
              $ctrl.appName = $state.params.appName;
              $ctrl.appConst = APP_CONSTS;
              //set first tab as activeTab
              $ctrl.activeTab = 0;
              //set collapsible panels
              $ctrl.sections = {
                guideline: false,
                awsConnection: true,
                lambdaFunctions: true
              };
              //opens modal for AWS credentials
              if (isNew()) {
                awsConnectionModal();
              } else {
                getLambdaFunctions();
              }
              setCurrentAppTokens();
              usSpinnerService.stop('loading');
            }

            /**
             * @name getLambdaFunctions
             * @description  function to get lambda function by app
             * 
             * @returns void
             */
            function getLambdaFunctions() {
              usSpinnerService.spin('loading');
              CloudService
                .getLambdaFunctions()
                .then(function (response) {
                  $log.info(response.data);
                  $ctrl.lambdaFunctions = response.data.data[0] ? response.data.data[0].functions : [];
                  //Expand collapsible if lambdaFunctions > 0
                  if (_.keys($ctrl.lambdaFunctions).length > 0) {
                    $ctrl.sections.lambdaFunctions = false;
                    $ctrl.hasFunctions = true;
                  }
                  $log.info('Lambda functions loaded', response);
                  usSpinnerService.stop('loading');
                }).catch(function (error) {
                  $ctrl.lambdaFunctions = {};
                  $ctrl.hasFunctions = false;
                  $log.error('Error while fetching Lambda functions', error);
                  usSpinnerService.stop('loading');
                });
            }
            /**
            * @name onSaveConnection
            * @description  function is called when AWS connection is saved/updated
            * Fetch new lambda functions 
            * 
            * @param {object} connection An object of connection details
            * @returns void
            */
            function onSaveConnection(connection) {
              $log.info('AWS connection is updated with -', connection);
              getLambdaFunctions();
            }

            /**
             * @name awsConnectionModal
             * @description opens modal/popup to configure AWS credentials
             * 
             * @returns void
             */
            function awsConnectionModal() {
              var stateParams = $state.params;
                  angular.extend(stateParams, {
                    new: undefined
                  });

              modalService
                .awsCredentials()
                .then(function (data) {
                  $log.info('connection with - ', data);
                  

                  $state.transitionTo($state.current.name, stateParams, {
                      reload: true
                    });
                }, function () {
                  $log.info('Cancelled AWS credentials to enter.');
                  modalService.demoApp().then(function () {
                  }, function () {
                    $state.transitionTo($state.current.name, stateParams, {
                        notify: false
                      });
                  });
                });
            }

            /**
             * @name isLauncher
             * @description check if current state has `new` param with valid value [1]
             * 
             * @returns boolean
             */
            function isNew() {
              var newApp = $state.params.new;
              return (typeof newApp !== 'undefined') && (newApp == 1);
            }

            /**
             * @name updateFunction
             * @description updates function with selected:true|false
             * Link/unkink function 
             * link - {
             *  selected : true
             * }
             * 
             * unlink - {
             *  selected : false
             * }
             * 
             * @param {string} func A function to be updated
             * @param {boolean} flag A flag true|false 
             * 
             * @returns void
             */
            function updateFunction(func, flag) {
              $log.info('Selected function - ', func, $ctrl.activeConnection);
              usSpinnerService.spin('loading');
              var requestBody = {
                name: func.FunctionName,
                cloudId: $ctrl.activeConnection.__metadata.id,
                select: flag,
                arn: func.FunctionArn
              };
              CloudService
                .updateFunction(requestBody)
                .then(function (response) {
                  func.selected = flag;
                  func.functionId = response.data[0]['functionId'];
                  $log.info('Lambda function is selected with -', response);
                  usSpinnerService.stop('loading');
                  NotificationService.add('success', 'Function is ' + (flag ? 'linked' : 'Unlinked') + ' successfully');

                  if(flag){
                    AnalyticsService.track('LambdaFunctionSelected',{function: func.FunctionName});
                  }
                  $rootScope.$broadcast('fetchTables');
                  getLambdaFunctions();
                }).catch(function (error) {
                  usSpinnerService.spin('loading');
                  $log.error('Error while updating function\'s status', error);
                });
            }

            /**
             * @name onLoadConnection
             * @description A handler which is called when connects are loaded from API
             * 
             * @see awsConnection
             * @file aws_connection.directive.js
             * 
             * @param {object} activeConnection 
             */
            function onLoadConnection(activeConnection) {
              angular.extend($ctrl.activeConnection, activeConnection);
              //Expand AWS connection panel if there is no active connection
              if(!$ctrl.activeConnection.Id){
                $ctrl.sections.awsConnection = false;
              }
            }


            function setCurrentAppTokens(){
              AppsService.appKeys($ctrl.appName).then(function(response){
                $ctrl.tokens = response.data;
                $log.info('Current App', response.data);

                if($ctrl.tokens.anonymous){
                  $ctrl.launcherAppUrl = $ctrl.appConst.LAUNCHER_APP_URL + '/#/' + $ctrl.appName + '/functions?t=' + $base64.encode($ctrl.tokens.anonymous);
                } else {
                  $ctrl.launcherAppUrl = $ctrl.appConst.LAUNCHER_APP_URL + '/#/' + $ctrl.appName + '/login';
                }

              },function(err){
                $log.error('Error while setting up current APP', err);
              });
            }

            //end of controller
          }]
      };
    }]);
})();
