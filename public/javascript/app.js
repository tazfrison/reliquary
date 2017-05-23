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
		controller: ["$scope", "DataService", function($scope, DataService){
				$scope.currentNavItem = "rewards"
				$scope.selected = [true, false, false, false];
				$scope.select = function(index) {
					$scope.selected.fill(false);
					$scope.selected[index] = true;
				}
				
				$scope.login = null;
				
				DataService.service.then(function(service){
					let user = service.getInventory();
					$scope.login = user.valid;
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