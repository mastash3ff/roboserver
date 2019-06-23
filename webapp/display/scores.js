function Test($scope){
    $scope.data = {message:"Hello"}
}

function dropdownSelected() {
  $('.dropdown-toggle').dropdown();
  $('#divNewNotifications li').on('click', function() {
    $('#dropdown_title').html($(this).find('a').html());
  });
}