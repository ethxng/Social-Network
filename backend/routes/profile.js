let express = require('express')
let router = express.Router();
const {ensureAuthenticated} = require("../ensureAuthenticated");

let profileController = require("../controllers/profileController");


// retrieves the profile of the user
router.get('/', ensureAuthenticated, profileController.getUserProfile);

// return the profile of another user (that is not the user)
router.get('/:id', ensureAuthenticated, profileController.getOthersProfile);

// update the user's profile pic 
router.patch("/update", ensureAuthenticated, profileController.updateProfile);

module.exports = router;