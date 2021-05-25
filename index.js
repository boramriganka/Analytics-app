const express = require('express')
const app = express();

// creating route handler 

app.get('/',(req,res) =>{
    res.send({ bye : 'here'});
})

// the port that heroku gives us in production mode
// in dev mode, it doesn't give port so the or statement

// dynamic port binding
const PORT = process.env.PORT || 5000
app.listen(PORT);