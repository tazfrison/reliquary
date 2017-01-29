angular.module("admin", ["data"])
	.directive('admin', function() {
		return {
			restrict: 'E',
			scope: {},
			controller: function($scope) {
				$scope.showRelic = true;
				$scope.showPrime = false;

				$scope.select = function(id) {
					$scope.showRelic = id == 0;
					$scope.showPrime = id == 1;
				}
			},
			template:
				'<div class="tabbable">' +
					'<ul class="nav nav-tabs">' +
						'<li ng-class="{active:showRelic}">'+
							'<a href="" ng-click="select(0)">Relics</a>' +
						'</li>' +
						'<li ng-class="{active:showPrime}">'+
							'<a href="" ng-click="select(1)">Primes</a>' +
						'</li>' +
					'</ul>' +
					'<div class="tab-content">' +
						'<newrelic ng-show="showRelic"></newrelic>' +
						'<newprime ng-show="showPrime"></newprime>' +
					'</div>' +
				'</div>',
		};
	})
	
	.directive('newrelic', ["DataService", function() {
		return {
			restrict: 'E',
			scope: {},
			controller: function($scope, DataService) {
				let rewards = () => [
						{rarity: 0, partId: null},
						{rarity: 0, partId: null},
						{rarity: 0, partId: null},
						{rarity: 1, partId: null},
						{rarity: 1, partId: null},
						{rarity: 2, partId: null}
					];
				
				$scope.eras = ["Lith", "Meso", "Neo", "Axi"];
				
				$scope.rarities = ["Common", "Uncommon", "Rare"];
				
				$scope.relic = new DataService.Relic();
				$scope.parts = [];
				$scope.relics = [];
				
				DataService.service.then(service => {
					$scope.parts = service.getParts();
					$scope.relics = service.getRelics();
				});
				
				$scope.relicSelect = function(){
					if($scope.relic == null){
						$scope.relic = new DataService.Relic();
					}
				}
				
				$scope.setRelic = function(){
					$scope.relic.save();
					$scope.relic = new DataService.Relic();
				}
			},
			templateUrl: "/templates/newRelic.template.html"
		};
	}])
	
	.directive('newprime', ["DataService", "$q", function() {
		return {
			restrict: 'E',
			scope: {},
			controller: function($scope, DataService, $q) {
				//Presets
				$scope.presets = ["Warframe", "Rifle/Shotgun", "Pistol/Sidearm", "Bow"];
				$scope.icons = [
					"barrel",
					"receiver",
					"stock",
					"neuroptics",
					"systems",
					"chassis",
					"blade",
					"handle",
					"link",
					"grip"
				]
				
				$scope.preset = {
					name: "",
					type: null,
					parts: [],
					vaulted: false
				}
				
				$scope.updatePreset = function(){
					$scope.preset.parts = [];
					if($scope.preset.type === null)
						return;

					switch($scope.preset.type){
						case "0":
							$scope.preset.parts = [
								{name: $scope.preset.name + " Prime", ducats: null},
								{name: $scope.preset.name + " Prime Chassis", ducats: null},
								{name: $scope.preset.name + " Prime Neuroptics", ducats: null},
								{name: $scope.preset.name + " Prime Systems", ducats: null}
							];
							break;
						case "1":
						case "2":
							$scope.preset.parts = [
								{name: $scope.preset.name + " Prime", ducats: null},
								{name: $scope.preset.name + " Prime Barrel", ducats: null},
								{name: $scope.preset.name + " Prime Receiver", ducats: null}
							];
							if($scope.preset.type == 1)
								$scope.preset.parts.push({name: $scope.preset.name + " Prime Stock", ducats: null})
							break;
						case "3":
							$scope.preset.parts = [
								{name: $scope.preset.name + " Prime", ducats: null},
								{name: $scope.preset.name + " Prime Grip", ducats: null},
								{name: $scope.preset.name + " Prime Lower Limb", ducats: null},
								{name: $scope.preset.name + " Prime String", ducats: null},
								{name: $scope.preset.name + " Prime Upper Limb", ducats: null}
							];
							break;
						default:
							break;
					}
				}
				
				$scope.makePreset = function(){
					let parts = $scope.preset.parts.map(a => new DataService.Part(a));
					let main = parts.shift();
					let temp = ["warframe", "primary", "secondary", "primary"];
					let prime = {
						name: $scope.preset.name + " Prime",
						vaulted: $scope.preset.vaulted,
						type: temp[$scope.preset.type]
					};
					if($scope.preset.type == "0")
						parts.forEach(a => a.hasBlueprint = true);
					$q.all(parts.map(a=>a.save())).then(function(results){
						if(results.some(a=>!a))
							return false;
						main.requirements = parts.map(a => ({quantity: 1, partId: a._id}));
						main.hasBlueprint = true;
						main.save().then(function(result){
							if(!result)
								return false;
							prime.rootId = main._id
							prime = new DataService.Prime(prime);
							prime.save();
						});
					});
					$scope.preset = {
						name: "",
						type: null,
						parts: [],
						vaulted: false
					}
				};

				//Primes
				
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
				
				$scope.prime = new DataService.Prime();
				
				$scope.primes = [];
				$scope.parts = [];
				DataService.service.then(service =>{
					$scope.primes = service.getPrimes();
					$scope.parts = service.getParts();
				});
				
				$scope.setPrime = function(){
					$scope.prime.save();
					$scope.prime = new DataService.Prime();
				}
				
				$scope.primeSelect = function(){
					if($scope.prime === null)
						$scope.prime = new DataService.Prime();
				}
				
				//Parts
				
				$scope.part = new DataService.Part();
				
				$scope.setPart = function(){
					$scope.part.save();
					$scope.part = new DataService.Part();
				}
				
				$scope.partSelect = function(){
					if($scope.part === null)
						$scope.part = new DataService.Part();
				}
			},
			templateUrl: "/templates/newPrime.template.html"
		};
	}])