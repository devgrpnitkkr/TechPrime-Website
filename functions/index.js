const functions = require('firebase-functions');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const request = require('request');
admin.initializeApp();
let database = admin.database();
const db = database.ref();


// Hard-Coded String
let events = "events";
let eventDescription = "eventDescription";
let userRegistrations = "userRegistrations";
let users = "users";
let registeredEvents = "registeredEvents";


// to add a new events from the admin panel
exports.addEvent = functions.https.onRequest((req,res) => {


	let eventData = req.body.eventData;	// accepts JSON event data
	// {
	// 	eventName: "string",
	// 	startTime: "string",
	// 	endTime: "string"
	//  category: "string"
	// 	others: "string"
	// }

	// let eventCategory = eventData.category;
	// let eventName = eventData.eventName;
	// let startTime = even.startTime;
	// let endTime = req.body.endTime;
	// let eventDescription = req.body.eventDescription;

	// adding eveent to timeline 
	// name, startTime and endTime
	db.child(`${events}/${eventData.category}/${eventData.eventName}`).set({

		name : eventData.eventName,
		startTime : eventData.startTime,
		endTime : eventData.endTime
	})
	.then((snapshot) => {
		console.log(`Added ${eventData.eventName} to timeline succesfully`);
	}).catch((err) => {
		res.send(`Error occured while adding event to the timeline\nError : ${err}`);
	})

	// adding event with full description to the node 
	// with all the json data received
	db.child(`${eventDescription}/${eventData.category}/${eventData.eventName}`).set(eventData)
	.then((snapshot) => {
		return res.send(`Added ${snapshot.val()} successfully`);
	}).catch((err) => {
		return res.send(`Error occured when adding events to the description node\nError : ${err}`);
	}) 
})


// returns json object with array of categories
exports.getCategories = functions.https.onRequest((req, res) => {

	return db.child(events).once('value')
	.then((snapshot) => {

		var data = {categories : []}
		for(var i in snapshot.val())		// get each category
		{
			let category = i;
			data.categories.push(category);
		}
		data.message = "Categories received";
		return res.send(data);
	})
	.catch((err) => {
		return res.send(`Error occured while sending categories\n Error: ${err}`);
	})
})


//return eventName
// {
// 	"managerial": ["a", "b"],
// 	"programming" : ["a","b"]
// }
exports.getEventNames = functions.https.onRequest((req,res) => {

	if(req.query.category == 'all')
	{
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
			return res.send(data);
		})
		.catch((err) => {
			return res.send(`Error occured while getting categories.\n Error :  ${err}`);
		})
	}
	else if(req.query.category == 'one')
	{
		let category = req.query.eventCategory;
		return db.child(`${events}/${category}`).once('value')
		.then((snapshot) => {

			if(snapshot == null)
			{
				return res.send({
					message : "No such category exist"
				});
			}
			return res.send(snapshot);
		})
	}
	else {
		return res.send({
			message: `Invalid parameters.\nUsage : category=[all | one] & [eventCategory=category]`
		});
	}
})


// returns events description for single event
// or all the events of one category
exports.getEventDescription = functions.https.onRequest((req,res) => {

	let categoryName = req.query.eventCategory;
	let eventName = req.query.eventName;

	if(eventCategory == null)
	{
		return res.send({
			message: `Invalid Paramenters.\nUsage: eventCategory=category&[eventName=name]`
		});
	}

	if(eventName == null)
	{
		db.child(`${eventDescription}/${categoryName}`).once('value')
		.then((snapshot) => {
			if(snapshot == null) {

				return res.send({
					message: `${eventCategory} does't exist.`
				});
			}

			return res.send(snapshot.val());
		})
	}
	else
	{
		db.child(`${eventDescription}/${eventCategory}/${eventName}`).once('value')
		.then((snapshot) => {
			if(snapshot == null) {
				return res.send({
					message: `${eventName} in ${eventCategory} doesn't exist.`
				});
			}
			return res.send(snapshot.val())
		})
		.catch((err) => {
			return res.send({
				message: `Error in getting events details.\n Error: ${err}`
			});
		})
		
	}
})


// returns events startTime, endTime and name
exports.getEventTimeline = functions.https.onRequest((req,res) => {

	return db.child(events).once('value')
	.then((snapshot) => {
		return res.send(snapshot.val())
	})
	.catch((err) => {
		return res.send({
			message: `Error occured while getting events timeline\n Error : ${err}`
		})
	})
})


// register user for a events
exports.eventRegister = functions.https.onRequest((request, response) => {
	let access_token = request.query.accessToken;
	let eventName = request.query.event;
	let eventCategory = request.query.eventCategory;

	if(access_token == null || eventName == null || eventCategory == null)
	{
		response.json({
			"error":"Invalid Parameters.",
			"message": "Usage: accessToken=token&event=eventName&eventCategory=category"
		});
	}

	// validating access token
	request('https://www.googleapis.com/plus/v1/people/me?access_token='+access_token, { json: true }, (err, res, body) => {
		let data;
		if(err)
		{
			return console.log("Error", err);
		}

		// if error in token
		if(body.error != null)
		{
			console.log(body.error);
			console.log('error in accessToken');
			data={
				authenticatedRequest:false,
			};
			response.json(data);
		}

		// remove . from email
		let email = getEmail(body);
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
				// if cactegory already exists
				// push event to that category
				registeredEvent.eventCategory.push(eventName);
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
	});
});

// change "." to "," in user email
function getEmail(body)
{
	let email = body.emails[0].value;
	let formattedEmail = email.replace(/\./g,',');
	return formattedEmail;
}


















































// Gaurav Aryan Sushi 


//login start
exports.googleLogin = functions.https.onRequest(function(req,response){
	let accToken = req.query.accessToken;
	request('https://www.googleapis.com/plus/v1/people/me?access_token='+accToken, { json: true }, (err, res, body) => {
		let data;
		if(err)
		{
			return console.log(err);
		}
		console.log(body);
		if(body.error != null)
		{
			console.log('error in accessToken');
			data={
				authenticatedRequest:false,
			};
			return response.json(data);
		}

		let email1 = body.emails[0].value;
		let email = email1.replace(/\./g,',');
		console.log(email);
		let email_child = "users/"+email;
		let ref = database.ref();

		ref.once('value',function(snapshot){
			if(snapshot.hasChild(email_child))
			{
				console.log('present');
				let reff = database.ref(email_child);
				let onB;
				reff.once('value',function(snap)
				{
					console.log(snap.val().onBoard);
					onB=snap.val().onBoard;
					console.log(onB);
					data={
						onBoard:onB,
						authenticatedRequest:true,
						isRegistered:true,
						body:body
					};
					const token = jwt.sign( data ,"abab", { expiresIn: "12h"});
					response.json(token);
				});
				console.log('onboard is'+onB);
			}
			else
			{
				database.ref(email_child).set({
					onBoard:false,
					email: body.emails[0].value,
					name: body.name.givenName+" "+body.name.familyName,
				});
				console.log('not present');
				data={
					onBoard:false,
					authenticatedRequest:true,
					isRegistered:false,
					body:body
				};
				response.json(data);
			}
		});
	});
});
//login end


let express = require('express');
let bodyParser = require('body-parser');

let app = express();
app.use(bodyParser.urlencoded({extended:false}));


// middleware start
function isAuthenticated(req , res , next) {
	if(req.body.accessToken === undefined || req.body.accessToken === '') res.json({error: true});
	else {
		jwt.verify(req.body.accessToken, "abab", (err, data) => {
			if (err) {
				res.json({error: true});
			}
			else
			{
				if (data.error != null) {
					return res.json({
						authenticatedRequest: false,
					});
				}
				else {
					let email = data.body.emails[0].value;
					let name = data.body.name.givenName+" "+data.body.name.familyName;
					console.log(email);
					req.body.email1 = email;
					req.body.name = name;
					next();
				}
			}
		});
	}
}
// middleware end


app.post('/', isAuthenticated ,function(req,response)
{
	if (req.body.phone === undefined || req.body.college === undefined || req.body.year === undefined) {
		return response.send('please pass valid/complete url parameters');
	}
	else
	{
        //console.log(req.body.email1);
        //console.log(req.body.name);
        let email1 = req.body.email1;
        let email = email1.replace(/\./g, ',');
        let ref = database.ref('users/');
        let email_child = "users/"+email;
        ref.once('value', function (snapshot) {
        	console.log(snapshot.val());
        	if (snapshot.hasChild(email))
        	{
        		console.log('present');
        		database.ref(email_child).update({
        			onBoard: true,
        			phone: req.body.phone,
        			college: req.body.college,
        			year: req.body.year,
        		});
        		response.send('database updated');
        	}
        });
    }
});

exports.signUp = functions.https.onRequest(app);