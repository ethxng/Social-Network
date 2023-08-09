let express = require('express')
let router = express.Router();
let passport = require('passport');

const { ensureAuthenticated } = require('../ensureAuthenticated');

let friendReqController = require('../controllers/friendReqController');

// for sending a friend request
router.post('/send/:receiver_id', ensureAuthenticated, friendReqController.send_request);

// for accepting or rejecting a friendReq
router.patch('/modify/:receiver_id', ensureAuthenticated, friendReqController.modify_request);

// displaying all incoming friendReqs of a user
router.get('/', ensureAuthenticated, friendReqController.getAllFriendReqs);

// suggesting new friends to a user
router.get('/newFriends', ensureAuthenticated, friendReqController.getNewFriends);

module.exports = router;