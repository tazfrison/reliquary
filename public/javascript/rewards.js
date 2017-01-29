angular.module('rewards', ["data", "relics"])
	.component('rewards', {
		controller: ["$scope", "DataService", function($scope, DataService) {
			$scope.eras = ["Lith", "Meso", "Neo", "Axi"];
			$scope.era = 0;

			$scope.relics = [];
			$scope.relic = null;

			$scope.parts = [];
			$scope.partId = null;
			$scope.selected = [];

			DataService.service.then(service => {
				$scope.relics = service.getRelics();
				$scope.parts = service.getParts();
			
				$scope.selectRelic = () => {
					$scope.relic.rewards.forEach(rew=>{
						let part = service.getPart(rew.partId);
						if(-1 == $scope.selected.indexOf(part))
							$scope.selected.push(part);
					});
					
					$scope.relic = null;
				}
			});
			
			$scope.selectPart = () => {
				if(-1 == $scope.selected.indexOf($scope.part))
					$scope.selected.push($scope.part);
				$scope.part = null;
			}
		}],
		templateUrl: "templates/rewards.template.html"
	})