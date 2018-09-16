const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const port = 8110;

const crypto = require("crypto");
const cryptr = require("cryptr");
const util = require("util");
const fs = require("fs");
const now = require("performance-now");

const session = require("express-session");
const passport = require("passport");
const OAuth2Strategy = require("passport-oauth").OAuth2Strategy;
const twitchStrategy = require("passport-twitch").Strategy;
const youtubeV3Strategy = require("passport-youtube-v3").Strategy;
const googleStrategy = require("passport-google-oauth20").Strategy;
const discordStrategy = require("passport-discord").Strategy;

const shortid = require("shortid");
const zipFolder = require("zip-folder");

const request = require("request");
const handlebars = require("handlebars");

const config = require("./config.js");

const bluebird = require("bluebird");
const redis = require("redis");
bluebird.promisifyAll(redis);

const _ = require("lodash");

const SESSION_SECRET = config.SESSION_SECRET;

let lagless1Settings = {
	x1: -1,
	y1:-1,
	x2: -1,
	y2: -1,
	fps: 5,
	quality: 40,
	scale: 20,
};

let lastImage = "";
let clientDB;
let localStorage;
let clients = [];
let channels = {};
let restartAvailable = true;
let lagless2ChangeAvailable = true;
let locked = false;
let wifiEnabled = false;
let maxPlayers = 5;

let controlQueues = [[], [], [], [], []];
let waitlists = [[], [], [], [], []];
let waitlistMaxes = [10, 10, 10, 10, 10];
let minQueuePositions = [5, 5, 5, 5, 5];

let normalTime = 30000;
let subTime = 60000;

let turnDurations = [30000, 30000, 30000, 30000, 30000];
let timeTillForfeitDurations = [15000, 15000, 15000, 15000, 15000];
let turnStartTimes = [Date.now(), Date.now(), Date.now(), Date.now(), Date.now()];
let forfeitStartTimes = [Date.now(), Date.now(), Date.now(), Date.now(), Date.now()];
let moveLineTimers = [null, null, null, null, null];
let forfeitTimers = [null, null, null, null, null];

let turnTimesLeft = [0, 0, 0, 0, 0];
let forfeitTimesLeft = [0, 0, 0, 0, 0];

let splitTimer = null;
let afkTimer = Date.now();
let afkTime = 1000 * 60 * 30;// 30 minutes

app.use(session({
	secret: SESSION_SECRET,
	resave: false,
	saveUninitialized: false
}));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());

// If user has an authenticated session, display it, otherwise display link to authenticate
app.get("/", function(req, res) {
// 	res.send(`<script></script>`);
});

app.get("/download", function(req, res) {
	
	let unique = req.query.code;
	
	let url = "https://remotegameshare.com/zips/"
	
	if (req.query.type == "client") {
		url += "sharerClient-";
	} else if (req.query.type == "host") {
		url += "sharerHost-";
	}
	
	url += unique + ".zip";
	
	res.redirect(url);
	
});

server.listen(port, function() {
	console.log("Server listening at port %d", port);
});

//console.log(util.inspect(clientDB, false, null));

function Client(socket) {
	this.socket = socket;
	this.id = socket.id;
	this.rooms = [];
	
	this.is_mod		= false;
	this.is_plus	= false;
	this.is_sub		= false;
	
}

function findClientByID(id) {
	let index = -1;
	for (let i = 0; i < clients.length; i++) {
		if (clients[i].id == id) {
			index = i;
			return index;
		}
	}
	return index;
}

io.set("transports", [
	"polling",
	"websocket",
	"xhr-polling",
	"jsonp-polling"
]);

io.on("connection", function(socket) {
	
	let client = new Client(socket);
	clients.push(client);
	console.log("number of clients connected: " + clients.length);

	// after recieving the image, broadcast it to viewers
	socket.on("screenshot", function(data) {
		
		let index = findClientByID(socket.id);
		if (index == -1) {
			return;
		}
		let client = clients[index];
		
		let rooms = client.rooms;
		
		if (rooms.length < 1) {
			return;
		}
		
		
		io.to(rooms[0] + "Client").emit("viewImage", data);
	});

	socket.on("sendControllerState", function(data) {
		
		let index = findClientByID(socket.id);
		if (index == -1) {
			return;
		}
		let client = clients[index];
		
// 		console.log(data);
		let cNum = data.cNum;
		let controllerState = data.state;
		let room = data.room;
		
		io.to(room).emit("controllerState", {state: controllerState});
// 		io.emit("controllerState", {state: controllerState});
	});

	/* ROOMS @@@@@@@@@@@@@@@@@@@@@@@@ */
	
	socket.on("leave", function(room) {
		let index = findClientByID(socket.id);
		if (index == -1) {
			return;
		}
		let client = clients[index];
		index = client.rooms.indexOf(room);
		if (client.rooms.indexOf(room) > -1) {
			client.rooms.splice(index, 1);
		}
		socket.leave(room);
	});
	
	socket.on("join", function(room) {
		let index = findClientByID(socket.id);
		if (index == -1) {
			return;
		}
		let client = clients[index];
		if (client.rooms.indexOf(room) == -1) {
			client.rooms.push(room);
		}
		socket.join(room);
	});
	
	/* GENERATE ROOMS */
	socket.on("generateDownload", function(data) {
		
		console.log("generating download.");
		
		// use $ and @ instead of - and _
		shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');
		
		let unique = shortid.generate();
		
		
		// copy master to master2:
		
		
		// modify master2:
		
		
		// just modify master2:
		
		let myControllerBat = "title myController\nsharer.exe " + unique;
		let batLocation = "/srv/www/remotegameshare.com/html/projects/sharerServer/server/sharerHost-master/myController.bat";
		fs.truncate(batLocation, 0, function() {
			fs.writeFile(batLocation, myControllerBat, function (err) {
				if (err) {
					return console.log("error: " + err);
				}
			});
		});
		
		let roomIDJS = "let roomID = \"" + unique + "\"";
		let roomIDLocation = "/srv/www/remotegameshare.com/html/projects/sharerServer/server/sharerClient-master/resources/app/js/roomID.js";
		fs.truncate(roomIDLocation, 0, function() {
			fs.writeFile(roomIDLocation, roomIDJS, function (err) {
				if (err) {
					return console.log("error: " + err);
				}
			});
		});
		
		// make sure done writing:
		setTimeout(function() {
			
			let sharerFolder = "/srv/www/remotegameshare.com/html/projects/sharerServer/";
			let masterClientFolder = sharerFolder + "server/sharerClient-master";
			let masterHostFolder = sharerFolder + "server/sharerHost-master";

			let zipsFolder = sharerFolder + "public/zips/";
			let zipClient = zipsFolder + "sharerClient-" + unique + ".zip";
			let zipHost = zipsFolder + "sharerHost-" + unique + ".zip";

			// client folder:
			zipFolder(masterClientFolder, zipClient, function(err) {
				if (err) {
					console.log("error_client: ", err);
				} else {
					console.log("success");

					// host folder:
					zipFolder(masterHostFolder, zipHost, function(err) {
						if (err) {
							console.log("error_host: ", err);
						} else {
							console.log("success");


							let obj = {};
							obj.clientURL = "https://remotegameshare.com/8110/download?type=client&code=" + unique;
							obj.hostURL = "https://remotegameshare.com/8110/download?type=host&code=" + unique;
							obj.unique = unique;
							socket.emit("downloadReady", obj);

						}
					});


				}
			});
			
		}, 1000);
		

	});
	
// 	io.emit("controllerState", {state: "800000000000000 128 128 128 128"});
	
});

function stream() {
	let obj = {
		x1: lagless1Settings.x1,
		y1: lagless1Settings.y1,
		x2: lagless1Settings.x2,
		y2: lagless1Settings.y2,
		q: lagless1Settings.quality,
		s: lagless1Settings.scale,
	};
	io.emit("screenshot", obj);
	setTimeout(stream, 1000 / lagless1Settings.fps);
}
stream();