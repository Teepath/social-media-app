
const admin = require('firebase-admin');
const serviceAccount = require("../config/serviceAccountKey.json");


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://social-app-4521b.firebaseio.com",
    storageBucket: "social-app-4521b.appspot.com"  
});

//admin.initializeApp();

const db= admin.firestore();

module.exports = {admin, db};