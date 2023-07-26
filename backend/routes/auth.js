let express = require('express')
let router = express.Router();
let passport = require('passport');

let authController = require('../controllers/authController')

// configure all routes related to authentication (all prefixed with /auth)
router.get('/facebook', passport.authenticate('facebook')); // login page
router.get('/facebook/callback', authController.authenticate_FB_callback);
router.post('/guest-sign-in', authController.guest_sign_in);

// If testing in Postman, only works through attaching data in "raw." Don't attach in "form-data"
router.post('/sign-in', authController.sign_in);
router.post('/sign-up', authController.sign_up);
router.post('/log-out', ensureAuthenticated, authController.log_out);

function ensureAuthenticated(req, res, next){
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/error');
}

module.exports = router;