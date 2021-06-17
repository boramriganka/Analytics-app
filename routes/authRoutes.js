const passport = require("passport");
 
// app is not defined here , so we have to export the routes

module.exports = (app) => {
  // making a route handler that will put users to the passport auth flow
  // 'google' is prebuilt]in GoogleStrategy that will tell GoogleStrategy to start
  // a new strategy once this parameter is passed.

  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"], // permissions allowed to access
    })
  );

  // handler that will manage after user gives permission and now code is provided in the redirect url
  // also it will redirect user to server with code

  app.get(
    "/auth/google/callback", 
    passport.authenticate("google"),
    (req,res) =>{
      res.redirect('/xorai');
    }
    );


  app.get('/api/logout',(req,res)=>{
    req.logout();
    res.redirect('/');
  })

  app.get('/api/current_user', (req, res) => {
    res.send(req.user)
  })
}; 
