var myApp = angular.module('control', ['ui.bootstrap']);
var host = "http://localhost:5000";

myApp.controller('TimeCtrl', function ($scope, $rootScope) {
    $rootScope.lastUpdate = null;
    
    $scope.lastUpdate = function(epoch) {
        if ($rootScope.lastUpdate) {
            return $rootScope.lastUpdate.toUTCString();
        }
    }

    $scope.leaking = function() {
        if ($rootScope.courseAleak) {
            return $rootScope.courseAleak.leaking;
        }
    }
});

/*myApp.controller('MapCtrl', function ($scope, $rootScope) {
    var mapOptions = {
        center: { lat: 36.8023, lng: -76.1916},
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        heading: 90,
        zoom: 19
    }
    $rootScope.map = new google.maps.Map(document.getElementById('map'), mapOptions);
    $rootScope.map.setTilt(0);
});*/

myApp.controller('Status', function ($scope, $http, $timeout, $rootScope) {
    $scope.markers = {};
    $scope.markers['courseA'] = [];
    $scope.markers['courseB'] = [];
    $scope.lastHeartbeat = {};
    
    //$http.defaults.headers.common['Authorization'] = 'Basic YWRtaW46YnVveWFuY3k=';
    $scope.uploadedImage = function(imageId) {
        return host.concat("/display/image/", imageId);
    }
    $scope.symbol = function(shape) {
        switch(shape) {
            case 'triangle':
                return '&#x25B2;';
            case 'cruciform':
                return "+";//"&#x271A;";
            case 'circle':
                return '&#x2B24;';
            default:
                return "";
        }
    }
    $scope.getStatuses = function(){
      $http.get(host + '/display').
          success(function(data) {
              $scope.status = data;
              $rootScope.lastUpdate = new Date();
              $scope.plotMarker(data);
      });
    };

    $scope.getLeaking = function(){
      $http.get('http://192.168.1.7:7777/leaking').
          success(function(data) {
              $rootScope.courseAleak = data;
      });
    };

    
    /*$scope.plotMarker = function(data) {
        var array = [];
        array[0] = data.courseA;
        array[1] = data.courseB;
        var icons = {};
        icons["courseA"] = 'image/red_MarkerA.png';
        icons["courseB"] = "image/blue_MarkerB.png";
        
        array.forEach(function (course){ 
          if (!course.teamCode) {
            var old = $scope.markers[course.course].shift();
            if (old) {
              old.setMap(null);
            }
          }
          if (course.currentPosition && $scope.lastHeartbeat[course.course] != course.lastHeartbeat) {
            if ($scope.markers[course.course].length >= 50) {
                var old = $scope.markers[course.course].shift();
                old.setMap(null);
            }
            
            var myLatlng = new google.maps.LatLng(course.currentPosition.latitude, course.currentPosition.longitude);
            var marker = new google.maps.Marker({
                position: myLatlng,
                icon: icons[course.course],
                animation: google.maps.Animation.DROP
            });
            $scope.markers[course.course].push(marker);
            marker.setMap($rootScope.map);
            $scope.lastHeartbeat[course.course] = course.lastHeartbeat;
        }
        });
        
    }*/
    
    $scope.epochToDate = function(epoch) {
        if (epoch) {
            var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
            d.setUTCSeconds(epoch);
            return d.toUTCString();
        }
    }
    
    // Function to replicate setInterval using $timeout service.
    $scope.intervalFunction = function(callback){
      $timeout(function() {
        callback();
        $scope.intervalFunction(callback);
      }, 1000)
    };
    
    $scope.intervalFunction = function(callback, arg){
      $timeout(function() {
        callback(arg);
        $scope.intervalFunction(callback, arg);
      }, 1000)
    };
    
    $scope.getById = function (arr, id) {
        for (var d = 0, len = arr.length; d < len; d += 1) {
            if (arr[d].id === id) {
                return arr[d];
            }
        }
    }
  
    // Kick off the interval
    $scope.getStatuses();
    $scope.intervalFunction($scope.getStatuses);

    $scope.getLeaking();
    $scope.intervalFunction($scope.getLeaking);

});

myApp.controller('Teams', function ($scope, $http, $timeout) {
    $scope.getTeams = function(){
      $http.get(host + '/teams').
          success(function(data) {
              $scope.teams = data;
      });
    };
    
    $scope.getTeamInWater = function (course){
      $http.get(host + '/'+course.id+'/team').
          success(function(data) {
              var result = $scope.getById($scope.courses, course.id)
              result.teamInWater = eval("data."+course.id);
      });
    };
    
        
    $scope.getEvents = function (course){
      $http.get(host + '/events/'+course.id).
          success(function(data) {
              course.events = data;
              course.events.forEach(function(run) {
                  run.start = new Date(run.start).toLocaleTimeString();
                  run.events.forEach(function(entry) {
                      entry.time = new Date(entry.time).toLocaleTimeString();
                  });
              });
      });
    };
    
    $scope.newTeamInWater = function (course, team) {
        $http.put(host + '/'+course.id+'/'+team).
            success(function(data) {
                $scope.getTeamInWater(course);
            }
        );
    };
    
    $scope.hideDebug = function (course) {
        course.hideDebug = !course.hideDebug;
        if (course.hideDebug) {
            course.showText = 'Show';
        } else {
            course.showText = 'Hide';
        }
    };
    
    $scope.newRun = function (course, team) {
        course.newRunButtonClass = 'btn-warning';
        $http.post(host + '/newRun/'+course.id+'/'+team).
            success(function(data) {
                course.runSetup = data;
                course.newRunButtonClass = 'btn-primary';
            }
        );
    };
    
    $scope.endRun = function (course, team) {
        course.endRunButtonClass = 'btn-warning';
        $http.post(host + '/endRun/'+course.id+'/'+team).
            success(function(data) {
                course.endRunButtonClass = 'btn-primary';
            }
        );
    };
    
    // Function to replicate setInterval using $timeout service.
    $scope.intervalFunction = function(callback){
      $timeout(function() {
        callback();
        $scope.intervalFunction(callback);
      }, 30000)
    };
    
    $scope.intervalFunction = function(callback, arg){
      $timeout(function() {
        callback(arg);
        $scope.intervalFunction(callback, arg);
      }, 5000)
    };
    
    $scope.getById = function (arr, id) {
        for (var d = 0, len = arr.length; d < len; d += 1) {
            if (arr[d].id === id) {
                return arr[d];
            }
        }
    }
  
  
    // Kick off the interval
    $scope.getTeams();
    $scope.intervalFunction($scope.getTeams);
    $scope.courses =
                [{name:'Course B', id:'courseB', teamInWater: '', runSetup: '', events: [], expandedEvents: {}, hideDebug: true, showText: 'Show', newRunButtonClass: 'btn-primary', endRunButtonClass: 'btn-primary'},
                 {name:'Course A', id:'courseA', teamInWater: '', runSetup: '', events: [], expandedEvents: {}, hideDebug: true, showText: 'Show', newRunButtonClass: 'btn-primary', endRunButtonClass: 'btn-primary'}]
    $scope.courses.forEach(function(entry) {
        $scope.intervalFunction($scope.getTeamInWater, entry);
        $scope.intervalFunction($scope.getEvents, entry);
    });    
});

/*
myApp.controller('LoginCtrl', function ($scope, $location, auth, $log) {
    $scope.$log = $log;

    $scope.go = function (target) {
        $location.path(target);
    };

    $scope.login = function () {
        auth.signin({ popup: true, scope: 'openid name email' })
            .then(function () {
                $log.log('Logged successfully!');
                $location.path('/');
            }, function (err) {
                $log.log('Logged failed!');
                // Oops something went wrong
                window.alert('Oops, invalid credentials');
                $location.path('/login');
            });
    };
    $scope.logout = function () {
        auth.signout();
        $location.path('/login');
    };
});

myApp.controller('RootCtrl', function ($scope, $location, $http, auth) {
    if (!auth.isAuthenticated) {
        // Reject the user
        $location.path('/login');
        return;
    }

    // User is logged in at this point

    $scope.user = auth.profile;
});


myApp.controller('LogoutCtrl', function ($scope, $location, auth, $log) {
    auth.signout();
    $log.log('Logged out!');
    $location.path('/login');
});
*/
