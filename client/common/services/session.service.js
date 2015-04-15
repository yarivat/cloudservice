(function() {
  'use strict';

  function SessionService($rootScope, $cookieStore, JacoRecorder) {
    var self = this;

    this.currentUser = $cookieStore.get('globals') ? $cookieStore.get('globals').currentUser : undefined;

    this.getAuthHeader = function() {
      if (!self.currentUser) {
        return false
      }
      return 'bearer ' + self.currentUser.access_token;
    };

    this.getToken = function() {
      if (!self.currentUser) {
        return false
      }
      return self.currentUser.access_token;
    };


    this.setCredentials = function (serverData, username) {
      var user = {
        currentUser: {
          access_token : serverData.access_token,
          username: username,
          userId: serverData.userId
        }
      };

      self.currentUser = user.currentUser;

      $cookieStore.put('globals', user);

      if(window.JacoRecorder)
        window.JacoRecorder.identify(user.currentUser.username);
      if (woopra)
        woopra.identify({ email: user.currentUser.username, id:user.currentUser.username });
      if (typeof __insp != 'undefined')
        __insp.push(['identify', user.currentUser.username]);
      if(window.Intercom)
        window.Intercom('boot', {
          app_id: "ufkkj816",
          name: user.currentUser.userId,
          email: user.currentUser.username,
          created_at: new Date().getTime()
        });
    };

    this.ClearCredentials = function () {
      $cookieStore.remove('globals');
      self.currentUser = undefined;
    };
  }

  angular.module('common.services', ['ngCookies'])
    .service('SessionService', ['$rootScope', '$cookieStore', SessionService])
})();
