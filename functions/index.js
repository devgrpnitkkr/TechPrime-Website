const functions = require('firebase-functions');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const isAuthenticated = require('./middlewares/auth');
const config = require('./config');

admin.initializeApp();
let database = admin.database();
const db = database.ref();


// Hard-Coded String
let events = "events";
let eventDescription = "eventDescription";
let userRegistrations = "userRegistrations";
let users = "users";
let registeredEvents = "registeredEvents";
const googleUrl = 'https://www.googleapis.com/plus/v1/people/me?access_token=';

// express
const app = express();
app.use(bodyParser.urlencoded({extended:false}));




// routes
app.get('/events', getEventNames);
app.get('/categories', getCategories);
app.get('/events/description', getEventDescription);
app.get('/events/timeline', getEventTimeline);
app.post('/events', isAuthenticated, addEvent);
app.get('/user/event', isAuthenticated, getRegisteredEvents);
app.put('/user/event', isAuthenticated, eventRegister);




function getRegisteredEvents(req, res)
{
	let email = req.body.email;

	db.child(users + "/" + email + registeredEvents).once('value')
	.then((snapshot) => {

		let database = snapshot.val();
		let data = {"registeredEvents": []};

		db.child(eventDescription).once('value')
		.then((snap) => {
	
			let eventsDes = snap.val();

			for(let category in database)
			{
				for(let event in category)
				{
					// event is single events registered by user in category = category
					let userEvent = database.category.event;
					let eventDetails = eventDes.category.event;
					
					data.registeredEvents.push(eventDetails);
				}
			}
		})

		data.success = true;
		res.send(data);
	})
	.catch((err) => {

		res.send({
			success: false,
			message: `Error while fetching user registered events`
		})
	})
}


// registeredEvents
// {
// 	managerial: ["a", "b"],
// 	programming: ["a", "b"]
// }
// register user for a events
function eventRegister(request, response) 
{

	let eventName = request.query.event;
	let eventCategory = request.query.eventCategory;
	let email = request.body.email;


	let node = userRegistrations + "/" + eventName;

		// get previsouly registred events
		db.child(users + "/" + email + "/" + registeredEvents).once('value')
		.then((snapshot) => {

			let registeredEvent = snapshot.val();
			if(registeredEvent == 'undefined' || registeredEvent == null)
			{
				registeredEvent = {};
			}

			// if not registred any events in that category
			if(registeredEvent.eventCategory == 'undefined')
			{
				// create array fro category
				registeredEvent.eventCategory = new Array();
				// push event into that category
				registeredEvent.eventCategory.push(eventName);
			}
			else
			{
				if(registeredEvent.eventCategory.indexOf(eventName) == -1)
				{
					// if category already exists
					// push event to that category
					registeredEvent.eventCategory.push(eventName);
				}
			}

			// update user registered events
			db.child(users + "/" + email).update({
				"registeredEvents": registeredEvent
			})
			.then(() => {
				response.json({
					status: `Successfully registered for ${eventName}`
				});
			})
			.catch((err) => {
				console.log(err);
				response.json({
					message: "Could not Register!",
					error: err
				});
			})
		})
		.catch((err) => {
			console.log(err);
			response.json({
				message: "could not fetch user registered events",
				error: err
			});
		})
}

// change "." to "," in user email
function getEmail(body)
{
	let email = body.emails[0].value;
	let formattedEmail = email.replace(/\./g,',');
	return formattedEmail;
}

//return eventName
// {
// 	"managerial": ["a", "b"],
// 	"programming" : ["a","b"]
// }

function getEventNames(req, res) 
{

	//optional - eventCategory

	if(req.query.eventCategory == null) {

		return db.child(events).once('value')
		.then((snapshot) => {

			var database=snapshot.val();

			var data = {};
			for(var category in database)
			{
				data.category = new Array();
				for(let event in database.category)
				{
					let eventName = database.category.event.name;
					data.category.push(eventName);
				}
			}
			data.success = true;
			return res.send(data);
		})
	}
	else {

		let category = req.query.eventCategory;
		let node = events + "/" + category;
		return db.child(node).once('value')
		.then((snapshot) => {

			if(snapshot == null)
			{
				return res.send({
					success: false,
					message : "No such category exist"
				});
			}

			let database = snapshot.val();
			let data = {};
			data.category = new Array();

			for(let event in database)
			{
				data.category.push(event.name);
			}

			data.success = true;
			return res.send(data);
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
		data.message = "Categories received";
		data.success = true;
		return res.json(data);
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

	// adding event to timeline 
	// name, startTime and endTime
	db.child(`${events}/${eventData.category}/${eventData.eventName}`).set({

		name : eventData.eventName,
		startTime : eventData.startTime,
		endTime : eventData.endTime
	})
	.then((snapshot) => {
		console.log(`Added ${eventData.eventName} to timeline succesfully`);
	}).catch((err) => {
		res.send({
			success: false,
			message: `Error occured while adding event to the timeline\nError : ${err}`
		});
	})

	// adding event with full description to the node 
	// with all the json data received
	db.child(`${eventDescription}/${eventData.category}/${eventData.eventName}`).set(eventData)
	.then((snapshot) => {
		return res.send({
			success: true,
			message: `Added ${snapshot.val()} successfully`
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

	if(eventCategory == null)
	{
		return res.send({
			success: false,
			message: `Invalid Paramenters.\nUsage: eventCategory=category&[eventName=name]`
		});
	}

	if(eventName == null)
	{
		db.child(`${eventDescription}/${categoryName}`).once('value')
		.then((snapshot) => {
			if(snapshot == null) {

				return res.send({
					success: false,
					message: `${eventCategory} does't exist.`
				});
			}

			snapshot.success = true;
			return res.send(snapshot.val());
		})
	}
	else
	{
		db.child(`${eventDescription}/${eventCategory}/${eventName}`).once('value')
		.then((snapshot) => {
			if(snapshot == null) {
				return res.send({
					success: false,
					message: `${eventName} in ${eventCategory} doesn't exist.`
				});
			}
			snapshot.success = true;
			return res.send(snapshot.val())
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
		return res.send(snapshot.val())
	})
	.catch((err) => {
		return res.send({
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
app.post('/googleLogin', (req, response) => {
    request(googleUrl + req.body.accessToken, {json: true}, (err, res, body) => {
        let data;
        if (err) {
            return res.status(400).json({success: false, err: err});
        }
        if (body.error != null) {
            return response.json({
                success: false, err: 'unauthenticated request'
            });
        }

        let email1 = body.emails[0].value;
        let email = email1.replace(/\./g, ',');
        let email_child = "users/" + email;
        let ref = database.ref().child(email_child);

        ref.once('value', (snapshot) => {
            if (snapshot.val()) {
                    data = {
                        onBoard: snapshot.val().onBoard,
                        authenticatedRequest: true,
                        isRegistered: true,
                        body: body
                    };

                    const token = jwt.sign(data, config.key, {expiresIn: "12h"});

                    response.status(200).json({
                        success: true, token: token
                    });
            }
            else {
                database.ref(email_child).set({
                    onBoard: false,
                    email: body.emails[0].value,
                    name: body.name.givenName + " " + body.name.familyName,
                });
                data = {
                    onBoard: false,
                    authenticatedRequest: true,
                    isRegistered: false,
                    body: body
                };

                const token = jwt.sign(data, config.key, {expiresIn: "12h"});
                response.status(200).json({
                    success: true, token: token
                });
            }
        });
    });
});

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
app.put('/signUp', isAuthenticated, (req, response) => {
    if (req.body.phone === undefined || req.body.college === undefined || req.body.year === undefined) {
        return response.status(400).json({
            success: false, err: 'please pass valid/complete url parameters'
        });
    }
    else {
        let email = req.body.email;
        let ref = database.ref('users/'+email);

        ref.once('value', function (snapshot) {
            if (snapshot.val()) {
                ref.update({
                    onBoard: true,
                    phone: req.body.phone,
                    college: req.body.college,
                    year: req.body.year,
                });
                response.status(200).json({
                    success: true
                });
            }
            else {
                response.status(403).json({
                    success: false,
                    err: 'user does not exist'
                })
            }
        });
    }
});


















exports.api = functions.https.onRequest(app);