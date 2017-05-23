angular.module("primes", ["data"])
	.component('primes', {
		controller: ["$scope", "DataService", function($scope, DataService) {
			$scope.primes = [];
			$scope.mastered = angular.noop;
			
			$scope.types = [{
					title: "Warframe",
					value: "warframe"
				}, {
					title: "Primary",
					value: "primary"
				}, {
					title: "Secondary",
					value: "secondary"
				}, {
					title: "Melee",
					value: "melee"
				}, {
					title: "Other",
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
						{value: true, title: "Yes"},
						{value: false, title: "No"}
					]
				},
				{
					title: "Mastered",
					filter: "mastered",
					options: [
						{value: null, title: "Unfiltered"},
						{value: true, title: "Yes"},
						{value: false, title: "No"}
					]
				},
				{
					title: "Type",
					filter: "type",
					options: [{value: null, title: "Unfiltered"}].concat($scope.types)
				}
			];
			
			$scope.addFilter = (name, value) => {
				$scope.filters[name] = value;
			}
			
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
				$scope.primes = service.getPrimes();
				let inv = service.getInventory();
				$scope.mastered = inv.setMastery.bind(inv);
			});
			
			$scope.selected = {};

			$scope.select = function(id) {
				$scope.selected[id] = !$scope.selected[id];
			}
		}],
		templateUrl: "templates/primes.template.html"
	})
	
	.filter("primesfilter", function(){
		return function(input, filters, sorts){
			return input.filter(i => {
				if(filters.completion !== null){
					if(filters.completion
						? (i.requirements.root.owned < i.requirements.root.required)
						: (i.requirements.root.owned >= i.requirements.root.required)){
						return false;
					}
				}
				if(filters.mastered !== null && i.mastered !== filters.mastered)
					return false;
				if(filters.vaulted !== null && i.vaulted !== filters.vaulted)
					return false;
				if(filters.type !== null && i.type !== filters.type)
					return false;
				if(filters.name !== "" && -1 == i.name.toLowerCase().indexOf(filters.name.toLowerCase()))
					return false;
				return true;
			}).sort((a, b) =>{
				if(sorts.completion !== null){
					let _a = Math.min(1, a.requirements.root.owned / a.requirements.root.required),
						_b = Math.min(1, b.requirements.root.owned / b.requirements.root.required)
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
	
	.controller("PrimeCtrl", ["$scope", "DataService", function($scope, DataService){
		$scope.part = {};
		$scope.adjust = angular.noop;
		
		DataService.service.then(service =>{
			$scope.part = service.getPart($scope.prime.rootId);
			let inv = service.getInventory();
			$scope.adjust = (inc, bp) => {
				inv.setPartCount($scope.part._id, inc ? 1 : -1, bp);
			}
			$scope.mastered = inv.setMastery.bind(inv);
		});
	}])
	
	.controller("PartCtrl", ["$scope", "DataService", function($scope, DataService){
		$scope.part = {};
		$scope.adjust = angular.noop;
		
		DataService.service.then(service =>{
			$scope.part = service.getPart($scope.partId);
			let inv = service.getInventory();
			
			$scope.adjust = (inc, bp) => {
				inv.setPartCount($scope.part._id, inc ? 1 : -1, bp);
			}
			
			$scope.width = (prime, part) => {
				let temp = prime.requirements[part._id];
				return Math.min(1, temp.owned / temp.required) * 100 + "%";
			};
		});
	}])