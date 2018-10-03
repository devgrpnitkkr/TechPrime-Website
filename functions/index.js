const functions = require('firebase-functions');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

admin.initializeApp();
let database = admin.database();

//login start
exports.googleLogin = functions.https.onRequest(function(req,response){
    let accToken = req.query.accessToken;
    const request = require('request');
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



//<--------Random Fact Generation---------->
//Generates random fact about techspardha.
exports.randomFact = functions.https.onRequest((request , response) => {
    const numberOfLines = 8;
    const randomIndex = Math.floor(Math.random() * numberOfLines);
    database.ref('/facts/' + randomIndex).on('value',function(snapshot){
      console.log(snapshot.val());
      response.set('Cache-Control', 'public, max-age=300 , s-maxage=600');
      response.status(401).json({
        message : snapshot.val()
      });
    });
  });
  
  
  //<------Returning the array of all the videos------>
  //Returns the array of videos containing title and url of a video.
  exports.getVideo = functions.https.onRequest((request , response) => {
    let items = [];
    database.ref('/videos').on('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        items.push(childSnapshot.key,{
          title : childSnapshot.val().title,
          url : childSnapshot.val().url
        });
      });
    });
    response.set('Cache-Control', 'public, max-age=300 , s-maxage=600');
    response.status(401).json(items);
  }); 
  
  
  
  // <-----Adding query to database------->
  // only add newly asked query to the database, if query will be null then it will return the empty query message else query will be added to database. 
  exports.addQuery = functions.https.onRequest((request,response)=>{
    const query = request.query.text;
    const email1=req.body.email1;
    const email=email1.replace(/\./g, ',');
    const email_child='queries/'+email;
    if(query!==null)
    {
      database.ref().child(email_child).push(query);
      response.set('Cache-Control', 'public, max-age=300 , s-maxage=600');
      response.status(401).json({
        message : "query successfully added"
      });
    }
    else
    {
      response.status(500).json({
        message: "empty query"
      })
    }
  });
  