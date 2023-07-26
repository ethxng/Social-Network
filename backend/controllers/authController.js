// configure .env file
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });


const passport = require('passport');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const bcrypt = require('bcryptjs');
const { uploadFileToS3, getFileFromS3 } = require('../s3');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);
const async = require('async');
const User = require("../models/user");


exports.authenticate_FB_callback = [passport.authenticate('facebook', { failureRedirect: '/error'}), 
  function(req, res) {
    res.redirect("/success");
}]

exports.guest_sign_in = [(req, res, next) => {
    // Attach additional information to the request body
    req.body.username = process.env.GUEST_USERNAME;
    req.body.password = process.env.GUEST_PASSWORD;
    next();
  }, passport.authenticate('local', {
    successRedirect: '/success',
    failureRedirect: '/error'
})];

// If testing in Postman, only works through attaching data in "raw." Don't attach in "form-data"
exports.sign_in = passport.authenticate('local', {
  successRedirect: '/success',
  failureRedirect: "/error"
});

exports.log_out = (req, res, next) => {
  try {
    // this will clear the login session and remove the user information from the req.user property
    req.logout(function(err) {
      if (err) {return next(err)};
      console.log("you have logged out");
      res.redirect('/welcome');
    });
  } catch(error){
    console.error("Error logging out: ", error);
    res.status(500).send("Internal server error");
  }
}

exports.sign_up = [upload.single("profile_pic"), async (req, res, next) => {
  try {
    // name is in req.body.name (full name)
    // username is in req.body.username
    // DOB is in req.body.bday
    // password is in req.body.password
    // photo_key is req.file.filename (if available), if not, then it will a default pic (key stored in .env)
    const name = req.body.name;
    const username = req.body.username;
    let DOB = req.body.DOB;
    const password = req.body.password;
    if (!req.body.name || !req.body.username || !req.body.DOB || !req.body.password){
      // remove the attach profile photo if there is one before sending out the error
      if (req.file && req.filename !== process.env.BLANK_PROFILE_PIC_KEY){
        await unlinkFile(`./${req.file.path}`);
      }
      res.status(400).send({"error": "Missing data. (either name, username, password, or DOB)"});
      return;
    }
    // change DOB from type String to Date
    DOB = new Date(DOB);
    if (isNaN(DOB)){
      // remove the attach profile photo if there is one before sending out the error
      if (req.file && req.filename !== process.env.BLANK_PROFILE_PIC_KEY){
        await unlinkFile(`./${req.file.path}`);
      }
      res.status(400).json({"error": "The DOB you provided is not in the right date forma. Make sure it's MM/DD/YYYY"});
      return;
    }
    
    // USERNAME MUST BE UNIQUE; IF NOT, REJECT
    const user = await User.findOne({username: username});
    if (user) {
      console.log("Username already exists!");
      console.log(user);
      res.status(409).send('Username already exists');
      return;
    } else {
      async.waterfall([
        // first, you will hash the password
        // second, you will save the user to DB
        // third, you will send the profile photo to S3
        // last, you will unlink the photo from /uploads
        // third and fourth operations will only be done if there is a photo attached in req.file; else ignore
  
        function(callback){ // hash password
          bcrypt.hash(password, parseInt(process.env.SALT))
                .then(hashedPassword => callback(null, hashedPassword))
                .catch(err => {
                  console.error("Error hashing password: ", err);
                  callback(err);
                });
        }, function(hashedPassword, callback) { // saving the user to the DB
          let data = {
            name: name, 
            username: username, 
            DOB: DOB, 
            password: hashedPassword, 
          };
          let photo = null;
          if (req.file){ // if profile photo exists
            photo = req.file;
            data.photo_key = photo.filename;
          } else { // profile pic will be a blank pic
            data.photo_key = process.env.BLANK_PROFILE_PIC_KEY;
          }
          const newUser = new User(data);
          newUser.save()
            .then(result => callback(null, result))
            .catch(err => {
              console.error("error saving user to the DB: ", err);
              callback(err);
            });
        }, function(user, callback){ // saving photo to S3
          if (user.photo_key === process.env.BLANK_PROFILE_PIC_KEY) {
            callback(null, user);
          } else { // profile pic is attached, so save the pic to S3
            uploadFileToS3(req.file).then(s3_confirmation => {
              console.log(s3_confirmation);
              callback(null, user);
            })
              .catch(err => {
                console.error("Error saving photo to S3 bucket: ", err);
                callback(err);
              });
          }
        }, function(user, callback) { // unlink the file from /uploads if profile pic exists
          if (user.photo_key === process.env.BLANK_PROFILE_PIC_KEY) {
            callback(null, user);
          } else {
            unlinkFile(`./${req.file.path}`).then(() => {
              console.log("Deletion of photo successful");
              callback(null, user);
            }).catch(err => {
              console.error("Error deleting file from /uploads: ", err);
              callback(err);
            });
          }
        } 
      ], (err, result) => {
        if (err) {
          console.error("Error with the signing up process: ", err);
          res.status(500).send("Internal server error");
        } else{ // redirect to the welcome page if success
          console.log(result);
          res.status(200).redirect("/welcome");
        }
      });
    }
  } catch(error) {
    console.error("Error with the signing up process: ", error);
    res.status(500).send("Internal server error");
  }
}]