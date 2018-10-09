const functions = require('firebase-functions');
const gcs = require('@google-cloud/storage')();
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');
const admin = require('firebase-admin');



const storage = functions.storage.object();


exports.generateThumbnail = storage.onFinalize((object) => {


	const fileBucket = object.bucket; // The Storage bucket that contains the file.
	const filePath = object.name; // File path in the bucket.
	const contentType = object.contentType; // File content type.
	const metageneration = object.metageneration; // Number of times metadata has been generated. New objects have a value of 1.

	console.log(fileBucket);
	console.log(filePath);
	console.log(contentType);
	console.log(metageneration);

})