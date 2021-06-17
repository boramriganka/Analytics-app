const mongoose = require('mongoose')
const {Schema} = mongoose  // es2015 destructuring
 
// we will store unique google Id here.
// In mongo schema , we can freely remove or add property
const userSchema = new Schema({
    googleId : String,
});

mongoose.model('users',userSchema); // users is collection name


// we will require this file in somewhere so that it can execute
