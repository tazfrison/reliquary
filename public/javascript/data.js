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
		
		class Prime {
			constructor(data) {
				if(data) {
					this.name = data.name || "";
					this.vaulted = !!data.vaulted;
					this.type = data.type || "other";
					this.rootId = data.rootId || null;
					if(data._id) {
						this._id = data._id;
						this.index();
					}
				}
				else {
					this.name = "";
					this.vaulted = false;
					this.type = "other";
					this.rootId = null;
				}
			}
			
			index() {
				primes.push(this);
				primeMap[this._id] = this;
				this.mastered = false;
				this.requirements = {
					root: {
						owned: 0,
						required: 0
					}
				}
				let recurse = (id, quantity) => {
					this.requirements[id] = {
						owned: 0,
						required: quantity
					};
					this.requirements.root.required += quantity;
					partMap[id].primes.push(this);
					if(!this.vaulted)
						partMap[id].vaulted = false;
					partMap[id].required += quantity;
					partMap[id].requirements.forEach(a => {
						recurse(a.partId, quantity * a.quantity);
					});
				}
				recurse(this.rootId, 1);
				this.requirements.root.width = (Math.min(1, this.requirements.root.owned / this.requirements.root.required) * 100) + "%";
			}
			
			getData() {
				if(!this.name || this.name == ""
					|| this.vaulted === undefined
					|| !this.type || this.type == ""
					|| !this.rootId) {
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
			
			master(value) {
				if(value === this.mastered)
					return;
				this.mastered = value;
				
				partMap[this.rootId].update("used", value ? 1 : -1);
				
				this.adjust(this.rootId, value ? 1 : -1, true);
			}
			
			_update(id, change) {
				let req = this.requirements[id];
				let prev = Math.min(req.owned, req.required);
				req.owned += change;
				this.requirements.root.owned += Math.min(req.owned, req.required) - prev;
				partMap[id].requirements.forEach(a => {
					this._update(a.partId, change * a.quantity);
				});
			}
			
			adjust(id, change, recurse) {
				if(recurse)
					this._update(id, change);
				else {
					let req = this.requirements[id];
					let prev = Math.min(req.owned, req.required);
					this.requirements[id].owned += change;
					let next = Math.min(req.owned, req.required);
					change = next - prev;
					this.requirements.root.owned += change;
				}
				this.requirements.root.width = (Math.min(1, this.requirements.root.owned / this.requirements.root.required) * 100) + "%";
			}
			
			save() {
				let data = this.getData();
				if(data === false) {
					let defer = $q.defer();
					defer.reject(false);
					return defer.promise;
				}
				return $http.post("/api/primes", this.getData()).then(res => {
					if(!this._id) {
						this._id = res.data._id;
						this.index();
					}
					return true;
				});
			}
		}

		class Part {
			constructor(data) {
				if(data) {
					this.name = data.name || "";
					this.hasBlueprint = !!data.hasBlueprint;
					this.ducats = data.ducats || 0;
					this.requirements = data.requirements || [];
					this.icon = data.icon || "";
					if(data._id) {
						this._id = data._id;
						this.index();
					}
				}
				else {
					this.name = "";
					this.hasBlueprint = false;
					this.ducats = 0;
					this.requirements = [];
					this.icon = "";
				}
			}
			
			index() {
				parts.push(this);
				partMap[this._id] = this;
				this.primes = [];
				this.relics = [];
				this.required = 0;
				this.built = 0;
				this.blueprints = 0;
				this.used = 0;
				this.vaulted = true;
				if(this.name === "Forma")
					this.vaulted = false;
			}
			
			getData() {
				if(!this.name || this.name == ""
					|| this.hasBlueprint === undefined
					|| this.ducats === undefined) {
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
			
			update(type, change) {
				//Check for unnecessary updates
				if(change == 0)
					return;
				
				//Prevent going below 0
				if(this[type] < -change)
					change = -this[type];
				
				if(type == "built" || type == "blueprints") {
					//Mark progress towards each prime that uses this part
					this.primes.forEach(prime => {
						prime.adjust(this._id, change, type == "built");
					});
				}
				
				//Calculate if relics need updating
				let temp = Math.min(this.used + this.built + this.blueprints + change, this.required)
					- Math.min(this.used + this.built + this.blueprints, this.required);
				
				//Don't mark parts used beyond what's required
				let prev = Math.min(this.used + this.built, this.required);
				this[type] += change;
				let next = Math.min(this.used + this.built, this.required);

				//Update relics
				if(temp !== 0) {
					this.relics.forEach(relic => {
						relic.relic.adjust(this._id, temp, relic.rarity);
					});
				}
				
				change = next - prev;
				
				//Propagate progress
				if(change != 0 && (type == "built" || type == "used")) {
					this.requirements.forEach(req => {
						partMap[req.partId].update("used", change * req.quantity);
					});
				}
			}
			
			save() {
				let data = this.getData();
				if(data === false) {
					let defer = $q.defer();
					defer.reject(false);
					return defer.promise;
				}
				return $http.post("/api/parts", this.getData()).then(res => {
					if(!this._id) {
						this._id = res.data._id;
						this.index();
					}
					return true;
				});
			}
		}
		
		class Relic {
			static get REWARDS() {
				return [
					{rarity: 0, partId: null},
					{rarity: 0, partId: null},
					{rarity: 0, partId: null},
					{rarity: 1, partId: null},
					{rarity: 1, partId: null},
					{rarity: 2, partId: null}
				];
			}
			
			constructor(data) {
				if(data) {
					this.name = data.name || "";
					this.vaulted = !!data.vaulted;
					this.era = data.era || 0;
					this.rewards = data.rewards || Relic.REWARDS;
					if(this.rewards.length == 0) {
						this.rewards = Relic.REWARDS;
					}
					if(data._id) {
						this._id = data._id;
						this.index();
					}
				}
				else {
					this.name = "";
					this.era = 0,
					this.vaulted = false;
					this.rewards = Relic.REWARDS;
				}
			}
			
			index() {
				relics.push(this);
				relicMap[this._id] = this;
				this.completion = {
					ducats: [0, 0, 0, 0],
					newPart: [1, 1, 1, 1],
					parts: {},
					owned: 0,
					required: 0,
					percent: "0%"
				}
				this.rewards.forEach(rew => {
					if(!rew.partId)
						return;
					partMap[rew.partId].relics.push({
						rarity: rew.rarity,
						relic: this
					});
					this.completion.required += partMap[rew.partId].required;
					if(partMap[rew.partId].required == 0) {
						//Handle forma
						this.completion.parts[rew.partId] = true;
						chances.forEach((chance, i) => this.completion.newPart[i] -= chance[rew.rarity]);
					}
					else {
						this.completion.parts[rew.partId] = false;
					}
				});
			}
			
			getData() {
				if(!this.name || this.name == ""
					|| this.vaulted === undefined
					|| this.era === undefined) {
						return false;
				}
				if(!this.rewards || this.rewards.length !== 6 || this.rewards.some(a => a.partId == null)) {
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
			
			save() {
				let data = this.getData();
				if(data === false) {
					let defer = $q.defer();
					defer.reject(false);
					return defer.promise;
				}
				return $http.post("/api/relics", this.getData()).then(res => {
					if(!this._id) {
						this._id = res.data._id;
						this.index();
					}
					return true;
				});
			}
			
			adjust(id, change, rarity) {
				let part = partMap[id];
				this.completion.owned += change;
				this.completion.percent = this.completion.owned / this.completion.required * 100 + "%";
				let prev = this.completion.parts[id];
				let next = part.required <= part.used + part.built + part.blueprints;
				for(let i = 0; i < 4; ++i) {
					//Part was complete but now isn't
					if(prev && !next) {
						this.completion.ducats[i] -= chances[i][rarity] * part.ducats;
						this.completion.newPart[i] += chances[i][rarity];
					}
					//Part is now complete
					else if(next && !prev) {
						this.completion.ducats[i] += chances[i][rarity] * part.ducats;
						this.completion.newPart[i] -= chances[i][rarity];
					}
				}
				this.completion.parts[id] = next;
			}
		}

		class Inventory {
			constructor(user) {
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
					this.setPartCount(id, user.inventory[id].built, false);
					this.setPartCount(id, user.inventory[id].blueprints, true);
				});
				user.mastered.forEach(primeId => {
					this.setMastery(primeId, true);
				});
				
				this.cancel();
				this.primes = {};
				this.parts = {};
			}
			
			setMastery(id, value) {
				let prime = primeMap[id];
				//No change to current
				if(prime.mastered == value)
					return;

				this.cancel();

				//Resetting to saved value
				if(this.primes[id] !== undefined && this.primes[id] === value)
					delete this.primes[id];
				//Changed from saved value
				else
					this.primes[id] = prime.mastered;
				
				//Update local
				prime.master(value);
				
				this.setTimeout();
			}
			
			setPartCount(id, change, blueprints) {
				let part = partMap[id];
				let saved = blueprints ? part.blueprints : part.built;
				if(saved < -change)
					change = -saved;
			
				//No change
				if(change === 0)
					return;
				
				this.cancel();
				
				//Mark part as changed since last save
				if(!this.parts[id]) {
					this.parts[id] = {
						built: 0,
						blueprints: 0
					};
				}
				
				//Update changelog
				this.parts[id][blueprints ? "blueprints" : "built"] += change;
				
				//Resetting to saved value
				if(this.parts[id].built === 0
					&& this.parts[id].blueprints === 0){
					delete this.parts[id];
				}
				
				//Update local
				part.update(blueprints ? "blueprints" : "built" , change);
				
				this.setTimeout();
			}
			
			setTimeout() {
				this.cancel();
				if(!this.valid)
					return;
				if(Object.keys(this.primes).length > 0 ||
					Object.keys(this.parts).length > 0) {
					this.promise = $timeout(() => {
						this.save();
					}, 10000);
				}
			}
			
			cancel() {
				if(this.promise !== false) {
					$timeout.cancel(this.promise);
					this.promise = false;
				}
			}
			
			save() {
				if(!this.valid)
					return;
				let primes = Object.keys(this.primes).map(id => ({
					_id: id,
					value: primeMap[id].mastered
				}));
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
			window.test = {
				primes: primes,
				parts: parts,
				relics: relics,
				inventory: inventory
			};
			
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