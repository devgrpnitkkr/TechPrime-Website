const functions = require('firebase-functions');
const admin = require('firebase-admin');
const firebase = require('firebase');
admin.initializeApp();
var config = {
    apiKey: "AIzaSyDbSzyKjE4a_ErNwWrM8zkWraN5yQ-z1Og",
    authDomain: "loginapi123.firebaseapp.com",
    databaseURL: "https://loginapi123.firebaseio.com",
    projectId: "loginapi123",
    storageBucket: "loginapi123.appspot.com",
    messagingSenderId: "223911079496"
  };
  firebase.initializeApp(config);
  var database=firebase.database();
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
exports.sayHi = functions.https.onRequest(function(request, res){
  res.send("worfdsfjdfking!");
});

/*function googleLogin()
{
    console.log('tried popup');
    var provider=new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then(function(result){
      var token=result.credential.accessToken;
      console.log(token);
    });
}
exports.login = functions.https.onRequest(function(req,res){
  googleLogin();
});
/*exports.googleLogin = functions.https.onRequest(function(req,res){
  console.log('tried popup');
  var provider=new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).then(function(result) {
  //var token = result.credential.accessToken;
  //user = result.user;
  console.log('logged in');
  res.send('something is working');
});
});/*

/*exports.token = functions.https.onRequest(function(req,response){
  const request = require('request');

request('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', { json: true }, (err, res, body) => {
  if (err) { return console.log(err); }
  console.log(body.url);
  console.log(body.explanation);
  response.json({value:body});
});
});
*/
exports.googleToken = functions.https.onRequest(function(req,response){
  const request = require('request');
//console.log(req.query.accessToken+'these are params');
request('https://www.googleapis.com/plus/v1/people/me?access_token='+req.query.accessToken, { json: true }, (err, res, body) => {
  if (err) { return console.log(err); }
  //console.log(body);
  console.log(body.emails[0].value);
  if(body.emails[0].value==undefined)
  {
    data={
      authenticatedRequest:false,
    };
    response.json(data);
  }
  var email1 =body.emails[0].value;
  var email=email1.replace(/\./g,',');
  console.log(email);
  var ref =database.ref();
  ref.once('value',function(snapshot){
    if(snapshot.hasChild('users/'+email))
    {
      console.log('present');
      console.log(snapshot);
      var data={

        //onBoard:snapshot.value.users.email.onBoard,
        authenticatedRequest:true,
        isRegistered:true,
        body:body
      };
      response.json(data);
    }
    else {
      //ref=databse.ref('users');
      database.ref('users/'+email).set({
        onBoard:false,
        email: body.emails[0].value,
        name: body.name.givenName+" "+body.name.familyName,
      });
      console.log('not present');
      data={
        authenticatedRequest:true,
        isRegistered:false,
        body:body
      };
      response.json(data);
    }
  });
  //response.json(body);
});
});
