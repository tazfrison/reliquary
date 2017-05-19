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
				name: "",
				completion: null,
				mastered: null
			};
			
			$scope.sorts = {
				name: true,
				completion: null,
				ducats: null
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
			});
			
			$scope.length = function(part){
				if(!part)
					return "0%";
				let percent = 100 * Math.min(1, (part.used + part.built + part.blueprints) / part.required) + "%";
				return percent;
			};
		}],
		templateUrl: "templates/inventory.template.html"
	})
	
	.controller("InventoryCtrl", ["$scope", "DataService", function($scope, DataService){
		$scope.adjust = angular.noop;
		
		DataService.service.then(service =>{
			let inv = service.getInventory();
			$scope.adjust = (inc, bp) => {
				inv.setPartCount($scope.part._id, inc ? 1 : -1, bp);
			}
		});
	}])
	
	.filter("partsfilter", function() {
		return function(input, filters, sorts) {
			return input.filter(i => {
				if(i.required == 0)
					return false;
				if(filters.name !== "" && -1 == i.name.toLowerCase().indexOf(filters.name.toLowerCase()))
					return false;
				if(filters.completion !== null){
					let completion = (i.used + i.built + i.blueprints) / (i.required);
					if(filters.completion === "") {
						completion = i.used + i.built;
						if(i.hasBlueprint && i.requirements.length > 0 && completion > i.required)
							completion = i.required;
						completion += i.blueprints
						if(completion <= i.required)
							return false;
					}
					else if(filters.completion === true && completion < 1)
						return false;
					else if(filters.completion === false && completion >= 1)
						return false;
				}
				if(filters.vaulted !== null) {
					let vaulted = !i.relics.some(r => !r.relic.vaulted);
					if(filters.vaulted !== vaulted)
						return false;
				}
				return true;
			}).sort((a, b) =>{
				if(sorts.ducats !== null){
					if(a.ducats !== b.ducats)
					{
						return sorts.ducats ?
							b.ducats - a.ducats :
							a.ducats - b.ducats;
					}
				}
				if(sorts.completion !== null){
					let _a = Math.min(1, (a.used + a.built + a.blueprints) / a.required),
						_b = Math.min(1, (b.used + b.built + b.blueprints) / b.required)
					if(_a !== _b)
					{
						return sorts.completion ?
							_b - _a :
							_a - _b;
					}
				}
				return sorts.name ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
			});
		}
	})