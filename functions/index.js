const functions = require('firebase-functions');
const admin = require('firebase-admin');
const firebase = require('firebase');
admin.initializeApp();
var database=admin.database();

exports.googleLogin = functions.https.onRequest(function(req,response){
  const request = require('request');
  request('https://www.googleapis.com/plus/v1/people/me?access_token='+req.query.accessToken, { json: true }, (err, res, body) => {
    if (err) { return console.log(err);
    }
  console.log(body);
  if(body.error!=null){
    console.log('error in accessToken');
    data={
      authenticatedRequest:false,
      };
  return response.json(data);
  }
  var email1 =body.emails[0].value;
  var email=email1.replace(/\./g,',');
  console.log(email);
  var ref =database.ref();
  ref.once('value',function(snapshot){
    if(snapshot.hasChild('users/'+email))
    {
      console.log('present');
      //console.log(snapshot.val());
      //console.log(snapshot.val().users.onBoard);
      var reff=database.ref('users/'+email);
      var onB;
      reff.once('value',function(snap){
        console.log(snap.val().onBoard);
        onB=snap.val().onBoard;
        console.log(onB);
        var data={

          onBoard:onB,
          authenticatedRequest:true,
          isRegistered:true,
          body:body
        };
        response.json(data);
      });
      console.log('onboard is'+onB);

    }
    else {
      database.ref('users/'+email).set({
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
var qs=require('querystring');
var express=require('express');
var bodyParser= require('body-parser');
var app=express();
app.use(bodyParser.urlencoded({extended:false}));
app.post('/', function(req,response){
  const request = require('request');
  request('https://www.googleapis.com/plus/v1/people/me?access_token='+req.body.accessToken, { json: true }, (err, res, body) => {
  if (err) { return console.log(err); }
  console.log(body);
  if(req.body.phone == undefined || req.body.college==undefined || req.body.year==undefined){
    return response.send('please pass valid/complete url parameters');
  }
  if(body.error!=null)
  {
    data={
      authenticatedRequest:false,
    };
    return response.json(data);
  }
  else {
    var email1=body.emails[0].value;
    console.log(email1);
    var email=email1.replace(/\./g,',');
    var ref=database.ref('users/');
    ref.once('value',function(snapshot){
      console.log(snapshot.val());
      if(snapshot.hasChild(email)){
          console.log('present');
          database.ref('users/'+email).update({
            onBoard:true,
            phone:req.body.phone,
            college:req.body.college,
            year:req.body.year,
          });
          response.send('database updated');
      }
    });
  }
});
});
exports.signUp = functions.https.onRequest(app);
