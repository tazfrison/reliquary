angular.module('rewards', ["data", "relics"])
	.component('rewards', {
		controller: ["$scope", "DataService", function($scope, DataService) {
			$scope.eras = ["Lith", "Meso", "Neo", "Axi"];
			$scope.era = 0;

			$scope.relics = [];
			$scope.relic = null;

			$scope.parts = [];
			$scope.part = null;
			$scope.selected = [];

			DataService.service.then(service => {
				$scope.relics = service.getRelics();
				$scope.parts = service.getParts();
				
				let inv = service.getInventory();
			
				$scope.selectRelic = () => {
					$scope.relic.rewards.forEach(rew=>{
						let part = service.getPart(rew.partId);
						if(-1 == $scope.selected.findIndex(r => r.part == part))
							$scope.selected.push({
								rarity: rew.rarity,
								part: part
							});
					});
					
					$scope.relic = null;
				}
				
				$scope.get = function(part){
					inv.setPartCount(part._id, 1, part.hasBlueprint);
				}
			});
			
			$scope.selectPart = () => {
				if(-1 == $scope.selected.findIndex(r => r.part == $scope.part))
					$scope.selected.push({
						rarity: $scope.part.relics.find(r => r.relic.era === $scope.era).rarity,
						part: $scope.part
					});
				$scope.part = null;
			}
			$scope.length = function(part){
				if(!part)
					return "0%";
				let percent = 100 * Math.min(1, (part.used + part.built + part.blueprints) / part.required) + "%";
				return percent;
			};
		}],
		templateUrl: "templates/rewards.template.html"
	})
	
	.filter("rewardsfilter", function(){
		return function(input, era){
			return input
				.filter(i => i.relics.some(r => r.relic.era === era))
				.sort((a, b) => a.name.localeCompare(b.name));
		}
	})