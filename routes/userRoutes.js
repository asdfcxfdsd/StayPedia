
const express = require("express"); 
const router = express.Router({mergeParams: true}); 
const User = require("../models/user"); 
const Review = require("../models/review");
const Hotel = require("../models/hotel"); 
const catchAsync = require("../utils/catchAsync"); 

// use the storeReturnTo middleware to save the returnTo value from session to res.locals
const {storeReturnTo} = require("../middleware"); 

// Passport.js for Signing in and out features. 
const passport = require('passport'); 
const LocalStrategy = require("passport-local"); 



// Render register form. 
router.get("/register", (req, res) => {
    res.render('users/register')
})

// Create a new user. 
router.post("/register", catchAsync(async(req, res, next) => {
    try {
        const {email, username, password} = req.body; 
        const user = new User({email, username});
        const registeredUser = await User.register(user, password);

        // It will help us login automatically after you already registered. 
        req.login(registeredUser, function(err) {
            if (err) { return next(err); }
            req.flash("success", "Welcome to StayPedia");
            res.redirect("/hotels");
          });
          
    } catch(e) {
        req.flash('error', e.message) 
        res.redirect("/register")
    }
})) 

// Login Routes
router.get('/login', (req, res) => {
    res.render('users/login')
})

router.post('/login', 
// use the storeReturnTo middleware to save the returnTo value from session to res.locals
    storeReturnTo
    ,passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), 
    // Now we can use res.locals.returnTo to redirect the user after login
    (req, res) => {
    req.flash('success', 'Welcome back ! ')
    const redirectUrl = res.locals.returnTo || "/hotels"; 
    res.redirect(redirectUrl); 
})


// Logout 
//In the latest versions of Passport.js, the req.logout() method now requires a callback function passed as an argument. Inside this callback function, we will handle any potential errors and also execute the code to set a flash message and redirect the user.
router.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) {
            return next(err); 
        }
        req.flash('success', 'Goodbye~~~~');
        res.redirect('/hotels')
    }); 

})



module.exports = router; 