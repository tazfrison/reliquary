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

	.controller("RelicCtrl", ["$scope", "DataService", "$q", function($scope, DataService, $q){
		$scope.completion = () => ({
			ducats: [0, 0, 0, 0],
			newPart: [0, 0, 0, 0],
			length: "0%"});
		
		let chances = [
			[.253, .11, .02],
			[.233, .13, .04],
			[.200, .17, .06],
			[.167, .20, .10]
		];
		
		DataService.service.then(service => {
			$scope.completion = () => {
				let owned = 0;
				let required = 0;
				let ducats = [0, 0, 0, 0];
				let getNew = [0, 0, 0, 0];
				$scope.relic.rewards.forEach(reward => {
					let part = service.getPart(reward.partId);
					required += part.required;
					owned += Math.min(part.owned + part.blueprints, part.required);
					if(part.owned + part.blueprints >= part.required)
					{
						for(let i = 0; i < 4; ++i){
							ducats[i] += part.ducats * chances[i][reward.rarity];
						}
					}
					else{
						for(let i = 0; i < 4; ++i){
							getNew[i] += chances[i][reward.rarity] * 100;
						}
					}
				});
				
				return {
					ducats: ducats,
					newPart: getNew,
					length: (100 * owned / required) + "%"
				}
			};
		});
	}])
	
	.controller("RewardCtrl", ["$scope", "DataService", function($scope, DataService){
		$scope.part = null;
		DataService.service.then(service =>{
			$scope.part = service.getPart($scope.reward.partId);
		});
		$scope.length = function(part){
			if(!part)
				return "0%";
			let percent = 100 * Math.min(1, (part.owned + part.blueprints) / part.required) + "%";
			return percent;
		};
	}])