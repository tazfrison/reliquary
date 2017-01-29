angular.module('login', [])
	.component("login", {
		templateUrl: "templates/login.template.html",
		controller: ["$scope", "$http", function($scope, $http){
			$scope.username = "";
			$scope.password = "";
			$scope.newusername = "";
			$scope.newpassword = "";
			$scope.login = () =>{
				if($scope.username == "" || $scope.password == ""){
					return;
				}
				$http.post("/login", {
					username: $scope.username,
					password: $scope.password
				}).then(res => {
					if(res.error)
						$scope.error = res.error;
					else
						window.location = "/";
				});
			}
			$scope.create = () =>{
				if($scope.newusername == "" || $scope.newpassword == ""){
					return;
				}
				$http.post("/login", {
					username: $scope.newusername,
					password: $scope.newpassword,
					create: true
				}).then(res => {
					if(res.error)
						$scope.error = res.error;
					else
						window.location = "/";
				});
			}
		}]
	})