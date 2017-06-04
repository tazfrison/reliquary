angular.module('inventory', ["data", 'ngMaterial'])
	.component('inventory', {
		require: {root: "^main"},
		controller: ["$scope", "DataService", "$location", function($scope, DataService, $location) {
			$scope.parts = [];
				
			$scope.eras = ["Lith", "Meso", "Neo", "Axi"];
			
			$scope.filters = {
				vaulted: null,
				name: "",
				completion: null,
				era: null
			};
			
			this.$onInit = () => this.root.selectPart = part => {
				$location.hash(part._id);
			}
			
			$scope.filterOptions = [
				{
					title: "Vaulted",
					filter: "vaulted",
					options: [
						{value: null, title: "Unfiltered"},
						{value: true, title: "Yes"},
						{value: false, title: "No"}
					]
				},
				{
					title: "Completion",
					filter: "completion",
					options: [
						{value: null, title: "Unfiltered"},
						{value: '', title: "Extra"},
						{value: true, title: "Yes"},
						{value: false, title: "No"}
					]
				},
				{
					title: "Era",
					filter: "era",
					options: [{value: null, title: "Unfiltered"}].concat($scope.eras.map((era, i) => ({value: i, title: era})))
				}
			];
			
			$scope.addFilter = (name, value) => {
				$scope.filters[name] = value;
			}
			
			$scope.sorts = {
				name: true,
				completion: null,
				ducats: null
			}
			
			$scope.toggle = sort => {
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

			DataService.service.then(service => {
				$scope.parts = service.getParts();
				let inv = service.getInventory();
			});
			
			$scope.length = function(part) {
				if(!part)
					return "0%";
				let percent = 100 * Math.min(1, (part.used + part.built + part.blueprints) / part.required) + "%";
				return percent;
			};
		}],
		templateUrl: "templates/inventory.template.html"
	})
	
	.controller("InventoryCtrl", ["$scope", "DataService", function($scope, DataService) {
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
				if(filters.completion !== null) {
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
				if(filters.era !== null) {
					if(!i.relics.some(relic => {
						return relic.relic.era === filters.era;
					}))
						return false;
				}
				
				return true;
			}).sort((a, b) => {
				if(sorts.ducats !== null) {
					if(a.ducats !== b.ducats)
					{
						return sorts.ducats ?
							b.ducats - a.ducats :
							a.ducats - b.ducats;
					}
				}
				if(sorts.completion !== null) {
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