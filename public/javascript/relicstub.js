angular.module('relicStub', ["data"])
	.component('relicStub', {
		bindings: {
			relic: '<'
		},
		controller: ["$scope", "DataService", function($scope, DataService) {
			$scope.eras = DataService.eras;
			$scope.parts = {};
			$scope.length = function(part) {
				if(!part)
					return "0%";
				let percent = 100 * Math.min(1, (part.used + part.built + part.blueprints) / part.required) + "%";
				return percent;
			};
			DataService.service.then(service =>{
				this.relic.rewards.forEach(reward => {
					$scope.parts[reward.partId] = service.getPart(reward.partId);
				});
			});
		}],
		templateUrl: "templates/relicstub.template.html"
	})