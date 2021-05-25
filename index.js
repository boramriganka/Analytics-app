const express = require('express')
const app = express();

// creating route handler 

app.get('/',(req,res) =>{
    res.send({ hi : 'there'});
})

app.listen(5000);