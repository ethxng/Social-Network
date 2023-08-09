let express = require('express');
let router = express.Router();
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const { uploadFileToS3, getFileFromS3, removeFileFromS3 } = require('../s3');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);
const async = require('async');
const {ensureAuthenticated} = require('../ensureAuthenticated');

let postController = require('../controllers/postController');

// add like to a post
router.post('/:post_id/addLike', ensureAuthenticated, postController.addLike); 

// remove a like to a post
router.delete('/:post_id/removeLike', ensureAuthenticated, postController.removeLike);

// add comment to a post
router.post('/:post_id/addComment', ensureAuthenticated, postController.addComment);

// get a specific post
router.get('/:post_id', ensureAuthenticated, postController.getPost);


// return the index page, including posts (all likes and comments associated with every post)
// of all friends of the user
router.get('/', ensureAuthenticated, postController.getIndexPage);

// in making request in Postman, the key should be "image_" since we have our multer looking for "image_"
router.post('/images', upload.single('image_'), async (req, res, next) => {
    // req.file contains all the information needed
    const file = req.file;
    console.log(file);

    // upload photo to S3 buckets
    async.series([
        function(callback) {
            uploadFileToS3(file).then(result => {
                console.log(result);
                callback(null, result);
            }).catch(err => {
                console.error("Error sending data to S3 buckets: ", err);
                callback(err);
            });
        }, function(callback){ // delete the file from /uploads after finish sending (essentially our /uploads dir will always be empty)
            unlinkFile(`./${file.path}`).then(() => {
                console.log("Deletion successful");
                callback(null);
            }).catch(err => console.error("Error deleting the file from /uploads: ", err));
        }
    ], (err, results) => {
        if (err){
            console.error("Error sending data to S3 bucket: ", err);
            res.status(500).send("Internal server error");
        } else{
            // results[0] is the confirmation that the photo has been sent to S3 bucket
            res.status(200).json(results[0]);
        }
    });
});

// this route will retrieve the image straight from S3 buckets to the frontend
// <img> tag in the frontend will call this
router.get('/image/:key', ensureAuthenticated, postController.getImage);

// create a post (can be text-only or have one picture attached)
router.post("/create", ensureAuthenticated, postController.createPost);

module.exports = router;