const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const flash = require('connect-flash');

const {generateMessage, generateLocationMessage} = require('./utils/message');
const {isRealString} = require('./utils/validation');
const {Users} = require('./utils/users');

var User = require('../models/user');
var Room = require('../models/room');

mongoose.connect('mongodb://cherry:cherry_2010@ds119060.mlab.com:19060/cherry-chat');

var db = mongoose.connection;
db.once('open', ()=>{
  console.log('Connected to mongoDb');
});
db.on('error', (err)=>{
  console.log(err);
});

const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();

app.use(express.static(publicPath));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(cookieParser());
app.use(expressSession({ secret: 'some secret key', resave: true, saveUnitialized: true }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());


passport.use(new LocalStrategy(function(username, password, done) {
  debugger;
  const query = {
    username: username
  };

  User.findOne(query, function(err, user){
    if (err) throw err;
    if(!user){
      return done(null, false, {message: 'No user found'});
    }
    bcrypt.compare(password, user.password, function(err, isMatch){
      if (err) throw err;
      if(isMatch){
        return done(null, user);
      }else{
        return done(null, false, {message: 'Wrong password'});
      }
    });
  });
}));

passport.serializeUser(function(user, done){
  done(null, user._id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.get('/', (req, res) => {
  // console.log(req.flash().error[0]);
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/get-users', (req, res)=>{
  User.find((err, user)=>{
    if (err) throw err;
    res.json(user);
  });
});

app.get('/get-rooms', (req, res) => {
  Room.find((err, room) => {
    if (err) throw err;
    res.json(room);
  });
});

app.post('/login', 
  passport.authenticate('local', {
    failureRedirect: `/`,
    failureFlash: true
  }),
  (req, res) => {
    req.session.user = req.body.username;
    console.log(req.session);
    res.redirect(`/room.html`);
  }
); 


app.post('/register', (req, res)=>{
  const username = req.body.re_username;
  const password = req.body.re_password;
  const name = req.body.re_name;
  const password2 = req.body.re_repassword;
  if(password != password2){
    res.redirect('/people/register');
  } else{
  var newUser = new User();
  newUser.username = username;
  newUser.name = name;
  newUser.password = password;
  bcrypt.genSalt(10, (err, salt) => {
    if (err) throw err;
    bcrypt.hash(newUser.password, salt, (err, hash) => {
      if (err) throw err;
      newUser.password = hash;
      newUser.save((err) => {
        if (err) throw err;
        console.log(newUser);
        res.redirect('/');
      });
    });
  });
  }
});

app.post('/find-room', (req, res) => {
  debugger;
  var query = req.body.room;
  var password = req.body.room_password;
  Room.findOne({roomName: query}, (err, room) => {
    if (err) throw err;
    bcrypt.compare(password, room.password, (err, isMatch) => {
      if (err) throw err;
      if (isMatch) {
        req.session.room = query;
        res.redirect(`/chat.html?name=${req.session.user}&room=${req.session.room}`);
      }
      else{res.redirect('/room.html');}
    });
  });
});

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('disconnect', () => {
    console.log('a user disconnected')
  });

  socket.on('join', (params, callback) => {
    if (!isRealString(params.name) || !isRealString(params.room)) {
      return callback('Name and room name are required.');
    }

    socket.join(params.room);
    users.removeUser(socket.id);
    users.addUser(socket.id, params.name, params.room);

    io.to(params.room).emit('updateUserList', users.getUserList(params.room));
    socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app'));
    socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `${params.name} has joined.`));
    callback();
  });

  socket.on('createMessage', (message, callback) => {
    var user = users.getUser(socket.id);

    if (user && isRealString(message.text)) {
      io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
    }

    callback();
  });

  socket.on('createLocationMessage', (coords) => {
    var user = users.getUser(socket.id);

    if (user) {
      io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude));  
    }
  });

  socket.on('disconnect', () => {
    var user = users.removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('updateUserList', users.getUserList(user.room));
      io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left.`));
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
