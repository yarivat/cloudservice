/**
 * @ngdoc directive
 * @name backand.externalFunctions.directive.newProvider
 * @module backand.externalFunctions
 *
 * @description
 * manage AWS connection
 *
  * @author Mohan Singh ( gmail::mslogicmaster@gmail.com, skype :: mohan.singh42 )
 */
(function () {
  'use strict';
  angular
    .module('backand.externalFunctions')
    .directive('newProvider', ['SessionService', function (SessionService) {
      return {
        restrict: 'E',
        scope: {
          onSelectProvider: '&',
          modalInstance: '=?', //required if view is modal -in other words - required if this component is opened up in modal,
          options: '=?'
        },
        templateUrl: 'views/external_functions/providers/new/new-provider.html',
        controllerAs: '$ctrl',
        bindToController: true,
        controller: [
          '$log',
          'usSpinnerService',
          'CloudService',
          'NotificationService',
          '$q',
          'ConfirmationPopup',
          '$state',
          'AnalyticsService',
          '$rootScope',
          'ProviderService',
          '$stateParams',
          function ($log, usSpinnerService, CloudService, NotificationService, $q, ConfirmationPopup, $state, AnalyticsService, $rootScope, ProviderService, $stateParams) {
            $log.info('Component awsConnection has initialized');
            var $ctrl = this,
              regions,
              defaultSecretKeyHas = '************';

            /**
             *
             * public methods
             */
            $ctrl.saveProvider = saveProvider;
            $ctrl.loadRegion = loadRegion;
            $ctrl.deleteProvider = deleteProvider;
            $ctrl.selectProvider = selectProvider;
            $ctrl.selectAwsType = selectAwsType;
            /**
             * public properties
             */
            $ctrl.cloudProviderTypes = angular.copy(ProviderService.getProviders());
            $ctrl.crossAccount = {
              AccessKeyId: ''
            };

            /**
           * call initialization to initialize controllers properties 
           */
            initialization();

            /**
             * @name initialization
             * @description
             * function to initialize properties and call function at very first.
             */
            function initialization() {
              $ctrl.tokens = ProviderService.getTokens();
              regions = _.get($ctrl.options, 'regions') || [];
              $ctrl.isNew = $ctrl.options.isNew;

              var p = _.get($ctrl.options, 'provider');
              if (p && p.Id) {
                setProvider(p);
                var pType = _.find($ctrl.cloudProviderTypes, function (pt) {
                  return pt.name.toLowerCase() === p.CloudVendor.toLowerCase();
                });
                selectProvider(pType);
              } else if ($ctrl.isNew) {
                selectProvider($ctrl.cloudProviderTypes[0]);
              }
              $ctrl.modalInstance = $ctrl.modalInstance || {};
            }

            /**
             * @name loadRegion
             * @description gets aws regions
             * stores to $ctrl.regions
             * 
             * @returns void
             */
            function loadRegion() {
              var deferred = $q.defer();
              deferred.resolve(regions);
              return deferred.promise;
            }

            /**
             * @name setProvider
             * @description update provider model
             * store connection details in $ctrl.cloudProvider
             * 
             * @param {any} provider
             * @returns void
             */
            function setProvider(provider) {
              var dp = ProviderService.getModel(provider.CloudVendor.toLowerCase());
              var clp = angular.extend({}, dp, provider);
              if (!_.isEmpty(clp.AccessKeyId)) {
                clp.EncryptedSecretAccessKey = defaultSecretKeyHas;
              }
              if (clp.hasOwnProperty('password')) {
                clp.password = defaultSecretKeyHas;
              }
              $ctrl.cloudProvider = clp;
              if (provider.AccessKeyId && provider.CloudVendor === 'AWS') {
                $ctrl.awsType = isValidNumber(provider.AccessKeyId) ? 'CROSS_ACCOUNT_ACCESS' : 'ACCESS_KEY';
                if ($ctrl.awsType === 'CROSS_ACCOUNT_ACCESS') {
                  $ctrl.crossAccount.AccessKeyId = clp.AccessKeyId;
                }
              }
            }

            function isValidNumber(str) {
              var n = Math.floor(Number(str));
              return String(n) === str && n >= 0;
            }

            /**
             * @name saveProvider
             * @description  function to save connection details
             * validate credentials on client side before send to API
             * 
             * @returns void
             */
            function saveProvider() {
              usSpinnerService.spin('connectionView');
              $log.info('saveProvider is called with :', $ctrl.cloudProvider);
              var request = angular.copy($ctrl.cloudProvider);
              if (request.__metadata) {
                request.id = request.__metadata.id;
              }

              request = ProviderService.prepareRequest($ctrl.selectedProvider.name, request);
              if ($ctrl.selectedProvider.key === 'aws' && $ctrl.selectedProvider.awsType === 'CROSS_ACCOUNT_ACCESS' && !request.id) {
                request.EncryptedSecretAccessKey = 'bknd_' + $ctrl.tokens.general;
                request.AccessKeyId = $ctrl.crossAccount.AccessKeyId;
              }

              if (request.EncryptedSecretAccessKey === defaultSecretKeyHas) {
                delete request.EncryptedSecretAccessKey;
              }
              if (request.password === defaultSecretKeyHas) {
                delete request.password;
              }
              request.CloudVendor = $ctrl.selectedProvider.name;
              request.AwsRegion = _.map(request.AwsRegion, 'Code').join(',');
              $log.warn('Provider Request Payload - ', request);
              CloudService
                .saveProvider(request)
                .then(function (response) {
                  $log.info('Connection details are saved', response);
                  CloudService
                    .getLambdaFunctions()
                    .then(function (functions) {
                      NotificationService.add('success', 'Connection details are saved successfully.');
                      AnalyticsService.track('AWSConnectionSaved');
                      var metaDataId = _.get(response, 'data.__metadata.id');
                      if (!request.id) {
                        console.log('Is new Event ---', $ctrl.isNew);
                        if ($stateParams.new == 1 && metaDataId) {
                          $rootScope.$emit('EVENT:EXTERNAL_FUNCTION:SELECT_FUNCTIONS', {
                            functions: functions,
                            metaDataId: metaDataId
                          });
                        }
                      }
                      if (!metaDataId) {
                        console.log('No function is linked to provider.');
                      }
                      handler(response, request, $ctrl.cloudProvider, true);
                    }, function () {
                      NotificationService.add('error', 'Provided AWS credentials are not valid.');
                      handler({}, request, $ctrl.cloudProvider, false);
                    });

                })
                .catch(function (error) {
                  $log.error('Error while saving conncetions detail', error);
                  handler({}, request, $ctrl.cloudProvider);
                });
            }

            function handler(response, request, model, status) {
              $ctrl.isNewConnection = !request.id ? true : false;
              //get lambda functions when connection is saved
              if (typeof $ctrl.modalInstance.close === 'function' && !_.isEmpty(response)) {
                $ctrl.modalInstance.close({ connection: model });
              }
              $rootScope.$emit('EVENT:RELOAD_PROVIDER');
              usSpinnerService.stop('connectionView');
            }

            /**
             * @function
             * @name selectProvider
             * @description Select Cloud Provider type
             * @param {any} provider 
             */
            function selectProvider(provider, flag) {
              if (!provider.enable) {
                return;
              } else if (!$ctrl.isNew && flag) {
                return;
              }
              $ctrl.selectedProvider = angular.copy(provider);
              angular.extend($ctrl.selectedProvider, {
                awsType: $ctrl.awsType || 'CROSS_ACCOUNT_ACCESS'
              });
              if (typeof $ctrl.onSelectProvider === 'function') {
                $ctrl.onSelectProvider({
                  provider: $ctrl.selectedProvider
                });
              }
              if ($ctrl.isNew) {
                $ctrl.cloudProvider = angular.copy(ProviderService.getModel($ctrl.selectedProvider.name.toLowerCase()));
              }
            }
            /**
             * @description set AWS type [CROSS_ACCOUNT_ACCESS | ACCESS_KEY]
             * @param {any} awsType 
             * @returns 
             */
            function selectAwsType(awsType) {
              if (!$ctrl.isNew) {
                return;
              }
              setAwsType(awsType);
              $ctrl.onSelectProvider({
                provider: $ctrl.selectedProvider
              });
            }
            /**
             * @description update selectedProvider with AWS type [CROSS_ACCOUNT_ACCESS | ACCESS_KEY]
             * @param {any} awsType 
             */
            function setAwsType(awsType) {
              if ($ctrl.selectedProvider.key === 'aws') {
                angular.extend($ctrl.selectedProvider, { awsType: awsType || 'CROSS_ACCOUNT_ACCESS' });
              }
            }


            /**
             * @description An helper function, trigger event which is captured in providersList component
             * @param {any} provider 
             */
            function deleteProvider(provider) {
              $rootScope.$emit('EVENT:DELETE_PROVIDER', {
                provider: $ctrl.cloudProvider
              });
            }

            //end of controller
          }]
      };
    }]);
})();
