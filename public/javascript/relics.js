angular.module('relics', ["data"])
	.component('relics', {
		controller: ["$scope", "DataService", function($scope, DataService) {
			$scope.era = 0;
			$scope.relics = [];
			$scope.eras = ["Lith", "Meso", "Neo", "Axi"];
			DataService.service.then(service => {
				$scope.relics = service.getRelics();
			});
			$scope.selected = false;

			$scope.select = function(index) {
				$scope.era = index;
				$scope.selected = false;
			}
			
			$scope.selectRelic = function(relic){
				$scope.selected = relic;
			}
			
			$scope.min = Math.min;
		}],
		templateUrl: "templates/relics.template.html"
	})
	
	.controller("RewardCtrl", ["$scope", "DataService", function($scope, DataService){
		$scope.part = null;
		DataService.service.then(service =>{
			$scope.part = service.getPart($scope.reward.partId);
		});
		$scope.length = function(part){
			if(!part)
				return "0%";
			let percent = 100 * Math.min(1, (part.used + part.built + part.blueprints) / part.required) + "%";
			return percent;
		};
	}])