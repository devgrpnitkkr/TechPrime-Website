const functions = require('firebase-functions');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const isAuthenticated = require('./middlewares/auth');

admin.initializeApp();
let database = admin.database();

let app = express();
app.use(bodyParser.urlencoded({extended: false}));


const googleUrl = 'https://www.googleapis.com/plus/v1/people/me?access_token=';
const key = 'abab';

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
app.get('/googleLogin', (req, response) => {
    request(googleUrl + req.query.accessToken, {json: true}, (err, res, body) => {
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
        let ref = database.ref();

        ref.once('value', (snapshot) => {
            if (snapshot.hasChild(email_child)) {
                let reff = database.ref(email_child);

                reff.once('value', (snap) => {
                    data = {
                        onBoard: snap.val().onBoard,
                        authenticatedRequest: true,
                        isRegistered: true,
                        body: body
                    };

                    const token = jwt.sign(data, key, {expiresIn: "12h"});

                    response.status(200).json({
                        success: true, token: token
                    });
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
                response.status(200).json({
                    success: true, data: data
                });
            }
        });
    });
});

/*
*   /
*   post:
*      body:
*           phone: Number
*           college: string
*           year: Number
*      description:
*           onboarding
*      responses:
*           200:
*               description: data updated
*               return:
*                   status: boolean
*           400:
*               description: incomplete parameters
 */
app.post('/', isAuthenticated, (req, response) => {
    if (req.body.phone === undefined || req.body.college === undefined || req.body.year === undefined) {
        return response.status(400).json({
            success: false, err: 'please pass valid/complete url parameters'
        });
    }
    else {
        let email1 = req.body.email1;
        let email = email1.replace(/\./g, ',');
        let ref = database.ref('users/');
        let email_child = "users/" + email;

        ref.once('value', function (snapshot) {
            if (snapshot.hasChild(email)) {
                database.ref(email_child).update({
                    onBoard: true,
                    phone: req.body.phone,
                    college: req.body.college,
                    year: req.body.year,
                });
                response.status(200).json({
                    success: true
                });
            }
        });
    }
});

exports.signUp = functions.https.onRequest(app);
