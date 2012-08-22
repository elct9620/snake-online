
###
 * Module dependencies.
###

# Require Module
express = require 'express'
routes = require './routes'
http = require 'http'
path = require 'path'

# Applicatoin
app = express()

app.configure  ->
  app.set 'port', process.env.PORT || 3000;
  app.set 'views', __dirname + '/views';
  app.set 'view engine', 'ejs';
  app.use express.favicon();
  app.use express.logger('dev');
  app.use express.bodyParser();
  app.use express.methodOverride();
  app.use app.router;
  app.use express.static(path.join(__dirname, 'public'));

# Development
app.configure 'development', ->
  app.use express.errorHandler();

# Global View Variable
app.set 'title', 'Snake Online'

#Router
app.get '/', routes.index;
app.get '/socket.js', (req, res) ->
  res.redirect '/socket.io/socket.io.js'

#Create Server
server = http.createServer(app)
io = require('socket.io').listen(server)

io.configure ->
  io.set "transports", ["xhr-polling"]
  io.set "polling duration", 10

server.listen app.get('port'), ->
  console.log "Express server listening on port " + app.get('port');

# Apple Handler
snakeBodyCollision = (head, snakeArray) ->
  rest = snakeArray.slice(1)
  isInArray = false

  for section in rest
    if head[0] is section[0] and head[1] is section[1]
      isInArray = true

  isInArray

random = (low, high)->
  Math.floor(Math.random() * (high - low + 1) - low)

getRandomPosition =  ->
  x = random 1, 58
  y = random 1, 38

  [x, y]

getNewPosition = (player1, player2) ->
  newPosition = getRandomPosition()
  if snakeBodyCollision(newPosition, player1)and snakeBodyCollision(newPosition, player2)
    return getNewPosition player1, player2
  else
    return newPosition

# Rooms
rooms = []

newRoom = (socket) ->
  rooms.push {
    player1: socket,
    player2: null,
    waiting: true,
    p1position: [],
    p2position: [],
    speed: 2
  }

findRoom = (socket) ->
  joined = false
  for room in rooms
    if room and room.waiting
      room.player2 = socket
      room.waiting = false
      room.player1.emit 'start', {player1: true}
      room.player2.emit 'start', {player1: false}
      room.player1.set 'room', room
      room.player2.set 'room', room
      joined = true
      break

  unless joined
    socket.emit 'noPlayer'

roomBroadcast = (room, event, data) ->
  if room and room.player1 and room.player2
    room.player1.emit event, data
  room.player2.emit event, data

roomSend = (room, socket, event, data) ->
  if room and room.player1 and room.player2
    if room.player1 is socket
      room.player2.emit event, data
    else
      room.player1.emit event, data

roomUpdatePosition = (room, socket, position) ->
  if room.player1 is socket
    room.p2position = position
  else
    room.p1position = position

# Socket Server
io.sockets.on 'connection', (socket) ->

  socket.on 'new', (data) ->
    newRoom socket

  socket.on 'join', (data) ->
    findRoom socket

  # Player Update
  socket.on 'update', (data) ->

    socket.get 'room', (err, room) ->

      if data.direction
        roomSend room, socket, 'update', {
          direction: data.direction,
          position: data.position
        }

      roomUpdatePosition room, socket, data.position

  # Player Eat Apple
  socket.on 'appleEaten', (data) ->

    socket.get 'room', (err, room) ->
      position = getNewPosition room.p1position, room.p2position
      room.speed += 1
      roomBroadcast room, 'apple', {
        x: position[0],
        y: position[1],
        speed: room.speed
      }

  # Game End
  socket.on 'gameEnd', (data) ->
    socket.get 'room', (err, room) ->
      roomSend room, socket, 'gameEnd', {message: "You Win!"}
      socket.emit 'gameEnd', {message: "You Lose!"}
      delete rooms[rooms.indexOf(room)]

  #Disconnect
  socket.on 'disconnect', (data) ->
    socket.get 'room', (err, room) ->
      roomSend room, socket, 'gameEnd', {message: "Player2 is leaved..."}
      delete rooms[rooms.indexOf(room)]
