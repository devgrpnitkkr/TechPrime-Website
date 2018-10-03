const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');
const isAuthenticated = require('./middlewares/auth');

admin.initializeApp();
let database = admin.database();

let app = express();
app.use(bodyParser.urlencoded({extended: false}));


//<--------Random Fact Generation---------->
//Generates random fact about techspardha.
app.get('/randomFact', (request, response) => {
    const numberOfLines = 8;
    const randomIndex = Math.floor(Math.random() * numberOfLines);
    database.ref('/facts/' + randomIndex).on('value', (snapshot) => {
        response.status(200).json({
            success: true,
            message: snapshot.val()
        });
    });
});


//<------Returning the array of all the videos------>
//Returns the array of videos containing title and url of a video.
app.get('/video', (request, response) => {
    let items = [];
    database.ref('/videos').on('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            items.push(childSnapshot.key, {
                title: childSnapshot.val().title,
                url: childSnapshot.val().url
            });
        });
    });
    response.status(200).json({
        success: true,
        items: items
    });
});


//<-----Adding query to database------->
//only add newly asked query to the database.
app.post('/query', isAuthenticated, (request, response) => {
    const query = request.body.text;
    if (query) {
        let newPostKey = admin.database().ref().child('queries').push().key;
        let updates = {};

        let email = request.body.email;
        email = email.replace(/,/g, '.');

        updates['/queries/' + newPostKey] = {email: email, query: query};
        database.ref().update(updates);
        response.status(200).json({
            success: true,
            message: "query successfully added"
        });
    }
    else {
        response.status(400).json({
            success: false,
            message: "query text not defined"
        })
    }
});


exports.api = functions.https.onRequest(app);

