const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const friendRequestSchema = new Schema({
    sender: { // who send the req
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: { // receiver of the req
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: { // status of the req (default = pending)
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending',
        required: true
    }
});

friendRequestSchema.virtual('url').get(() => {
    return `/friendRequest/${this._id}`;
});

const friendRequest = mongoose.model('friendRequest', friendRequestSchema);

module.exports = friendRequest;