angular.module('inventory', ["data"])
	.component('inventory', {
		controller: ["$scope", "DataService", function($scope, DataService) {
			$scope.parts = [];
			
			$scope.types = [{
					label: "Warframe",
					value: "warframe"
				}, {
					label: "Primary",
					value: "primary"
				}, {
					label: "Secondary",
					value: "secondary"
				}, {
					label: "Melee",
					value: "melee"
				}, {
					label: "Other",
					value: "other"
				}];
				
			$scope.eras = ["Lith", "Meso", "Neo", "Axi"];
			
			$scope.filters = {
				vaulted: null,
				type: null,
				name: null,
				completion: null,
				mastered: null
			};
			
			$scope.sorts = {
				name: true,
				completion: null
			}
			
			$scope.toggle = sort =>{
				if(sort == "name")
					$scope.sorts.name = !$scope.sorts.name;
				else{
					if($scope.sorts[sort] === true)
						$scope.sorts[sort] = false;
					else if($scope.sorts[sort] === false)
						$scope.sorts[sort] = null;
					else if($scope.sorts[sort] === null)
						$scope.sorts[sort] = true;
				}
			}

			DataService.service.then(service =>{
				$scope.parts = service.getParts();
				let inv = service.getInventory();
				$scope.mastered = inv.setMastery.bind(inv);
			});
		}],
		templateUrl: "templates/inventory.template.html"
	})