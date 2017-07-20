angular.module('reliquary', ['relics', 'primes', 'data', 'rewards', 'inventory', 'ngMaterial'])
	.config($mdThemingProvider => {
		$mdThemingProvider.theme("default")
			.primaryPalette("teal")
			.accentPalette("light-blue")
//			.backgroundPalette("blue-grey")
			.dark();
	})
	.component("main", {
		templateUrl: "templates/main.template.html",
		controller: ["$scope", "$window", "DataService", function($scope, $window, DataService){
				$scope.currentNavItem = "rewards"
				$scope.selected = [true, false, false, false];
				$scope.select = function(index) {
					$scope.selected.fill(false);
					$scope.selected[index] = true;
				}
				
				$scope.login = null;
				
				$scope.loginAction = () => {
					if($scope.login === true)
						$window.location.href = "/logout";
					else if($scope.login === false)
						$window.location.href = "/login";
				}
				
				DataService.service.then(function(service){
					let user = service.getInventory();
					$scope.login = user.valid;
				});
				let ctrl = this;
				$scope.$on("transfer", (event, tab, data) => {
					$scope.currentNavItem = tab;
					switch(tab){
						case "rewards":
							$scope.select(0);
							break;
						case "relics":
							$scope.select(1);
							ctrl.selectRelic(data);
							break;
						case "primes":
							$scope.select(2);
							break;
						case "parts":
							$scope.select(3);
							ctrl.selectPart(data);
							break;
						default:
							return;
							break;
					}
				});
			}]
	})
	
	.directive("bkgImg", function(){
		return function($scope, element, attrs){
			let temp = () => {
				let icon = attrs["icon"],
					blueprint = attrs["blueprint"];
				if(icon){
					if(blueprint == "true"){
						element.css({
							"background-image": 'url(/images/' + icon + '.png), url(/images/blueprintw.png)'
						});
					}
					else{
						element.css({
							"background-image": 'url(/images/' + icon + '.png)'
						});
					}
				}
			}
			attrs.$observe("icon", temp);
			attrs.$observe("blueprint", temp);
		};
	})