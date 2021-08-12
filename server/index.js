const keys = require('./keys');

//express

const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(cors());


// POSTGRES SERVER

const { Pool } = require('pg');
const pgClient = new Pool({
    user : keys.pgUser,
    host : keys.pgHost,
    database : keys.pgDatabase,
    password : keys.pgPassword,
    port : keys.pgPort
});

pgClient.on("connect", (client) => {
    client
        .query("CREATE TABLE IF NOT EXISTS values (number INT)")
        .catch((err) => console.error(err));
});


//redis client

const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: ()  => 1000
});
const redisPublisher = redisClient.duplicate();

//routes 
app.get('/' , (req , res)=>{
   res.send('hello from simple server :)');
});

app.get('/values/all' , async (req , res)=>{
   const values = await pgClient.query('select * from values');
   res.send(values.rows);
});

app.get('/values/current' , async (req , res)=>{
    redisClient.hgetall('values', (err, values)=> {
        res.send(values);
    });
});

app.post('/values/input' , async (req , res)=>{

   const index = req.body.index;
   if (parseInt(index)>40){
       return res.status(422).send('index to high');
   }

   redisClient.hset('values',index,'nothing yet');
   redisPublisher.publish('insert','index');
   pgClient.query( 'INSERT INTO values(number) VALUES($1)',['index']); 

   res.send({working: true});
});


app.post("/values", async (req, res) => {
    const index = req.body.index;
  
    if (parseInt(index) > 40) {
      return res.status(422).send("Index too high");
    }
  
    redisClient.hset("values", index, "Nothing yet!");
    redisPublisher.publish("insert", index);
    pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);
  
    res.send({ working: true });
  });
  

app.listen(5000, err => {
    console.log('listening');
});

