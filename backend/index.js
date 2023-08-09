require('dotenv').config()

// RUN "npm run devStart" to fire up the backend

const express = require('express');
const path = require('path');
const router = express.Router();
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const User = require('./models/user');
const app = express();

app.use(express.json());
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: false }));
// app.set('views', path.join(__dirname, '../frontend/views'));
// app.set('view engine', 'pug');
const async = require('async');
const passport = require('passport')
const util = require('util')
const FacebookStrategy = require('passport-facebook').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

app.use(session({ secret: process.env.PASSPORT_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

// configure facebook authentication
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback", // remember to add a valid callbackURL once deployed to Vercel
    profileFields: ['id', 'displayName', 'photos']
  },
  async function(accessToken, refreshToken, profile, cb) {
    const user = await User.findOne({facebookId: profile.id});
    if (user === null) { // user not found
      console.log(profile._json.picture.data);
      console.log("adding new FB user into DB");
      let newUser = new User({
        name: profile.displayName,
        facebookId: profile.id,
        username: profile.displayName,
      });

      await newUser.save();
      console.log("data is saved");
      return cb(null, newUser);
    } else{ // user found
      console.log(profile._json.picture.data);
      console.log("FB user exists in DB");
        //console.log(profile);
        return cb(null, user);
    }
  }
));

// sign in through in-app credentials
passport.use(
  new LocalStrategy(async (username, password, cb) => {
    try {
      const user = await User.findOne({ username: username});
      if (!user) { // if user not found
        console.log("Error finding user");
        return cb(null, false, { message: 'Incorrect username.' });
      }
      bcrypt.compare(password, user.password)
        .then(result => {
          if (result) {
            return cb(null, user)
          } else {
            return cb(null, false, {message: "Incorrect password"});
          }
        });
    } catch (err) {
      //console.log(err);
      return cb(err);
    }
  })
);


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

const authRouter = require("./routes/auth");
const friendReqRouter = require("./routes/friendReq");
const postRouter = require('./routes/post');
const profileRouter = require("./routes/profile");

// authentication purposes, look through /routes/auth.js for more details
app.use('/auth', authRouter); 

// all routes related to Friend Requests, such as making/rejecting/accepting a friendReq
app.use('/friendReq', friendReqRouter);

// all routes related to actions made to posts, such as create/like/comment
app.use('/post', postRouter);

// all routes related to actions related to profiles, such as get/update
app.use('/profile', profileRouter);

app.get('/success', (req, res, next) => {
  console.log("this is your req.user containing the user's info");
  console.log(req.user);
  if (req.isAuthenticated()) {
    console.log("you are authenticated");
  }
  res.send("you have successfully logged in either thru FB or guest sign in");
});

app.get("/error", (req, res, next) => {
  res.status(401).send("error logging in or you have not logged in yet");
});

// redirect index page to post index page, displaying all posts from user's friends
app.get('/', ensureAuthenticated, (req, res, next) => {
  res.redirect('/post');
});

// test, remove later
function ensureAuthenticated(req, res, next){
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/error');
}

app.get("/welcome", (req, res, next) => {
  // this only shows up when the user is not logged in
  res.send("Welcome to the Social Network App! Please log in.")
});
  
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  //res.render('error');
});

// make connection to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true , useUnifiedTopology: true});
const db = mongoose.connection;
db.on('on', console.error.bind(console, "MongoDB Connection Error"));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// IF YOU NEED TO PERFORM TESTS ON ROUTES, COMMENT OUT THE CODE BELOW AND CHANGE THE SCRIPT IN PACKAGE.JSON FROM "nodemon index.js" to "nodemon server.js" 
// AND VICE VERSA IF YOU DON'T WANT TESTS
app.listen(process.env.PORT, () => {
    console.log(`Server started on port No. ${process.env.PORT}`);
});

module.exports = app;