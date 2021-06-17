const express = require('express')
const mongoose = require('mongoose')
const authRoutes = require('./routes/authRoutes')
const cookieSession = require('cookie-session')
const passport = require('passport')
const keys = require('./config/keys')
//1st import the User model , then execute passport.js

require('./models/User')
require('./services/passport')

mongoose.connect(keys.mongoURI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});

const app = express()

// express can't handle cookies, we will use cookie-session module
// cookies configuration - use authentication
app.use(
  cookieSession({
    maxAge: 30 * 24 * 60 * 60 * 1000,
    keys: [keys.cookieKey]
  })
)

app.use(passport.initialize())
app.use(passport.session())



// linking the routes to app
authRoutes(app)

const PORT = process.env.PORT || 5000;

app.listen(PORT)


// alternate way:
// require ('./services/passport')
// require('./routes/authRoutes)(app)