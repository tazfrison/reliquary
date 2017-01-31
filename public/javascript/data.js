angular.module('data', [])
	.factory('DataService', ["$http", "$q", "$timeout", function ($http, $q, $timeout) {
		let promise = $q.defer();
		
		let primes = [];
		let primeMap = {};
		let relics = [];
		let relicMap = {};
		let parts = [];
		let partMap = {};
		let users = [];
		
		let average = values => values.reduce((a,b) => a + b/values.length, 0);
		let chances = [
				[.253, .11, .02],
				[.233, .13, .04],
				[.200, .17, .06],
				[.167, .20, .10]
			];
		
		function Prime(data){
			if(data){
				this.name = data.name || "";
				this.vaulted = !!data.vaulted;
				this.type = data.type || "other";
				this.rootId = data.rootId || null;
				if(data._id){
					this._id = data._id;
					this.index();
				}
			}
			else{
				this.name = "";
				this.vaulted = false;
				this.type = "other";
				this.rootId = null;
			}
		}
		
		Prime.prototype.index = function(){
			primes.push(this);
			primeMap[this._id] = this;
			this.mastered = false;
			this.completion = {
				root: {
					completion: 0,
					width: "0%"
				}
			};
			
			let recurse = (id, quantity) => {
				this.completion[id] = {quantity: quantity, completion: 0, width: "0%"};
				partMap[id].primes.push(this);
				partMap[id].required += quantity;
				partMap[id].requirements.forEach(a =>{
					recurse(a.partId, quantity * a.quantity);
				});
			}
			recurse(this.rootId, 1);
		}
		
		Prime.prototype.getData = function(){
			if(!this.name || this.name == ""
				|| this.vaulted === undefined
				|| !this.type || this.type == ""
				|| !this.rootId){
					return false;
			}
			let data = {
				name: this.name,
				vaulted: this.vaulted,
				type: this.type,
				rootId: this.rootId
			};
			if(this._id)
				data._id = this._id;
			return data;
		}
		
		Prime.prototype.master = function(value){
			if(value === this.mastered)
				return;
			this.mastered = value;
			let recurse = (id, quantity) => {
				partMap[id].owned += quantity;
				partMap[id].requirements.forEach(a =>{
					recurse(a.partId, quantity * a.quantity);
				});
			}
			recurse(this.rootId, value ? 1 : -1);
			this.update();
		}
		
		Prime.prototype.update = function(){
			let owned = 0;
			if(this.mastered)
				owned = 1;
			let recurse = (id, owned) =>{
				let part = partMap[id];
				let quantity = this.completion[id].quantity;
				owned = Math.min(quantity, owned + part.built);
				let percent;
				if(part.requirements && part.requirements.length > 0){
					let percents = [];
					part.requirements.forEach(req => {
						let percent = recurse(req.partId, owned * req.quantity);
						if(owned < quantity){
							percents.push.apply(percents, new Array(1 * req.quantity).fill(percent));
						}
					});
					if(owned >= quantity){
						percent = 1;
					}
					else{
						percents.push(Math.min(1, part.blueprints / (quantity - owned)));
						percent = average(percents);
						percent *= (quantity - owned);
						percent += owned;
						percent /= quantity;
					}
				}
				else{
					percent = Math.min(quantity, owned + part.blueprints) / quantity;
				}
				this.completion[id].completion = percent;
				this.completion[id].width = 100 * percent + "%";
				return percent;
			}
			let percent = this.completion.root.completion = recurse(this.rootId, owned);
			this.completion.root.width = 100 * percent + "%";
		}
		
		Prime.prototype.save = function(){
			let data = this.getData();
			if(data === false){
				let defer = $q.defer();
				defer.reject(false);
				return defer.promise;
			}
			return $http.post("/api/primes", this.getData()).then(res => {
				if(!this._id){
					this._id = res.data._id;
					this.index();
				}
				return true;
			});
		}
		
		function Part(data){
			if(data){
				this.name = data.name || "";
				this.hasBlueprint = !!data.hasBlueprint;
				this.ducats = data.ducats || 0;
				this.requirements = data.requirements || [];
				this.icon = data.icon || "";
				if(data._id){
					this._id = data._id;
					this.index();
				}
			}
			else{
				this.name = "";
				this.hasBlueprint = false;
				this.ducats = 0;
				this.requirements = [];
				this.icon = "";
			}
		}
		
		Part.prototype.index = function(){
			parts.push(this);
			partMap[this._id] = this;
			this.built = 0;
			this.blueprints = 0;
			this.required = 0;
			this.owned = 0;
			this.primes = [];
			this.relics = [];
		}
		
		Part.prototype.getData = function(){
			if(!this.name || this.name == ""
				|| this.hasBlueprint === undefined
				|| this.ducats === undefined){
					return false;
			}
			let data = {
				name: this.name,
				hasBlueprint: this.hasBlueprint,
				ducats: this.ducats
			};
			if(this.requirements && this.requirements.length > 0)
				data.requirements = this.requirements;
			if(this._id)
				data._id = this._id;
			if(this.icon)
				data.icon = this.icon;
			return data;
		}
		
		Part.prototype.setCounts = function(built, blueprints){
			if(this.built == built && this.blueprints == blueprints)
				return;
			if(this.built !== built){
				let recurse = function(id, quantity){
					partMap[id].owned += quantity;
					partMap[id].requirements.forEach(a =>{
						recurse(a.partId, quantity * a.quantity);
					});
				}
				recurse(this._id, built - this.built);
			}
			
			this.blueprints = blueprints;
			this.built = built;
			this.primes.forEach(p => p.update());
		}
		
		Part.prototype.save = function(){
			let data = this.getData();
			if(data === false){
				let defer = $q.defer();
				defer.reject(false);
				return defer.promise;
			}
			return $http.post("/api/parts", this.getData()).then(res => {
				if(!this._id){
					this._id = res.data._id;
					this.index();
				}
				return true;
			});
		}
		
		function Relic(data){
			if(data){
				this.name = data.name || "";
				this.vaulted = !!data.vaulted;
				this.era = data.era || 0;
				this.rewards = data.rewards || [
						{rarity: 0, partId: null},
						{rarity: 0, partId: null},
						{rarity: 0, partId: null},
						{rarity: 1, partId: null},
						{rarity: 1, partId: null},
						{rarity: 2, partId: null}
					];
				if(this.rewards.length == 0){
					this.rewards = [
						{rarity: 0, partId: null},
						{rarity: 0, partId: null},
						{rarity: 0, partId: null},
						{rarity: 1, partId: null},
						{rarity: 1, partId: null},
						{rarity: 2, partId: null}
					]
				}
				if(data._id){
					this._id = data._id;
					this.index();
				}
			}
			else{
				this.name = "";
				this.era = 0,
				this.vaulted = false;
				this.rewards = [
					{rarity: 0, partId: null},
					{rarity: 0, partId: null},
					{rarity: 0, partId: null},
					{rarity: 1, partId: null},
					{rarity: 1, partId: null},
					{rarity: 2, partId: null}
				];
			}
		}
		
		Relic.prototype.index = function(){
			relics.push(this);
			relicMap[this._id] = this;
			this.rewards.forEach(rew =>{
				if(!rew.partId)
					return;
				partMap[rew.partId].relics.push({
					rarity: rew.rarity,
					relic: this
				});
			});
		}
		
		Relic.prototype.getData = function(){
			if(!this.name || this.name == ""
				|| this.vaulted === undefined
				|| this.era === undefined){
					return false;
			}
			if(!this.rewards || this.rewards.length !== 6 || this.rewards.some(a => a.partId == null)){
				return false;
			}
			let data = {
				name: this.name,
				vaulted: this.vaulted,
				era: this.era,
				rewards: this.rewards
			};
			if(this._id)
				data._id = this._id;
			return data;
		}
		
		Relic.prototype.save = function(){
			let data = this.getData();
			if(data === false){
				let defer = $q.defer();
				defer.reject(false);
				return defer.promise;
			}
			return $http.post("/api/relics", this.getData()).then(res => {
				if(!this._id){
					this._id = res.data._id;
					this.index();
				}
				return true;
			});
		}
		
		function Inventory(user){
			this.primes = {};
			this.parts = {};
			this.valid = false;
			this.history = [];
			this.name = "";
			this.promise = false;
			
			if(!user)
				return;
			
			this.valid = true;
			this.name = user.name;

			Object.keys(user.inventory).forEach(id => {
				this.setPartCount(id, user.inventory[id].built, user.inventory[id].blueprints);
			});
			user.mastered.forEach(primeId => {
				this.setMastery(primeId, true);
			});
			
			this.cancel();
			this.primes = {};
			this.parts = {};
		}
		
		Inventory.prototype.setMastery = function(id, value){
			let prime = primeMap[id];
			//No change to current
			if(prime.mastered == value)
				return;

			this.cancel();

			//Resetting to saved value
			if(this.primes[id] && this.primes[id] === value)
				delete this.primes[id];
			//Changed from saved value
			else
				this.primes[id] = prime.mastered;
			
			//Update local
			prime.master(value);
			
			this.setTimeout();
		}
		
		Inventory.prototype.setPartCount = function(id, built, blueprints){
			let part = partMap[id];
			
			//No change
			if(part.built === built && part.blueprints === blueprints)
				return;
			
			this.cancel();
			
			//Resetting to saved value
			if(this.parts[id]
				&& this.parts[id].built === built
				&& this.parts[id].blueprints === blueprints){
				delete this.parts[id];
			}
			//Changed from saved value
			else{
				this.parts[id] = {
					built: part.built,
					blueprints: part.blueprints
				};
			}
			
			//Update local
			part.setCounts(built, blueprints);
			
			this.setTimeout();
		}

		Inventory.prototype.setTimeout = function(){
			this.cancel();
			if(Object.keys(this.primes).length > 0 ||
				Object.keys(this.parts).length > 0){
				this.promise = $timeout(() =>{
					this.save();
				}, 10000);
			}
		}
		
		Inventory.prototype.cancel = function(){
			if(this.promise !== false){
				$timeout.cancel(this.promise);
				this.promise = false;
			}
		}
		
		Inventory.prototype.save = function(){
			let primes = Object.keys(this.primes).map(id => ({_id: id, value: primeMap[id].mastered}))
			let parts = Object.keys(this.parts).map(id => ({
				_id: id,
				built: partMap[id].built,
				blueprints: partMap[id].blueprints
			}));
			//Nothing to do
			if(primes.length === 0 && parts.length === 0){
				let promise = $q.defer();
				promise.resolve(true);
				return promise.promise;
			}
			let data = {};
			if(primes.length > 0)
				data.primes = primes;
			if(parts.length > 0)
				data.parts = parts;
			this.history.push({
				primes: this.primes,
				parts: this.parts,
				total: Object.keys(this.primes).length + Object.keys(this.parts).length
			});
			this.primes = {};
			this.parts = {};
			this.promise = false;
			
			if(false){
				let temp = $q.defer();
				temp.resolve(true);
				return temp.promise;
			}
			return $http.post("/api/users", data).then(res => {
				return true;
			});
		}
		
		$q.all([
			$http.get('/api/parts'),
			$http.get('/api/primes'),
			$http.get('/api/relics'),
			$http.get('/api/users')
		]).then(data => {
			//Store all parts
			data[0].data.forEach(part => {
				new Part(part);
			});
			
			//Store all primes
			data[1].data.forEach(prime => {
				new Prime(prime);
			});
			
			//Store all relics
			data[2].data.forEach(relic => {
				new Relic(relic);
			});
			
			//Track inventory and mastery
			let inventory = new Inventory(data[3].data);
			
			promise.resolve({
				getPrimes: () => primes.slice(),
				getRelics: () => relics.slice(),
				getParts: () => parts.slice(),
				getInventory: () => inventory,
				getPrime: id => primeMap[id],
				getPart: id => partMap[id],
				getRelic: id  => relicMap[id]
			});
		});
		
		return {
			service: promise.promise,
			Prime: Prime,
			Part: Part,
			Relic: Relic
		};
	}])
	.component("notifications", {
		controller: ["$scope", "DataService", function($scope, DataService){
			$scope.saving = false;
			$scope.pending = false;
			$scope.events = [];
			
			DataService.service.then(service =>{
			
				let update = () => {
					$scope.saving = !!$scope._inv.promise;
					if(Object.keys($scope._inv.primes).length > 0 ||
						Object.keys($scope._inv.parts).length > 0)
						$scope.pending = true;
					else
						$scope.pending = false;
				}
				$scope._inv = service.getInventory();
				$scope.$watch("_inv.promise", update);
				$scope.events = $scope._inv.history;
				$scope.cancel = () => $scope._inv.cancel();
				$scope.save = () => $scope._inv.save().then(update);
			});
			
			$scope.overlay = false;
			$scope.toggle = () => $scope.overlay = !$scope.overlay;
		}],
		templateUrl: "templates/notifications.template.html"
	})