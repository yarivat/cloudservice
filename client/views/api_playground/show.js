(function  () {
    'use strict';

    angular.module('app.playground')
        .controller('Playground',["$scope",'SessionService','$state',Playground]);

    function Playground($scope,SessionService,$state){
        var self = this;
        var token = SessionService.getToken();
        var appName = $state.params.name;

        window.addEventListener('message', function (e) {
            var eventName = e.data[0];
            var data = e.data[1];
            switch (eventName) {
                case 'setHeight':
                    $("#restIfrmae").height(data + 50);
                    break;
                case 'ready':
                    var o = document.getElementsByTagName('iframe')[0];
                    //var auth = token; //'bearer fSXRn_iaW2qa0u39naX8WUnHc5aIr83pw3ZtIhE1aPal6Aggj9u0KaCwrKot1WScmWZVCe0eaXdbuqhyZMg0n1qqToPxo6f6MD__KODCHXjdZnkWEguIyQUI6RJV6B54_4OONTCiSNFPBMT3bMRp-MW6QrzpPZleIDN2wTc-1ohbRHaIwSlIeBM8QH0d3XzTs04STdrIIBCtAtteK7yf9AJJ-fGdkbYViRv9tZEWC6JUz4i6zXfCzYSeoPwBiHwse5ynYc9RYx2vGdxZfxX5Cg';
                    //var appName = appName;

                    var message = { auth: 'bearer ' + token, appName: appName };
                    //var auth = SessionService.getAuthHeader();
                    o.contentWindow.postMessage(message, "*");
                    break;
            }
        }, false);
    }




}());
