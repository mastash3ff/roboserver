var myApp = angular.module('control', ['ui.bootstrap', 'ngRoute', 'ngCookies']);
//With Auth
//var myApp = angular.module('control', ['ui.bootstrap', 'ngRoute', 'ngCookies', 'auth0', 'authInterceptor']);

/*
myApp.run(function ($rootScope, $location, $route, AUTH_EVENTS, $timeout) {
    $rootScope.$on('$routeChangeError', function () {
        var otherwise = $route.routes && $route.routes.null && $route.routes.null.redirectTo;
        // Access denied to a route, redirect to otherwise
        $timeout(function () {
            $location.path(otherwise);
        });
    });
});


function isAuthenticated($q, auth) {
    var deferred = $q.defer();
    auth.loaded.then(function () {
        if (auth.isAuthenticated) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
    });
    return deferred.promise;
}

// Make it work with minifiers
isAuthenticated.$inject = ['$q', 'auth'];

myApp.config(function ($routeProvider, authProvider, $httpProvider) {
    $routeProvider
        //  Here where you are going to display some restricted content.
        .when('/',        { templateUrl: 'views/root.html',     controller: 'RootCtrl',    resolve: { isAuthenticated: isAuthenticated }})
        .when('/logout',  { templateUrl: 'views/logout.html',   controller: 'LogoutCtrl'  })
        .when('/login',   { templateUrl: 'views/login.html',    controller: 'LoginCtrl'   })
        .otherwise({ redirectTo: '/login' });

    // Set the URL to the popup.html file
    var href = document.location.href;
    var hash = document.location.hash;
    var popupUrl = href.substring(0, href.length - (hash.length + 1)) + '/popup.html';

    authProvider.init({ domain: 'roboboat.auth0.com', clientID: '6pnKXEC6OTihwk4ExZaqdtrAPxekdEDo', callbackURL: 'http://localhost:63342/website/index.html'});
    //authProvider.init({ domain: 'roboboat.auth0.com', clientID: '6pnKXEC6OTihwk4ExZaqdtrAPxekdEDo', callbackURL: 'http://felixpageau.com/roboboat/judging/main'});

    // Add a simple interceptor that will fetch all requests and add the jwt token to its authorization header.
    // NOTE: in case you are calling APIs which expect a token signed with a different secret, you might
    // want to check the delegation-token example
    $httpProvider.interceptors.push('authInterceptor');
});

myApp.run(function($rootScope, $location) {
    $rootScope.$on('$routeChangeSuccess', function () {
        if (true)
            $location.url("/login")
    })
});
*/

