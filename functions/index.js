const functions = require('firebase-functions');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const isAuthenticated = require('./middlewares/auth');
const isAuthenticatedAdmin = require('./middlewares/admin');
const config = require('./config');

const cors = require('cors');

admin.initializeApp();
const database = admin.database();
const db = database.ref();


// Hard-Coded String
const events = "events";
const eventDescription = "eventDescription";
const userRegistrations = "userRegistrations";
const users = "users";
const registeredEvents = "registeredEvents19";
const queries = "queries";
const googleUrl = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=';
const notifications='notifications';
const sponsorNode = 'sponsors';
const appDevelopers = 'aboutAppDevs';
const food = 'food';
// express
const app = express();
app.use(bodyParser.urlencoded({extended:false}));



// routes
app.use(cors({origin: true}));

// Login and Onboard
// Web
app.post('/login', googleLogin);
app.put('/user', isAuthenticated, signUp);
// Android
app.post('/loginApp', googleLoginApp);
app.put('/signUpApp', signUpApp);

app.get('/events', getEventNames);
app.get('/events/categories', getCategories);
app.get('/events/description', getEventDescription);
app.get('/events/timeline', getEventTimeline);
app.post('/events', isAuthenticated, addEvent);
app.get('/user/event', isAuthenticated, getRegisteredEvents);
app.put('/user/event', isAuthenticated, eventRegister);
// for app registartion
app.get('/user/eventApp', appGetRegisteredEvents, getRegisteredEvents);
app.put('/user/eventApp', appEventRegister, eventRegister);

app.get('/facts', randomFact);
app.get('/videos', video);
app.post('/query', isAuthenticated, addQuery);
app.put('/admin/query',isAuthenticated, removeQuery);
app.get('/timestamp', getTimestamp);
app.get('/timestamp/events', getNextEvents);

app.get('/admin/event', isAuthenticated, getEventUsers);
app.get('/admin/query', isAuthenticated, getQuery);

app.post('/admin/notification',addNotification);
app.get('/notification',getNotifications);

app.get('/contacts', getContacts);

app.get('/lectures', getLectures);

// added later for Google Assistant
app.get('/events/search', getEventInformation);

// Route to obtain section wise sponsors
app.get('/sponsors', sponsorStatic);
app.get('/foodSponsors', foodSponsors);

// Route to add a sponsor to a section
app.post('/sponsors', addSponsor);


// app.post('/about', addDeveloper);
app.get('/about', getDeveloper);
app.get('/aboutAppDevs', getAppDevelopers);

// updated user info
// app.get('/updateUsers', updateUsers);

app.use('/', (req, res) => {

	let data = {};
	let success = false;
	let message = "connected to server";
	let anotherMessage = "C'mon we created so many routes, use them!!";

	res.status(404).json({
		success:success,
		message:message,
		anotherMessage:anotherMessage
	});
})

function foodSponsors(req, res) {

	db.child(food).once('value')
	.then((snapshot) => {

		let data = snapshot.val();
		if(!data) {

			return res.status(500).json({
				success: false,
				message: "No Food"
			});
		}

		return res.status(200).json({
			success: true,
			data: {
				foodSponsors: data
			}
		});
	})
	.catch((err) => {

		return res.status(500).json({
			success: false,
			message: "Internal Server Error. Try Again!",
			error: err
		});
	});
}

function updateUsers(req, res) {

	db.child('users').once('value')
	.then((snapshot) => {

		let data = snapshot.val();
		let users = Object.keys(data);

		let final = [];

		for(let i = 0 ; i < users.length ; i++) {

			// if(data[users[i]]["onBoard"] === true)
			// {
			// 	let zz = '';
			// 	if(data[users[i]]["year"] === 'First')
			// 		zz = 'Second';
			// 	else if(data[users[i]]["year"] === 'Second')
			// 		zz = 'Third';
			// 	else if(data[users[i]]["year"] === 'Third')
			// 		zz = 'Fourth';
			// 	else if(data[users[i]]["year"] === 'Graduate')
			// 		zz = 'Graduated';


				final.push(db.child('users').child(users[i]).update({
					onBoard: false
				}));
			// }

		}

		// eslint-disable-next-line promise/no-nesting
		return Promise.all(final)
		.then(() => {

			return res.status(200).json({
				success: true
			});
		})
		.catch((err) => {
			return res.status(200).json({
				err: err
			});
		})
	})
	.catch((err) => {

		return res.send(err);
	})
}


function getAppDevelopers(req, res) {

	db.child(appDevelopers).once('value')
	.then((snapshot) => {

		let information = snapshot.val();

		return res.status(200).json({
			success: true,
			message: "info received",
			data: {
				information
			}
		});
	})
	.catch((err) => {

		return res.status(500).json({
			success: false,
			message: "Internal Server Error. Could not fetch app developers.",
			error: err
		});
	});
}


// return event description with eventName only
// for assistant
function getEventInformation(req, res) {

	let eventName = req.query.eventName;

	if(eventName === undefined) {

		return res.status(400).json({
			success:false,
			message: "Usage: [GET] eventName=name"
		})
	}

	let x = eventName;
	eventName = eventName.toLowerCase();

	db.child(eventDescription).once('value')
	.then((snapshot) => {

		let allData = snapshot.val();

		for(let category in allData) {

			for(let event in allData[category]) {

				let name = event.toLowerCase();
				if(eventName === name) {

					// caching = 12hr (server), 6hr (browser)
					res.set('Cache-Control', 'public, max-age=21600 , s-maxage=43200');
					return res.status(200).json({
						success: true,
						data: allData[category][event]
					})

				}
			}
		}

		return res.status(404).json({
			success: false,
			message: `${x} event not found`
		})
	})
	.catch((err) => {

		return res.status(500).json({
			success: false,
			message: "could not fetch event description",
			err: err
		})
	})

}


// return users registered in one single event
function getEventUsers(req, res) {

	let eventName = req.query.eventName;
	let eventCategory = req.query.eventCategory;

	if(eventName === undefined || eventCategory === undefined) {

		return res.status(400).json({
			success: false,
			message: `Usage: eventName=name&eventCategory=category`
		})
	}

	db.child(events + "/" + eventCategory + "/" + eventName).once('value')
	.then((snapshot) => {

		if(snapshot.val() === null) {
			return res.status(400).json({
				success: false,
				message: `${eventName} in ${eventCategory} doesn't exist`
			})
		}

		db.child(users).once('value')
		.then((snapshot) => {

			let allUsers = snapshot.val();

			let data = {};
			data["users"] = new Array();

			for(user in allUsers) {

				if(allUsers[user][registeredEvents] === undefined) {
					continue;
				}

				if(allUsers[user][registeredEvents][eventCategory] === undefined) {
					continue;
				}
				if(allUsers[user][registeredEvents][eventCategory].indexOf(eventName) !== -1) {
					data["users"].push(allUsers[user]);
				}

			}

			return res.status(200).json({
				data: data,
				success: true
			})
		})
		.catch(() => {

			res.status(500).json({
				success: false,
				message: `error fetching users node`
			})
		})

		return true;
	})
	.catch(() => {
		res.status(500).json({
			success: false,
			message: "could not see events. internal error"
		})
	})


}


function matchEventDescription(database, data) {


	return new Promise(function(resolve, reject) {

		db.child(eventDescription).once('value')
		.then((snap) => {

			// console.log("idhr hau mai");
			// console.log();
			// console.log();

			let eventsDes = snap.val();

			data[events] = new Array();

			for(let category in database)
			{
				let arrLen = database[category].length;

				for(let event = 0 ; event < arrLen ; event++)
				{
					// event is single events registered by user in category = category
					let userEvent = database[category][event];
					let eventDetails = eventsDes[category][userEvent];

					// console.log(eventDetails);
					if(eventDetails) {
						eventDetails["eventCategory"] = category;
						data[events].push(eventDetails);
					} else {

						// console.log(eventDetails);
						// console.log(userEvent);		
					}
					

					

					// data[category].push(eventDetails);
				}
			}

			// console.log(data);
			return resolve(data);

		})
		.catch((err) => {

			// console.log("error: ", err);		// have to add
			// deploy shows error - error needs to be handled
			data = {
				success: false,
				message: `coould not fetch event description`,
				error: err
			};

			return reject(data);
		})

	})
}


function appGetRegisteredEvents(req, res, next) {

	let id = req.query.email;
	if(id === undefined || id === null) {

		return res.status(400).json({
			success: false,
			message: 'send id'
		});
	}

	id = id.replace(/\./g, ',');
	req.body.email = id;
	return next();
}


function getRegisteredEvents(req, res)
{
	let email = req.body.email;

	db.child(users + "/" + email + "/" + registeredEvents).once('value')
	.then((snapshot) => {

		let database = snapshot.val();

		if(!database) {

			return res.status(400).json({
				success: false,
				message: "No events registered",
				data: {
					events: []
				}
			});
		}

		let data = {};

		console.log(database);
		
		return matchEventDescription(database, data)
		.then((data) => {

			return res.status(200).json({
				success: true,
				data: data
			});
		})
		.catch((errData) => {
			return res.status(500).json(errData);
		})
	})
	.catch(() => {

		res.status(400).json({
			success: false,
			message: `Error while fetching user registered events`
		})
	})
}


//send time stamp of the server
function getTimestamp(req, res) {

	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify({
		timestamp: Date.now()
	}));
}

function appEventRegister(req, res, next) {

	let em = req.body.email;
	
	if(em === undefined || em === null) {

		res.status(400).json({
			success: false,
			message: "unauth, send id"
		});
	}

	em = em.replace(/\./g, ',');
	req.body.email = em;

	next();
}


// registeredEvents
// {
// 	managerial: ["a", "b"],
// 	programming: ["a", "b"]
// }
// register user for a events
function eventRegister(request, response)
{

	let eventName = request.body.eventName;
	let eventCategory = request.body.eventCategory;
	let email = request.body.email;

	if(eventName === undefined || eventCategory === undefined) {

		return response.status(400).json({
			success: false,
			message: `Invalid Parameters.\n Usage: eventName=event&eventCategory=category`
		});
	}

		
	// get previsouly registered events
	db.child(users + "/" + email + "/" + registeredEvents).once('value')
	.then((snapshot) => {

		let registeredEvent = snapshot.val();
		if(registeredEvent === undefined || registeredEvent === null)
		{
			registeredEvent = {};
		}

		// if not registred any events in that category
		if(registeredEvent[eventCategory] === undefined)
		{
			// create array fro category
			registeredEvent[eventCategory] = new Array();
			// push event into that category
			registeredEvent[eventCategory].push(eventName);
		}
		else
		{
			// if category already exists
			// push event to that category

			// if event already registered
			if(registeredEvent[eventCategory].indexOf(eventName) === -1)
			{
				registeredEvent[eventCategory].push(eventName);
			}
			else
			{
				return response.send({
					success: false,
					message: `already registered for ${eventName}`
				})
			}
		}

		// update user registered events
		db.child(users + "/" + email).update({
			[registeredEvents]: registeredEvent
		})
		.then(() => {

			return response.json({
				success:true,
				status: `Successfully registered for ${eventName}`
			});
		})
		.catch(() => {

			return response.json({
				success:false,
				message: "could not register!",
				error: err
			});
		});

		return;
	})
	.catch(() => {

		return response.json({
			success:false,
			message: "could not fetch user registered events",
			error: err
		});
	});
}


//return eventName
// {
// 	"managerial": ["a", "b"],
// 	"programming" : ["a","b"]
// }

function getEventNames(req, res)
{
	//optional - eventCategory
	if(req.query.eventCategory === undefined) {

		return db.child(events).once('value')
		.then((snapshot) => {

			let database = snapshot.val();
			let data = {};
			data[events] = new Array();

			for(let category in database)
			{
				for(let event in database[category])
				{

					let eventData = new Object;
					let eventName = database[category][event]["eventName"];

					eventData["eventName"] = eventName;
					eventData["eventCategory"] = category;

					data[events].push(eventData);
				}

			}
			let success = true;
			res.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');
			return res.json({success:success,data:data});
		})
	}
	else {

		let category = req.query.eventCategory;

		let node = events + "/" + category;

		return db.child(node).once('value')
		.then((snapshot) => {

			//console.log(snapshot.val());
			let database = snapshot.val();
			if(database === null)
			{
				return res.json({
					success: false,
					message:`${category} category doesn't exist`
				});
			}

			let data = {};
			data[events] = new Array();

			for(let event in database)
			{
				data[events].push({
					eventName: database[event].eventName,
					eventCategory: category
				});
			}

			var success = true;
			res.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');
			return res.json({success:success,data:data});
		})
	}
}

// {
// 	categories: ["a", "b"]
// }
// returns json object with array of categories
function getCategories(req, res) {
	return db.child(events).once('value')
	.then((snapshot) => {

		var data = {categories : []}
		for(var i in snapshot.val())		// get each category
		{
			let category = i;
			data.categories.push(category);
		}
		message = "Categories received";
		success = true;
		res.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');
		return res.json({message:message,success:success,data:data});
	})
	.catch((err) => {
		return res.send({
			success: false,
			message: `Error occured while sending categories\n Error: ${err}`
		});
	})
}

// to add a new events from the admin panel
function addEvent(req, res) {

	let eventData = req.body.eventData;	// accepts JSON event data
	// {
	// 	eventName: "string",
	// 	startTime: "string",
	// 	endTime: "string"
	//  category: "string"
	// 	others: "string"
	// }

	if(eventData === undefined) {

		return res.json({
			success: false,
			message: `Send event data as json data in $eventData`
		})
	}

	if(eventData["eventName"] === undefined || eventData["startTime"] === undefined || eventData["endTime"] === undefined || eventData["category"] === undefined) {

		return res.status(400).json({
			success:false,
			message: "eventName, startTime, endTime, category -- are compulsory parameters"
		})
	}

	eventData.startTime = parseInt(eventData.startTime);
	eventData.endTime = parseInt(eventData.endTime);

	// adding event to timeline
	// name, startTime and endTime
	db.child(`${events}/${eventData.category}/${eventData.eventName}`).set({

		eventName : eventData.eventName,
		startTime : eventData.startTime,
		endTime : eventData.endTime
	})
	.then((snapshot) => {
		return console.log(`Added ${eventData.eventName} to timeline succesfully`);
	}).catch((err) => {
		return res.send({
			success: false,
			message: `Error occured while adding event to the timeline\nError : ${err}`
		});
	})

	// adding event with full description to the node
	// with all the json data received



	let eventCategory =  eventData.category;
	delete eventData.category;

	db.child(`${eventDescription}/${eventCategory}/${eventData.eventName}`).set(eventData)
	.then((snapshot) => {

		console.log(`Added ${eventData.eventName} successfully`);

		return res.send({
			success: true,
			message: `Added ${eventData.eventName} successfully`
		});
	}).catch((err) => {
		return res.send({
			success: false,
			message: `Error occured when adding events to the description node\nError : ${err}`
		});
	})

}

// returns events description for single event
// or all the events of one category
function getEventDescription(req, res) {

	//	compulsory
	let categoryName = req.query.eventCategory;
	// optional parameter
	let eventName = req.query.eventName;

	if(categoryName === undefined)
	{
		return res.send({
			success: false,
			message: `Invalid Paramenters. \n Usage: eventCategory=category&[eventName=name]`
		});
	}

	if(eventName === undefined)
	{
		db.child(`${eventDescription}/${categoryName}`).once('value')
		.then((snapshot) => {

			if(snapshot.val() === null) {

				return res.send({
					success: false,
					message: `${categoryName} doesn't exist.`
				});
			}

			let database = snapshot.val();
			console.log(database);

			let data = {};
			data[events] = new Array();

			for(let event in database) {

				let eventData = database[event];
				eventData["eventCategory"] = categoryName;
				console.log(eventData);

				data[events].push(eventData);
			}

			res.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');
			return res.status(200).json({
				data: data,
				success: true
			});
		})
		.catch(() => {
			return res.json({
				success: false,
				message: `could not fetch description for category ${categoryName}`
			})
		})
	}
	else
	{
		db.child(`${eventDescription}/${categoryName}/${eventName}`).once('value')
		.then((snapshot) => {

			let data = snapshot.val();
			if(data === null) {
				return res.send({
					success: false,
					message: `${eventName} in ${categoryName} doesn't exist.`
				});
			}

			data["eventCategory"] = categoryName;
			res.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');
			return res.status(200).json({
				data: data,
				success: true
			})
		})
		.catch((err) => {
			return res.send({
				error: true,
				message: `Error in getting events details.\n Error: ${err}`
			});
		})

	}

}
// returns events startTime, endTime and name
function getEventTimeline(req, res) {

	return db.child(events).once('value')
	.then((snapshot) => {
		let database = snapshot.val();

		let data = {};
		data[events] = new Array();

		for(let category in database) {

			for(let event in database[category]) {

				let eventData = database[category][event];
				eventData["eventCategory"] = category;

				data[events].push(eventData);
			}
		}
		res.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');
		return res.status(200).json({
			success:true,
			data:data
		});
	})
	.catch((err) => {
		return res.status(500).send({
			success: false,
			message: `Error occured while getting events timeline\n Error : ${err}`
		})
	})

}















/*
*   /googleLogin
*   get:
*      params:
*           accessToken: string
*      description:
*           for user login
*      responses:
*           200:
*               description: user logged in
*               return:
*                   token: string
*           400:
*               description: error
*/
function googleLoginApp(req, res) {

	request(googleUrl + req.body.idToken, {json: true}, (err, response, body) => {

		if(err) {
			return res.status(400).json({
				success: false,
				error: err
			});
		}

		if(body.error_description !== undefined) {
			return res.status(401).json({
				success: false,
				message: 'empty/invalid body received',
				error: `unauthenticated request: ${body.error_description}`
			})
		}

		let email1 = body.email;
		let email = email1.replace(/\./g, ',');
		let email_child = "users/" + email;
		let ref = database.ref().child(email_child);

		let info;

		ref.once('value', (snapshot) => {

			if(snapshot.val()) {
				
				if(snapshot.val().onBoard === true) {

					info = {
						email:snapshot.val().email,
						name:snapshot.val().name,
						picture:snapshot.val().picture,
						onBoard:snapshot.val().onBoard,
						phone:snapshot.val().phone,
						college:snapshot.val().college,
						year:snapshot.val().year,
						admin:snapshot.val().admin
					};
				} else {
					
					info = {
						email:snapshot.val().email,
						name:snapshot.val().name,
						picture:snapshot.val().picture,
						onBoard:snapshot.val().onBoard,
						admin:snapshot.val().admin,
					};
				}

				return res.status(200).json({
					success: true,
					onBoard: snapshot.val().onBoard,
					information: info
				});
				
			} else {

				database.ref(email_child).set({
					onBoard: false,
					email: body.email,
					name: body.name,
					picture:body.picture,
					admin:false,
				});	
				
				info = {
					email:body.email,
					name:body.name,
					picture:body.picture,
					onBoard:false,
					admin:false,
				};

				return res.status(200).json({
					success: true,
					onBoard: false,
					information: info
				});
			}
		});
	});
}
function googleLogin(req, response) {

	request(googleUrl + req.body.idToken, {json: true}, (err, res, body) => {

		let data;
		if (err) {

			return res.status(400).json({success: false,err:err});
		}

		if (body.error_description !== undefined) {
			return response.status(401).json({
				message: "empty/invalid body received",
				error: 'unauthenticated request',
				success: false,
			});
		}

		let email1 = body.email;
		let email = email1.replace(/\./g, ',');
		let email_child = "users/" + email;
		let ref = database.ref().child(email_child);
		let picture = body.picture;
		ref.once('value', (snapshot) => {
			if (snapshot.val()) {

				/*	data = {
				onBoard: snapshot.val().onBoard,
				authenticatedRequest: true,
				isRegistered: true,
				body: body
			};*/

				if(snapshot.val().onBoard === true)
				{
					jwttoken = {
						email:snapshot.val().email,
						name:snapshot.val().name,
						picture:snapshot.val().picture,
						onBoard:snapshot.val().onBoard,
						phone:snapshot.val().phone,
						college:snapshot.val().college,
						year:snapshot.val().year,
						admin:snapshot.val().admin
					};
				} else {
					jwttoken = {
						email:snapshot.val().email,
						name:snapshot.val().name,
						picture:snapshot.val().picture,
						onBoard:snapshot.val().onBoard,
						admin:snapshot.val().admin,
					};
				}

				const token = jwt.sign(jwttoken, config.key);
				data={token:token};
				return response.status(200).json({
					onBoard:snapshot.val().onBoard,
					success: true, data:data
				});
			}
			else {
				database.ref(email_child).set({
					onBoard: false,
					email: body.email,
					name: body.name,
					picture:body.picture,
					admin:false,
				});

				jwttoken = {
					email:body.email,
					name:body.name,
					picture:body.picture,
					onBoard:false,
					admin:false,
				};

				const token = jwt.sign(jwttoken, config.key);
				data = { token: token };

				return response.status(200).json({
					onBoard:false,
					success: true, data:data
				});
			}
		});
	});
}











/*
*   /signUp
*   put:
*      body:
*           phone: Number
*           college: string
*           year: Number
*      description:
*           onboarding data
*      responses:
*           200:
*               description: data updated
*               return:
*                   status: boolean
*           400:
*               description: incomplete parameters
*           403:
*               description: user does not exist
*/
function signUpApp(req, res) {

	if (req.body.phone === undefined || req.body.college === undefined || req.body.year === undefined) {
		return res.status(400).json({
			success: false,err:'please pass valid/complete url parameters'
		});
	}

	if(req.body.email === undefined) {
		return res.status(400).json({
			success: false,
			message: "unauthenticated, email reqd",
		});
	}

	let email1 = req.body.email;
	let email = email1.replace(/\./g, ',');
	let ref = database.ref('users/' + email);

	ref.once('value', (snapshot) => {

		if(snapshot.val() === null || snapshot.val() === undefined) {

			return res.status(403).json({
				success: false,
				err:'user does not exist'
			});

		} else if (snapshot.val().onBoard === false) {
			
			ref.update({
				onBoard: true,
				phone: req.body.phone,
				college: req.body.college,
				year: req.body.year,
			});
			
			let info = {
				email:snapshot.val().email,
				name:snapshot.val().name,
				picture:snapshot.val().picture,
				onBoard: true,
				phone: req.body.phone,
				college: req.body.college,
				year: req.body.year,
				admin:snapshot.val().admin,
			}
			
			
			return res.status(200).json({
				success: true,
				message: "user onboarded",
				information: info
			});

		} else {
			
			return res.status(405).json({
				success:false,
				err:'not allowed, already onboarded'
			});
		
		}
	});
}

function signUp(req, response) {

	if (req.body.phone === undefined || req.body.college === undefined || req.body.year === undefined) {
		return response.status(400).json({
			success: false,err:'please pass valid/complete url parameters'
		});
	}
	else{
		let email = req.body.email;
		let ref = database.ref('users/'+email);

		ref.once('value', (snapshot) => {

			if(snapshot.val()===null || snapshot.val()===undefined){

				return response.status(403).json({
					success: false,
					err:'user does not exist'
				});

			}
			else if (snapshot.val().onBoard===false) {

				ref.update({
					onBoard: true,
					phone: req.body.phone,
					college: req.body.college,
					year: req.body.year,
				});

				jwttoken={
					email:snapshot.val().email,
					name:snapshot.val().name,
					picture:snapshot.val().picture,
					onBoard: true,
					phone: req.body.phone,
					college: req.body.college,
					year: req.body.year,
					admin:snapshot.val().admin,
				}
				const token = jwt.sign(jwttoken, config.key);
				let data={token:token};
				return response.status(200).json({
					success: true,
					message:"user onboarded",
					data:data
				});
			}
			else {

				return response.status(405).json({
					success:false,
					err:'not allowed, already onboarded'
				})

			}
		});
	}

}


// returns one new random fact everytime
function randomFact(request,response) {
	const numberOfLines = 8;
	const randomIndex = Math.floor(Math.random() * numberOfLines);

	database.ref('/facts/' + randomIndex).once('value')
	.then((snapshot) => {
		// console.log(snapshot.val());

		//response.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');

		let data={message:snapshot.val()};

		return response.status(200).json({
			success:true,
			data:data
		});
	})
	.catch(() => {

		return response.status(500).json({
			success: false,
			message: "could not fetch facts"
		})
	})
}


//<------Returning the array of all the videos------>
//Returns the array of videos containing title and url of a video.
function video(request,response) {

	return database.ref('/videos').once('value')
	.then((snapshot) => {

		// browser caching - 1hr, server caching - 2hr
		response.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');
		let data=snapshot.val();
		return response.status(200).json({success:true,data:data});
	})
	.catch((err) => {
		return response.send({
			success: false,
			message: `Error occured while fetching videos\n Error : ${err}`
		})
	})
}

// <-----Adding query to database------->
// only add newly asked query to the database, if query will be null then it will return the empty query message else query will be added to database.
function addQuery(request,response){
	const query = request.body.text;
	const email=request.body.email;

	console.log(email);
	console.log(query);
	let date=Date.now();
	const email_child='queries/'+email;
	if(query !== undefined)
	{
		database.ref().child(email_child).child(date).set({
			text:query,
			id:date,
			status:true,
		});
		response.status(200).json({
			success:true,
			message : "query successfully added"
		});
	}
	else
	{
		response.status(400).json({
			success:false,
			message: "empty query"
		})
	}
}

// returns query to admin
function getQuery(req, res) {

	db.child(queries).once('value')
	.then(function (snapshot) {

		let userQueries = snapshot.val();

		let data = {};
		data[queries] = new Array();

		for(user in userQueries) {

			let obj = {};

			email = user.replace(/,/g, '.');

			obj["email"] = email;
			obj["query"] = new Array();

			for(query in userQueries[user]) {

				obj["query"].push(userQueries[user][query]);
			}
			data[queries].push(obj);
		}

		return res.status(200).json({
			success: true,
			data: data
		});
	})
	.catch(() => {

		return res.status(500).json({
			error: "error getting queries",
			success: false
		})
	})

}


///////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

	                //NOTIFICATIONS

////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

function addNotification(req,res){
	if(req.body.notif === undefined) {
		return res.status(400).json({
			success:false,
			error:'empty notification'
		});
	}
	let notif=req.body.notif;
	let date=`${Date.now()}`;
	let node=9999999999999-date;
	db.child('notifications').child(node).set({
		time:date,
		notif:notif
	});
	res.status(200).json({
		success:true,
		message:'notification added'
	});
}

function getNotifications(req,res){
	let data=db.child('notifications').once('value').then(snapshot => {
		//console.log(snapshot.val());
		let notifs = snapshot.val();

		let data = {};
		data[notifications] = new Array();

		for(not in notifs) {

			let obj = {};

			obj["notif"] =notifs[not]['notif'];
			obj["time"] = notifs[not]['time'];

			data[notifications].push(obj);
		}
		return res.json({
			success:true,
			data:data
		});
	}).catch(() => {

		return res.status(500).json({
			error: "error getting notifications",
			success: false
		})
	})
}







///////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

	                // CONTACT US

////////////////////////////////////////////////////////
////////////////////////////////////////////////////////



function getContacts(req, res) {

	db.child('/contacts').once('value')
	.then((snapshot) => {

		let database = snapshot.val();

		let data = {};
		data["contacts"] = new Array();

		for(let category in database) {

			let type = {};
			type["section"] = category;
			type["people"] = new Array();

			for(let person in database[category]) {

				type["people"].push(database[category][person]);
			}

			data["contacts"].push(type);
		}

		res.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');
		return res.status(200).json({
			data: data,
			success: true
		});
	})
	.catch(() => {

		return res.status(500).json({
			success: false,
			message: 'could not fetch contacts'
		});
	})

}

///////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

	                // TIMESTAMP

////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

// gives next 1 hour events
function getNextEvents(req, res) {

	let timestamp = req.query.timestamp;

	if(timestamp === undefined) {

		return res.status(400).json({
			success: false,
			message: "send timestamp"
		})
	}

	timestamp = parseInt(timestamp);

	db.child(events).once('value')
	.then((snapshot) => {

		let database = snapshot.val();

		let data = {};
		data[events] = new Array();

		for(let category  in database) {

			for(let event in database[category]) {

				let startTime = database[category][event].startTime;
				let endTime = database[category][event].endTime;

				startTime = parseInt(startTime);
				endTime = parseInt(endTime);

				database[category][event]["eventCategory"] = category;

				if(timestamp >= startTime && timestamp <= endTime) {

					let obj = {};
					obj["status"] = "LIVE!";
					obj["eventDetails"] = database[category][event];

					data[events].push(obj);
				}
				else if(startTime <= timestamp + 432000000 && startTime >= timestamp) {

					let obj = {};
					obj["status"] = "Upcoming";

					obj["eventDetails"] = database[category][event];
					data[events].push(obj);
				}
			}
		}


		data["events"].sort(sortOrder("startTime"));

		// browser - 10 min, server - 15 min
		res.set('Cache-Control', 'public, max-age=600 , s-maxage=900');
		return res.status(200).json({
			success:true,
			data: data
		})
	})
	.catch(() => {
		return res.status(500).json({
			success: false,
			message: "could not fetch events"
		})
	})

}

function sortOrder(prop) {

	return function(a, b) {

		if(a["eventDetails"][prop] > b["eventDetails"][prop]) {
			return 1;
		}
		else if(a["eventDetails"][prop] < b["eventDetails"][prop]) {
			return -1;
		}
		return 0;

	}
}

/**
	* Function to get section wise sponsors
	* Called by get on '/sponsor' route
*/
function getSponsors(req, res) {

	db.child(sponsorNode).once('value')
	.then((snapshot) => {

		let database = snapshot.val();

		let data = {};
		data["sponsors"] = new Array();

		for(let sponsorSection in database) {

			let type = {};
			type["sponsorSection"] = sponsorSection;
			type["sponsors"] = new Array();

			for(key in database[sponsorSection]) {

				type["sponsors"].push(database[sponsorSection][key]);
			}
			data["sponsors"].push(type);

		}
		res.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');
		return res.status(200).json({
			data: data,
			success: true
		});
	})
	.catch(() => {

		return res.status(500).json({
			success: false,
			message: 'could not fetch sponsors'
		});
	})
}

function sponsorStatic(req, res)
{
	let data = {
		"data": {
			"paisa": [
				{
					"sponsorSection": "Associate Sponsors",
					"sponsors": [
						{
							"imageUrl": "https://i.ibb.co/rbytcLS/2-IIM-Original-Logo.png",
							"targetUrl": "https://www.2iim.com/"
						},
						{
							"imageUrl": "https://www.stbaldricks.org/photo/event/6249/2019/large",
							"targetUrl": "https://ihsmarkit.com"
						},
						{
							"imageUrl": "https://pbs.twimg.com/media/CFWHUNrUMAAlDfz.jpg",
							"targetUrl": "https://www.swiggy.com/"
						}
					]
				},
				{
					"sponsorSection": "Intern Partner",
					"sponsors": [
						{
							"imageUrl": "https://i.ibb.co/kSmtpGr/HI-Logo-PNG.png",
							"targetUrl": "https://www.hellointern.com/"
						}
					]
				},
				{
					"sponsorSection": "Media Partner",
					"sponsors": [
						{
							"imageUrl": "https://upload.wikimedia.org/wikipedia/commons/2/29/The_Pioneer_logo.jpg",
							"targetUrl": "https://www.dailypioneer.com/"
						}
					]
				}
			]
		},
		"success": true
	};

	res.status(200).json(data)
}

/**
	* Function to add a new sponsor in the given section
	* required: sponsor image url, sponsor section
	*/
function addSponsor(request, response) {
	const imageUrl = request.body.sponsor.imageUrl;
	const sponsorSection = request.body.sponsor.sponsorSection;

	const sponsorChild = sponsorNode + '/' + sponsorSection;

	let emptyFields = new Array();

	if(imageUrl === undefined) {
		emptyFields.push('imageUrl');
	}
	if(sponsorSection === undefined) {
		emptyFields.push('sponsorSection');
	}
	if(emptyFields.length === 0)
	{
		let sponsor = request.body.sponsor;
		delete sponsor.sponsorSection;

		db.child(sponsorChild).push(sponsor);
		response.status(200).json({
			success:true,
			message : "Sponsor successfully added"
		});
	}
	else
	{
		const errorMessage = 'Following attributes found empty : ' + emptyFields;
		response.status(400).json({
			success:false,
			message: errorMessage
		});
	}
}


// function to remove a addQuery
function removeQuery(req, response) {

	const id = req.body.id;
	let email=req.body.queryEmail;

	if(id === undefined || email === undefined) {
		return response.status(400).json({
			success: false,
			message: "Usage: queryEmail=queryEmail&id=queryId"
		});
	}
	email = email.replace(/\./g, ',');
	let data={};
	const email_child='queries/'+email;

	db.child(email_child).child(id).update({
		status:false,
	})
	.then(() => {
		return response.status(200).json({
			success:true,
			message : "query successfully deleted"
		});
	})
	.catch(() => {
		return response.status(500).json({
			success: false,
			message: "error updating query status"
		})
	})
}


//////////////////////////////
		// LECTURES
/////////////////////////////

function getLectures(req, res) {

	db.child('/lectures').once('value')
	.then((snapshot) => {

		let allLectures = snapshot.val();

		let data = {};
		data["lectures"] =new Array();

		for(lecture in allLectures) {

			data["lectures"].push(allLectures[lecture]);
		}

		res.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');
		return res.status(200).json({
			success:true,
			data: data
		})
	})
	.catch(() => {
		return res.status(500).json({
			success: false,
			message: 'could not fetch lectures'
		})
	})

}



///////////////////////
////Devlopers/////////


// only for localhost - not deployed
// function addDeveloper(req, res) {

// 	let name = req.body.name;
// 	let link = req.body.link;
// 	let year = parseInt(req.body.year);

// 	db.child('about').push({
// 		name: name,
// 		link: link,
// 		year: year
// 	})
// 	.then(() => {
// 		return res.status(200).json({
// 			success: true,
// 			message: "developer added"
// 		})
// 	})
// 	.catch(() => {
// 		return res.status(500).json({
// 			success: false,
// 			message: "could not add"
// 		})
// 	})
// }

function getDeveloper(req, res) {

	db.child('about').once('value')
	.then((snapshot) => {

		let data = {devs: []};

		let devs = snapshot.val();
		for(let key in devs) {

			data["devs"].push(devs[key]);
		}

		data["devs"].sort((a, b) => {

			// if((parseInt(b["year"]) - parseInt(a["year"])) === 0) {

			// 	if(a["name"] < b["name"]) {
			// 		return -11;
			// 	}
			// 	else {
			// 		return 0
			// 	}
			// }
			return parseInt(b["year"]) - parseInt(a["year"]);
		})
		res.set('Cache-Control', 'public, max-age=3600 , s-maxage=7200');
		return res.status(200).json({
			success: true,
			data: data
		})
	})
	.catch(() => {

		return res.status(500).json({
			success: false,
			message: "error fetching developers"
		})
	})

}

exports.api = functions.https.onRequest(app);
