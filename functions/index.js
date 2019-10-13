const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require("./utils/fbAuth");

const db = require('./utils/admin');

const { getAllStreams, postOneStream,
    getStream,
    commentOnStream,
    likeStream,
    unlikeStream,
    deleteStream
} = require("./handlers/streams");

const { signup,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser,
    getUserDetails,
    markNoficationsRead
} = require("./handlers/users");


//streams handlers

app.get('/streams', getAllStreams);
app.post('/stream', FBAuth, postOneStream);
app.get('/stream/:streamId', getStream);

app.delete('/stream/:streamId', FBAuth, deleteStream)
app.get('/stream/:streamId/like', FBAuth, likeStream);
app.get('/stream/:streamId/unlike', FBAuth, unlikeStream);
app.post('/stream/:streamId/comment', FBAuth, commentOnStream)

//user route
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('notifications', FBAuth, markNoficationsRead);




exports.api = functions.region('us-central1').https.onRequest(app);





exports.createNotificationOnLike = functions
    .region('us-central1')
    .firestore.document('likes/{id}')
    .onCreate((snapshot) => {
        return db.doc(`/streams/${snapshot.data().streamId}`)
            .get()
            .then(doc => {
                if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        streamId: doc.id
                    });
                }
            })
    .catch((err) => 
        console.error(err))
        

    });


    exports.deleteNotificationOnUnLike = functions.region('us-central1')
    .firestore.document('likes/{id}')
    .onDelete((snapshot) => {
       return  db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch((err) => {
                console.error(err)
                return;
            });
    });


exports.createNotificationOnComment = functions.region('us-central1').firestore.document('comments/{id}')
    .onCreate((snapshot) => {
      return  db.doc(`/streams/${snapshot.data().streamId}`)
            .get()
            .then((doc) => {
                if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    return db.doc(`/notifications/${snapshot.id}`)
                        .set({
                            createdAt: new Date().toISOString(),
                            recipient: doc.data().userHandle,
                            sender: snapshot.data().userHandle,
                            type: 'comment',
                            read: false,
                            streamId: doc.id
                        });
                }
            })
        
            .catch((err) => {
                console.error(err);
                return;
            });
    });

    exports.onUserImageChange = functions.region('us-central1')
    .firestore.document('/users/{userId}')
    .onUpdate((change)=>{
        console.log(change.before.data())
        console.log(change.after.data());
        if(change.before.data().imageUrl !== change.afeter.data().imageUrl){
            console.log('imahe has change');

        const batch =  db.batch();

        return db.collection('streams').where('userHandle', '==', change.before.data().handle).get()
        .then((data)=>{
            data.forEach(doc =>{
                const stream = db.doc(`/streams/${doc.id}`);
                batch.update(stream, {userImage: change.after.data().imageUrl});
            })
            return batch.commit();
        })

    }else{
        return true;
    }

    });


exports.onStreamDelete = functions.region('us-central1')
    .firestore.document('/streams/{streamId}')
    .onDelete((snapshot, context)=>{
        const streamId = context.params.streamId;
        const batch = db.batch();
        return db.collection('comments').where('streamId', '==', streamId).get()
        .then(data =>{
            data.forEach(doc =>{
                batch.delete(db.doc(`/comments/${doc.id}`));
            })
            return db.collection('likes').where('streamId', '==', streamId),get()
        })
        .then(data =>{
            data.forEach(doc =>{
                batch.delete(db.doc(`/likes/${doc.id}`));
            });
            return db.collection('notifications').where('streamId', '==', streamId).get()
        })
        .then(data =>{
            data.forEach(doc =>{
                batch.delete(db.doc(`/notifications/${doc.id}`));
            })
            return batch.commit();
        })
        .catch(err => console.error(err))

    })
