angular.module("primes", ["data"])
	.component('primes', {
		controller: ["$scope", "DataService", function($scope, DataService) {
			$scope.primes = [];
			$scope.mastered = angular.noop;
			
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
						? (i.completion.root.completion !== 1)
						: (i.completion.root.completion === 1)){
						return false;
					}
				}
				if(filters.mastered !== null && i.mastered !== filters.mastered)
					return false;
				if(filters.vaulted !== null && i.vaulted !== filters.vaulted)
					return false;
				if(filters.type !== null && i.type !== filters.type)
					return false;
				return true;
			}).sort((a, b) =>{
				if(sorts.completion !== null){
					if(a.completion.root.completion !== b.completion.root.completion)
					{
						return sorts.completion ?
							b.completion.root.completion - a.completion.root.completion :
							a.completion.root.completion - b.completion.root.completion;
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
				let built = $scope.part.built;
				let blueprints = $scope.part.blueprints;
				if(bp)
					blueprints += inc ? 1 : -1;
				else
					built += inc ? 1 : -1;
				inv.setPartCount($scope.part._id, built, blueprints);
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
				let built = $scope.part.built;
				let blueprints = $scope.part.blueprints;
				if(bp)
					blueprints += inc ? 1 : -1;
				else
					built += inc ? 1 : -1;
				inv.setPartCount($scope.part._id, built, blueprints);
			}
		});
	}])