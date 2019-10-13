const {db} = require("../utils/admin");

 exports.getAllStreams = (req, res)=>{
    db.collection('streams')
    .orderBy('createdAt', )
    .get()
    .then(data => {
        let streams = [];
        data.forEach((doc) => {
            streams.push({
                streamId: doc.id,
                body: doc.data().body,
                userHandle:doc.data().userHandle,
                createdAt: doc.data().createdAt,
                userImage: doc.data().userImage
            });
        })
        return res.json(streams);
    }).catch(err => console.error(err))
 }


 exports.postOneStream =  (req, res) => {
    if(req.body.body.trim() === ''){
        return res.status(400).json({body: "Body must not be empty"})
    }
   const newStream = {
       body: req.body.body,
       userHandle: req.user.handle,
       userImage: req.user.imageUrl,
       createdAt: new Date().toISOString(),
       likeCount:0,
       commentCount:0,
   };

   db
       .collection('streams')
       .add(newStream)
       .then(doc =>{
           const resStream = newStream;
           resStream.streamId = doc.id;  //add streamId
           res.json({message:`document ${doc.id} created successfully`})
           
       }).catch(err =>{
           res.status(500).json({error:`something went wrong`})
           console.error(err)
       })

}


//get getStream

exports.getStream = (req, res) =>{
    let streamData = {};
    db.doc(`/streams/${req.params.streamId}`).get()
    .then((doc) =>{
        if(!doc.exists){
            return res.status(404).json({error: 'Stream not found'})
        }

        streamData = doc.data();
        streamData.streamId = doc.id;
        return db.collection('comments')
        .orderBy('createdAt', 'desc')
        .where('streamId', '==', req.params.streamId)
        .get();
    })
    .then(data =>{
        streamData.comments = [];
        data.forEach(doc =>{
            streamData.comments.push(doc.data());
        });
        return res.json(streamData)
    })
    .catch(err =>{
        console.error(err);
        res.status(500).json({error: err.code});
    });
};



//Comment on a comment

exports.commentOnStream = (req, res) =>{
    if(req.body.body.trim()==='') return res.status(400).json({comment: 'Must not be empty'})

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        streamId:req.params.streamId,
        userHandle:req.user.handle,
        userImage: req.user.imageUrl
    };

    db.doc(`/streams/${req.params.streamId}`).get()
        .then(doc =>{
            if(!doc.exists){
                return res.status(404).json({error:'stream not found'});

            }
            return doc.ref.update({commentCount: doc.data().commentCount + 1})
        })
        .then(()=>{
            return db.collection('comments').add(newComment);
        })
        .then(()=>{
            res.json(newComment);
        })

        .catch(err =>{
            console.error(err);
            res.status(500).json({error:'Something went wrong'});
        })
}


exports.likeStream = (req, res)=>{
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
        .where('streamId', '==', req.params.streamId).limit(1);
        const streamDocument =db.doc(`/streams/${req.params.streamId}`);
        let streamData ={};

        streamDocument.get()
            .then(doc =>{
                if(doc.exists){
                streamData = doc.data();
                streamData.streamId = doc.id;
                return likeDocument.get();
                }else {
                    return res.status(404).json({errpr: 'Stream not found'})
                }
            })
            .then(data =>{
                if(data.empty){
                    return db.collection('likes').add({
                        streamId: req.params.streamId,
                        userHandle: req.user.handle
                    })
                    .then(()=>{
                        streamData.likeCount++
                        return streamDocument.update({likeCount: streamData.likeCount})
                    })
                    .then(()=>{
                        return res.json(streamData)
                    })
                } else {
                    return res.status(400).json({error: 'Stream already liked'});
                }
            })
            .catch(err =>{
                console.error(err)
                res.status(500).json({error: 'Something went wrong'})
            })

}


exports.unlikeStream = (req, res)=>{

    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('streamId', '==', req.params.streamId).limit(1);
    const streamDocument =db.doc(`/streams/${req.params.streamId}`);
    let streamData ={};

    streamDocument.get()
        .then(doc =>{
            if(doc.exists){
            streamData = doc.data();
            streamData.streamId = doc.id;
            return likeDocument.get();
            }else {
                return res.status(404).json({errpr: 'Stream not found'})
            }
        })
        .then(data =>{
            if(data.empty){
               return res.status(400).json({error: 'Stream not found'});
            } else {
               return db.doc(`/likes/${data.docs[0].id}`).delete()
               .then(()=>{
                   streamData.likeCount--;
                   return streamDocument.update({likeCount: streamData.likeCount})
               }).then(()=>{
                   res.json(streamData);
               })
            }
        })
        .catch(err =>{
            console.error(err)
            res.status(500).json({error: 'Something went wrong'})
        })
}


//Delete a stream

exports.deleteStream =(req, res)=>{
    const document =db.doc(`/streams/${req.params.streamId}`);
    document.get()
        .then(doc =>{
            if(!doc.exists){
                return res.status(404).json({error: 'Stream not found'});
            }
            if(doc.data().userHandle !== req.user.handle){
                return res.status(403).json({error:'Unathorised'});
            }else{
                return document.delete()
            }
        }).then(()=>{
            res.json({message: 'Stream deleted successfuly'});
        })
        .catch(err =>{
            console.error(err);
            return res.status(500).json({error: err.code});
        })

}


