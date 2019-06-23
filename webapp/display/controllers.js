var myApp = angular.module('control', ['ui.bootstrap']);
//var host = "http://localhost:5000";
var courseAhost = "http://192.168.1.10:5000";
var courseAhost = "http://localhost:5000";
var courseBhost = "http://localhost:5000";
//var courseChost = "http://localhost:5000";
//var courseBhost = "http://192.168.1.20:5000";
//var courseChost = "http://192.168.1.30:5000";

myApp.controller('TimeCtrl', function ($scope, $rootScope) {
    $rootScope.lastUpdate = null;
    
    $scope.lastUpdate = function(epoch) {
        if ($rootScope.lastUpdate) {
            return $rootScope.lastUpdate.toUTCString();
        }
    }
});


myApp.controller('Status', function ($scope, $http, $timeout, $rootScope) {
    $scope.markers = [];
    
    $http.defaults.headers.common['Authorization'] = 'Basic YWRtaW46YnVveWFuY3k=';
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

      $http.get(courseAhost + '/status').
          success(function(data) {
              $scope.status = data;
              $rootScope.lastUpdate = new Date();
              $scope.isAlphaOnline = true;
      }).error(function(){
          $scope.isAlphaOnline = false;
          console.log("Alpha not online")
      });
            $http.get(courseBhost + '/status').
          success(function(data) {
              $scope.status = data;
              $rootScope.lastUpdate = new Date();
      }).error(function(){
          $scope.isBravoOnline = false;
          console.log("Bravo not online")
      });
            $http.get(courseChost + '/status').
          success(function(data) {
              $scope.status = data;
              $rootScope.lastUpdate = new Date();
      }).error(function(){
          $scope.isCharlieOnline = false;
          console.log("Charlie not online")
      });
    };

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
                 {name:'Course A', id:'courseA', teamInWater: '', runSetup: '', events: [], expandedEvents: {}, hideDebug: true, showText: 'Show', newRunButtonClass: 'btn-primary', endRunButtonClass: 'btn-primary'},
                    {name:'Course C', id:'courseC', teamInWater: '', runSetup: '', events: [], expandedEvents: {}, hideDebug: true, showText: 'Show', newRunButtonClass: 'btn-primary', endRunButtonClass: 'btn-primary'}]
    $scope.courses.forEach(function(entry) {
        $scope.intervalFunction($scope.getTeamInWater, entry);
        $scope.intervalFunction($scope.getEvents, entry);
    });    
});
