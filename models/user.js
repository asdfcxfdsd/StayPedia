const mongoose = require("mongoose"); 
const Schema = mongoose.Schema; 

const Hotel = require('./hotel');

//Passport-Local Mongoose is a Mongoose plugin that simplifies building username and password login with Passport.
const passportLocalMongoose = require('passport-local-mongoose');

// Passport-Local Mongoose will add a username, hash and salt field to store the username, the hashed password and the salt value. 
const userSchema = new Schema({
    email: {
        type: String, 
        required: true, 
        unique: true
    }, 
    
    //This field will be an array of hotel IDs referencing Hotel documents. 
    wishlist: [
        {
            type: Schema.Types.ObjectId, 
            ref: "Hotel"
        }
    ]

});



userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);

