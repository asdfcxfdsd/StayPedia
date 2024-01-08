// To check if the user had already logged in . 
module.exports.isLoggedIn = (req, res, next) => {
    // req.user is stored in session. Thanks to Passport.js. 
    // console.log("REQ.USER...", req.user);  
    
    // We will flash error message and redirect to login page if no user sign in. 
    if (!req.isAuthenticated()) {
        // store original Url to our req.session.returnTo. 
        req.session.returnTo = req.originalUrl;  

        req.flash('error', "You must be signed in first!")
        res.redirect('/login'); 
    }
    next(); 
}


//This causes a problem with our returnTo redirect logic because we store the returnTo route path (i.e., the path where the user should be redirected back after login) in the session (req.session.returnTo), which gets cleared after a successful login.

//To resolve this issue, we will use a middleware function to transfer the returnTo value from the session (req.session.returnTo) to the Express.js app res.locals object before the passport.authenticate() function is executed in the /login POST route.


// storeReturnTo is used to save the returnTo value from the session (req.session.returnTo) to res.locals :
module.exports.storeReturnTo = (req, res, next) => {
    // use the storeReturnTo middleware to save the returnTo value from session to res.locals.   
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo
    }
    next(); 
}


