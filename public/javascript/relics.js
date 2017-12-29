angular.module('relics', ["data"])
	.component('relics', {
		require: {root: "^main"},
		bindings: {
			index: "<"
		},
		controller: ["$scope", "DataService", function($scope, DataService) {
			$scope.era = 0;
			$scope.relics = [];
			$scope.eras = DataService.eras;
			DataService.service.then(service => {
				$scope.relics = service.getRelics();
			});
			$scope.selected = false;

			$scope.select = function(index) {
				$scope.era = index;
				$scope.selected = false;
			}
			
			$scope.selectRelic = function(relic){
				$scope.select(relic.era);
				$scope.selected = relic;
			}

			this.$onInit = () => {
				let i = 0;
				let interval = setInterval(() => {
					if(++i >= 2){
						clearInterval(interval);
						$scope.$emit("ready", this.index);
					}
				}, 5);
				this.root.selectRelic = $scope.selectRelic;
			}
			
			$scope.selectPart = id => {
				$scope.$emit("transfer", "parts", id);
			}
			
			$scope.filters = {
				vaulted: null,
				name: "",
				completion: null
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
	
	.filter("relicsfilter", function() {
		return function(input, filters, sorts) {
			return input.filter(i => {
				if(filters.name !== "" && -1 == i.name.toLowerCase().indexOf(filters.name.toLowerCase()))
					return false;
				if(filters.completion !== null) {
					if(filters.completion){
						if(i.completion.owned < i.completion.required)
							return false;
					}
					else if(!filters.completion) {
						if(i.completion.owned === i.completion.required)
							return false;
					}
				}
				if(filters.vaulted !== null) {
					if(filters.vaulted !== i.vaulted)
						return false;
				}
				
				return true;
			}).sort((a, b) => {
				if(sorts.ducats !== null) {
					
				}
				if(sorts.completion !== null) {
					let _a = Math.min(1, a.completion.owned / a.completion.required),
						_b = Math.min(1, b.completion.owned / b.completion.required)
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