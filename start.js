const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require("mongodb").ObjectID;
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const env = JSON.parse(fs.readFileSync("./environment.json", "utf8"));

const url = "mongodb://" +
	env.database.username + ":" + env.database.password +
	"@" + env.database.ip + ":" + env.database.port + "/" + env.database.database;


MongoClient.connect(url, function(err, db) {
	if(err){
		console.log(url, err);
		process.exit(-1);
	}
	console.log("Connected successfully to database");
	app.use(express.static(__dirname + '/public'));
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());
	app.set("views", "./views");
	app.set("view engine", "pug");
	app.use(session({
		secret: env.secret,
		store: new MongoStore({db: db}),
		resave: false,
		saveUninitialized: false
	}));
	
	app.get("/", function (req, res){
		res.render('main');
	});
	
	app.get("/login", function (req, res){
		res.render('login');
	});
	
	app.all("/logout", function (req, res){
		delete req.session.userId
		delete req.session.admin;
		res.redirect("/");
	});
	
	app.post("/login", function (req, res){
		db.collection("users").find({"name": req.body.username}).toArray(function(err, docs){
			if(err){
				res.json({error: "Database error"});
				return;
			}
			
			if(req.body.create){
				if(docs && docs.length > 0){
					res.json({error: "Username in use"});
					return;
				}
				let salt = crypto.randomBytes(Math.ceil(16))
					.toString('hex')
					.slice(0,32);
				let hash = crypto.createHmac('sha512', salt)
					.update(req.body.password)
					.digest("hex");
				db.collection("users").insertOne({
					name: req.body.username,
					password: hash,
					salt: salt,
					mastered: [],
					inventory: {}
				}).then(function(result){
					if(result.result.ok !== 1){
						res.json({error: "Account creation failed"});
						return;
					}
					console.log("New user: " + result.ops[0].name + ", id: " + result.ops[0]._id);
					req.session.userId = result.ops[0]._id;
					req.session.admin = false;
					res.json(true);
				}, function(){
					res.json({error: "Account creation failed"});
				});
			}
			else{
				if(docs.length !== 1){
					res.json({error: "Username or password incorrect"});
					return;
				}
				let salt = docs[0].salt;
				let pwd = docs[0].password;
				let hash = crypto.createHmac('sha512', salt)
					.update(req.body.password)
					.digest("hex");
				if(pwd !== hash){
					res.json({error: "Username or password incorrect"});
					return;
				}
				console.log("Logged in " + docs[0].name);
				req.session.userId = docs[0]._id;
				req.session.admin = docs[0].admin || false;
				res.json(true);
			}
		})
	});

	/*app.get('/close', function(req, res) {
		res.send("Closing server");
		console.log("Closing server");
		server.close(function(){
			db.close();
			console.log("Server closed");
			process.exit();
		});
	});*/
	
	app.get("/admin", function(req, res){
		if(!req.session.userId || !req.session.admin)
			res.redirect("/");
		else
			res.render("admin");
	});
	
	function update(collection){
		return function(req, res){
			if(!req.session.admin){
				res.sendStatus(500);
				return;
			}
			if(req.body._id){
				let id = req.body._id;
				delete req.body._id;
				db.collection(collection).updateOne({"_id": new ObjectID(id)}, {$set: req.body}).then(function(result){
					if(result.result.ok !== 1 || result.result.nModified !== 1){
						console.log("Failed update");
						res.sendStatus(500);
						return;
					}
					console.log("Updated " + collection + ": " + req.body.name + ", id: " + id)
					res.sendStatus(200);
				}, function(){
					console.log("Goofed");
					res.sendStatus(500);
				});
			}
			else
			{
				db.collection(collection).insertOne(req.body).then(function(result){
					if(result.result.ok !== 1){
						console.log("Failed insert");
						res.sendStatus(500);
						return;
					}
					console.log("New " + collection + ": " + result.ops[0].name + ", id: " + result.ops[0]._id)
					res.json(result.ops[0]);
				}, function(){
					console.log("Goofed");
					res.sendStatus(500);
				});
			}
		}
	};
	
	app.get('/api/images', function(req, res){
		let regex = /.+\.png$/;
		fs.readdir(path.join(__dirname, "public", "images"), function(err, data){
			if(data && data.length)
			{
				res.json(data
					.filter(file => regex.test(file))
					.map(file => file.slice(0, -4))
				);
			}
			else
				res.json(err);
		});
	});

	app.get('/api/primes', function(req, res){
		db.collection("primes").find({}).toArray(function(err, docs){
			res.json(docs);
		});
	});
	
	app.post('/api/primes', update("primes"));

	app.get('/api/parts', function(req, res){
		db.collection("parts").find({}).toArray(function(err, docs){
			res.json(docs);
		});
	});
	
	app.post('/api/parts', update("parts"));

	app.get('/api/relics', function(req, res){
		db.collection("relics").find({}).toArray(function(err, docs){
			res.json(docs);
		});
	});
	
	app.post('/api/relics', update("relics"));

	//Hardcoding to single user
	app.get('/api/users', function(req, res){
		if(!req.session.userId){
			res.json(false);
		}
		else{
			db.collection("users").find({_id: new ObjectID(req.session.userId)}).toArray(function(err, docs){
				if(err){
					console.log(err)
					res.json(false);
				}
				else{
					let user = docs[0];
					res.json({
						name: user.name,
						inventory: user.inventory,
						mastered: user.mastered
					});
				}
			});
		}
		
	});
	
	app.post('/api/users', function(req, res){
		if(req.session.userId){
			let id = req.session.userId;
			let data = {};
			if((!req.body.primes || req.body.primes.length == 0)
				&& (!req.body.parts || req.body.parts.length == 0)){
					res.sendStatus(200);
					return;
				}

			//Handle primes array, simple push/pull
			if(req.body.primes && req.body.primes.length > 0){
				//Unmastered primes
				let temp = req.body.primes.filter(a=>!a.value).map(a=>a._id);
				if(temp.length > 0)
					data["$pull"] = {mastered: {"$in": temp}};
			
				//Newly mastered primes
				temp = req.body.primes.filter(a=>a.value).map(a=>a._id);
				if(temp.length > 0)
					data["$push"] = {mastered: {"$each": temp}};
			}
			
			//Handle parts
			if(req.body.parts && req.body.parts.length > 0){
				let temp = req.body.parts.filter(a=>a.built == 0 && a.blueprints == 0);
				if(temp.length > 0){
					data["$unset"] = {};
					temp.forEach(a => {
						data["$unset"]["inventory." + a._id] = "";
					});
				}
				temp = req.body.parts.filter(a=>a.built != 0 || a.blueprints != 0);
				if(temp.length > 0){
					data["$set"] = {};
					temp.forEach(a => {
						data["$set"]["inventory." + a._id] = a;
					});
				}
			}
			
			db.collection("users").updateOne({"_id": new ObjectID(id)}, data).then(function(result){
				if(result.result.ok !== 1 || result.result.nModified !== 1){
					console.log("Failed update");
					res.sendStatus(500);
					return;
				}
				console.log("Updated users, id: " + id)
				res.sendStatus(200);
			}, function(){
				console.log("Goofed");
				res.sendStatus(500);
			});
		}
		else
		{
			res.sendStatus(500);
			return;
		}
	});

	const server = app.listen(env.port, function(){
		console.log('Listening on port ' + env.port + '!');
	});
});