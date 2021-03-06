const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const keys = require('../config/keys')
const mongoose = require('mongoose')

const User = mongoose.model('users')
 
// creating functions that will help create cookie

passport.serializeUser((user,done) => {
    // null is for errors
    // user.id is not the google profile id, confusing part!
    // this id is the encoded user model instance id which is in the user record in mongo
    // this is to ensure , fb,insta may not gave profile id, but it will always have id generated by mongo

    done(null,user.id); 

})

passport.deserializeUser((id,done) =>{
    User.findById(id)
    .then(user =>{
        done(null,user)
    })
})

passport.use(
    new GoogleStrategy(
        {
            clientID: keys.googleClientID,
            clientSecret: keys.googleClientSecret,
            callbackURL: '/auth/google/callback'
        },
        (accessToken,refreshToken,profile,done) => {
            // create query that checks if user already exist or not
            // we wil use async promise feature of es2017
           User.findOne({googleId : profile.id})
           .then((existingUser) => {
               if(existingUser){
                done(null,existingUser);
               }else{
                   // creating a new user using model User
                   new User({ googleId: profile.id })
                   .save()
                   .then(user => done(null,user))   
               }
           })
           // after creation , use the done tag

        }
    )
);
