const functions = require('firebase-functions');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const request = require('request');
admin.initializeApp();
let database = admin.database();

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





const db = admin.database().ref();

exports.addEvent = functions.https.onRequest((req,res) => {

    let eventCategory = req.body.eventCategory;
    let eventName = req.body.eventName;
    let startTime = req.body.startTime;
    let endTime = req.body.endTime;
    let eventDescription = req.body.eventDescription;

    db.child(`events/${eventCategory}/${eventName}`).set({

        name : eventName,
        startTime : startTime,
        endTime : endTime
    })
    .then((snapshot) => {
        console.log('done')
    }).catch((err) => {
        res.send(err)
    })

    db.child(`eventDescription/${eventCategory}/${eventName}`).set({

        name : eventName,
        eventDescription : eventDescription,
        startTime : startTime,
        endTime : endTime
    }).then((snapshot) => {
        return res.send(snapshot.val())
    }).catch((err) => {
        return res.send(err)
    }) 
})

exports.getCategories = functions.https.onRequest((req,res) => {

    return db.child('events').once('value')
    .then((snapshot) => {
        
        var data = {categories : []}
        for(var i in snapshot.val())
        {
            var obj = {};
            obj.name = i;
            data.categories.push(obj);
        }
        return res.send(data);
    })
    .catch((err) => {
        return res.send(err);
    })
})

exports.getEventNames = functions.https.onRequest((req,res) => {

    if(req.query.category == 'all')
    {
        return db.child('events').once('value')
        .then((snapshot) => {
            
            var data = {events : []}
            var database=snapshot.val();
            for(var category in database)
            {
                for(let event in database[category])
                {
                    var obj = {};
                    obj.category = category,
                    obj.name = database[category][event].name;
                    data.events.push(obj);
                }
            }

            return res.send(data);
        })
        .catch((err) => {
            return res.send(err);
        })
    }
    else if(req.query.category == 'one')
    {
        let cat = req.query.eventCategory;
        return db.child(`events/${cat}`).once('value')
        .then((snapshot) => {

            return res.send(snapshot);
        })
    }
    else {
        return res.send("Invalid parameters.");
    }
})

exports.getEventDescription = functions.https.onRequest((req,res) => {

    if(req.query.events == 'all')
    {
        return db.child('eventDescription').once('value')
        .then((snapshot) => {

            var data = {eventDesciption : []}
            var database = snapshot.val();

            for(var category in snapshot.val()){

                var events=database[category];

                for(var event in events)
                {
                    var obj = {};
                    obj.category = category;
                    obj.name = events[event].name;
                    obj.eventDescription = events[event].eventDescription;
                    obj.startTime = events[event].startTime;
                    obj.endTime = events[event].endTime;
                    data.eventDesciption.push(obj);
                }
            }
            return res.send(data);
        })
        .catch((err) => {
            return res.send(err)
        })
    }
    else if(req.query.events == 'one')
    {
        let eventCategory = req.query.eventCategory
        let eventName = req.query.eventName

        if(eventCategory == null || eventName == null) {
            res.send("Insufficient parameters.")
        }

        db.child(`eventDescription/${eventCategory}/${eventName}`).once('value')
        .then((snapshot) => {
            if(snapshot == null) {
                return res.send("Event Doesn't Exist.");
            }
            return res.send(snapshot.val())
        })
        .catch((err) => {
            return res.send(err)
        })
    }
    else if(req.query.events == 'cat')
    {
        let categoryName = req.query.eventCategory;
        if(categoryName == null)
        {
            return res.send("Insufficient Parameters.");
        }

        db.child(`eventDescription/${categoryName}`).once('value')
        .then((snapshot) => {
            if(snapshot == null) {
                return res.send("Invalid Category.");
            }

            return res.send(snapshot.val());
        })
    }
    
})

exports.getEventTimeline = functions.https.onRequest((req,res) => {

    return db.child('events').once('value')
    .then((snapshot) => {
        return res.send(snapshot.val())
    })
    .catch((err) => {
        return res.send(err)
    })
})


exports.eventRegister = functions.https.onRequest((req, response) => {
    let access_token = req.query.accessToken;
    let eventName = req.query.event;

    if(access_token == null || eventName == null)
    {
        response.json({"error":"Invalid Parameters. Need access token and event Name."});
    }

    
    request('https://www.googleapis.com/plus/v1/people/me?access_token='+access_token, { json: true }, (err, res, body) => {
        let data;
        if(err)
        {
          return console.log(err);
        }
    
        if(body.error != null)
        {
            console.log(body.error);
            console.log('error in accessToken');
            data={
                authenticatedRequest:false,
            };
            response.json(data);
        }
        
        let email = getEmail(body);

        let node = "userRegistrations/"+ eventName;
        

        db.child(`${node}`).push(email);

        db.child("users/" + email + "/registeredEvents").once('value')
        .then((snapshot) => {
            
            let eventString = snapshot.val();
            let newEventString = null;
            
            if(eventString == null)
            {
                newEventString = eventName;
            }
            else
            {
                newEventString = eventString + "," + eventName;
            }

        	db.child("users/" + email).update({
        		"registeredEvents": newEventString
            })
            .then(() => {
                response.json({status:"Successfully registered for "+eventName});
            })
            .catch((err) => {
                console.log(err);
                response.json({error:"Could not Register!"});
            })
            
            
        })
        .catch((err) => {
            console.log(err);
            response.json({"error":err});
        })
    });
});

function getEmail(body)
{
    let email = body.emails[0].value;
    let formattedEmail = email.replace(/\./g,',');
    return formattedEmail;
}