(function () {

  angular.module('backand')
    .controller('SignUpController', ['AuthService', '$state', 'SessionService', '$timeout', SignUpController]);

  function SignUpController (AuthService, $state, SessionService, $timeout) {

    var self = this;

    (function init () {
      self.loading = false;

      //for automatic sign up
      if($state.params.i == 1) {
        self.fullName = $state.params.name;
        self.email = $state.params.username;
        self.password = Math.random().toString(36).substring(7);
        self.repassword = self.password;
        $timeout(function() {
          self.signUp();
        }, 100);
      }
    }());

    self.signUp = function () {
      self.loading = true;
      AuthService.signUp(self.fullName, self.email, self.password)
        .then(function (response) {
            var requestedState = SessionService.getRequestedState();
            $state.go(requestedState.state || 'apps.index', requestedState.params);
        })
        .catch(function (data) {
          self.loading = false;
          self.error = data.error_description;
          $timeout(function () {
            self.error = undefined;
          }, 3000);
        })
    };
  }

}());














