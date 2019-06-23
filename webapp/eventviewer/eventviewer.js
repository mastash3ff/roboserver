var myApp = angular.module('control', ['ui.bootstrap']);
var host = "http://localhost:5000";

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
    
    padTime = function (time){
      if (time && time <= 9) {
        return '0' + time;
      }
      return time;
    };
    
        
    $scope.getEvents = function (course){
      $http.get(host + '/events/'+course.id).
          success(function(data) {
              function isNotHeartbeat(value) {
                  return value.message.indexOf("Heartbeat report") < 0;
              }
              
              course.events = data;
              course.events.forEach(function(run) {
                  run.start = "".concat(run.start[0], "/", run.start[1], "/", run.start[2], " ", run.start[3], ":", padTime(run.start[4]));
                  run.events = run.events.filter(isNotHeartbeat);
                  run.events.forEach(function(entry) {
                      entry.time = "".concat(entry.time[0], "/", entry.time[1], "/", entry.time[2], "-", entry.time[3], ":", entry.time[4]);
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
                [{name:'Course A', id:'courseA', teamInWater: '', runSetup: '', events: [], expandedEvents: {}, hideDebug: true, showText: 'Show', newRunButtonClass: 'btn-primary', endRunButtonClass: 'btn-primary'},
                 {name:'Course B', id:'courseB', teamInWater: '', runSetup: '', events: [], expandedEvents: {}, hideDebug: true, showText: 'Show', newRunButtonClass: 'btn-primary', endRunButtonClass: 'btn-primary'},
                 {name:'Course C', id:'courseB', teamInWater: '', runSetup: '', events: [], expandedEvents: {}, hideDebug: true, showText: 'Show', newRunButtonClass: 'btn-primary', endRunButtonClass: 'btn-primary'}]
    $scope.courses.forEach(function(entry) {
        $scope.intervalFunction($scope.getTeamInWater, entry);
        $scope.intervalFunction($scope.getEvents, entry);
    });    
});
