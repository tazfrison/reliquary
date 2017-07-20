angular.module("admin", ["data", 'ngMaterial'])
	.config($mdThemingProvider => {
		$mdThemingProvider.theme("default")
			.primaryPalette("teal")
			.accentPalette("light-blue")
//			.backgroundPalette("blue-grey")
			.dark();
	})
	.component("admin", {
		templateUrl: "templates/admin.template.html",
		controller: ["$scope", "DataService", function($scope, DataService){
				$scope.currentNavItem = "relics"
				$scope.selected = [true, false];
				$scope.select = function(index) {
					$scope.selected.fill(false);
					$scope.selected[index] = true;
				}
			}]
	})
	
	.component("newrelic", {
		templateUrl: "/templates/newRelic.template.html",
		controller: ["$scope", "DataService", function($scope, DataService) {
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
		}]
	})
	
	.component("newprime", {
		templateUrl: "/templates/newPrime.template.html",
		controller: ["$scope", "$q", "$http", "DataService", function($scope, $q, $http, DataService) {
			//Presets
			$scope.presets = ["Warframe", "Rifle/Shotgun", "Pistol/Sidearm", "Bow"];
			$scope.icons = null;
			
			$scope.querySearch = text => {
				let next = data => text ? data.filter(item => item.indexOf(text) === 0) : data
				if($scope.icons === null){
					return $http.get("/api/images").then(data => {
						$scope.icons = data.data;
						return next($scope.icons);
					});
				}
				else{
					let defer = $q.defer();
					defer.resolve(next($scope.icons));
					return defer.promise;
				}
			};

			$scope.preset = {
				name: "",
				type: null,
				parts: [],
				vaulted: false
			};
			
			$scope.updatePreset = function(){
				$scope.preset.parts = [];
				if($scope.preset.type === null)
					return;

				switch($scope.preset.type){
					case "0":
						$scope.preset.parts = [
							{name: $scope.preset.name + " Prime", ducats: null},
							{name: $scope.preset.name + " Prime Chassis", ducats: null, icon: "chassis"},
							{name: $scope.preset.name + " Prime Neuroptics", ducats: null, icon: "neuroptics"},
							{name: $scope.preset.name + " Prime Systems", ducats: null, icon: "systems"}
						];
						break;
					case "1":
					case "2":
						$scope.preset.parts = [
							{name: $scope.preset.name + " Prime", ducats: null},
							{name: $scope.preset.name + " Prime Barrel", ducats: null, icon: "barrel"},
							{name: $scope.preset.name + " Prime Receiver", ducats: null, icon: "receiver"}
						];
						if($scope.preset.type == 1)
							$scope.preset.parts.push({name: $scope.preset.name + " Prime Stock", ducats: null, icon: "stock"})
						break;
					case "3":
						$scope.preset.parts = [
							{name: $scope.preset.name + " Prime", ducats: null},
							{name: $scope.preset.name + " Prime Grip", ducats: null, icon: "grip"},
							{name: $scope.preset.name + " Prime Lower Limb", ducats: null, icon: "blade"},
							{name: $scope.preset.name + " Prime String", ducats: null, icon: "stock"},
							{name: $scope.preset.name + " Prime Upper Limb", ducats: null, icon: "blade"}
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
					parts.forEach(p => p.index());
					main.requirements = parts.map(a => ({quantity: 1, partId: a._id}));
					main.hasBlueprint = true;
					main.save().then(function(result){
						if(!result)
							return false;
						main.index();
						prime.rootId = main._id
						prime = new DataService.Prime(prime);
						prime.save().then(result => {
							if(!result)
								return false;
							prime.index();
						});
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
		}]
	})