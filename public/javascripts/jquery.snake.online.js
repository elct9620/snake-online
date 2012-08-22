/*jslint browser: true*/
/*global jQuery,console,io*/

/**
 * Snake Game Online
 *
 * @author 蒼時弦也
 * @version 0.0.1
 */

(function ($) {
    "use strict";

    $.fn.snakeOnline = function (args) {
        args = args || {};

        var width = args.width || 60, // Define Game Size
            height = args.height || 40,
            backgroundColor = args.backgroundColor || "#000", // Define Game Color Scheme
            player1Color = args.player1Color || "blue",
            player2Color = args.player2Color || "green",
            appleColor = args.appleColor || "red",
            speed = args.speed || 2, // Define Game Speed
            frameLength = Math.ceil(1000 / speed) || 500, // Frame Refresh Time
            blockSize = args.blockSize || 10, // Define Block Size
            player1Start = args.player1Start || [33, 20], // Define player start position
            player2Start = args.player2Start || [27, 20],
            apple, //Game Object
            player1,
            player2,
            self = this,
            canvas,
            canvasWidth = width * blockSize,
            canvasHeight = height * blockSize,
            game,
            gameEndFlag,
            gameMessage,
            server;

        function gameEnd() {
            var centerX = canvasWidth / 2,
                centerY = canvasHeight / 2;

            canvas.save();

            // Clean Sence
            canvas.clearRect(0, 0, canvasWidth, canvasHeight);

            // Write Message
            canvas.font = '30px "Open Sans",sans-serif normal';
            canvas.fillStyel = "black";
            canvas.textAlign = "center";
            canvas.textBaseline = "middle";
            canvas.fillText(gameMessage, centerX, centerY);

            canvas.restore();

            $('#new').removeAttr('disabled');
            $('#join').removeAttr('disabled');
        }

        function updateFrame() {
            // Clean Sence
            canvas.clearRect(0, 0, canvasWidth, canvasHeight);

            // Set Background
            canvas.fillStyle = backgroundColor;
            canvas.fillRect(0, 0, canvasWidth, canvasHeight);

            if (gameEndFlag) {
                gameEnd();
            } else {
                // Controll Snakes
                player1.handleMove(apple, player1);
                player2.handleMove(apple, player2);
                player1.draw(canvas);
                player2.draw(canvas);

                // Apple
                apple.draw(canvas);

                if (player1.checkCollision(player2.getPosition()) || player2.checkCollision(player1.getPosition())) {
                    player1.retreat();
                    player1.draw(canvas);
                    player2.retreat();
                    player2.draw(canvas);
                    $(player1).trigger('dead');
                } else {
                    // Update Frame
                    game = setTimeout(updateFrame, frameLength);
                }
            }
        }

        function collisionCheck(objectA, objectB) {
            return objectA[0] === objectB[0] && objectA[1] === objectB[1];
        }

        //Game Object
        function Apple(x, y) {
            var position = [x, y];

            function draw(canvas) {
                var radius = blockSize / 2,
                    x = position[0] * blockSize + radius,
                    y = position[1] * blockSize + radius;

                canvas.save();

                canvas.fillStyle = appleColor;
                canvas.beginPath();
                canvas.arc(x, y, radius, 0, Math.PI * 2, true);
                canvas.fill();

                canvas.restore();
            }

            function setPosition(x, y) {
                position = [x, y];
            }

            function getPosition() {
                return position;
            }

            return {
                draw: draw,
                setPosition: setPosition,
                getPosition: getPosition
            };
        }

        function Snake(x, y, color, initDirection) {
            var position = [],
                lastPos = [],
                direction = initDirection;

            //Initnalize Snake
            if (direction === 'left') {
                position.push([x, y]);
                position.push([x + 1, y]);
                position.push([x + 2, y]);
            }

            if (direction === 'right') {
                position.push([x, y]);
                position.push([x - 1, y]);
                position.push([x - 2, y]);
            }

            function drawSection(canvas, position) {
                var x = position[0] * blockSize,
                    y = position[1] * blockSize;

                canvas.fillRect(x, y, blockSize, blockSize);
            }

            function draw(canvas) {
                var i;

                canvas.save();

                canvas.fillStyle = color;
                for (i = 0; i < position.length; i += 1) {
                    drawSection(canvas, position[i]);
                }

                canvas.restore();
            }

            function handleMove(apple, self) {
                var nextPosition = position[0].slice();

                switch (direction) {
                case 'up':
                    nextPosition[1] -= 1;
                    break;
                case 'down':
                    nextPosition[1] += 1;
                    break;
                case 'left':
                    nextPosition[0] -= 1;
                    break;
                case 'right':
                    nextPosition[0] += 1;
                    break;
                }

                lastPos = position.slice();
                position.unshift(nextPosition);

                if (collisionCheck(position[0], apple.getPosition())) {
                    $(self).trigger('appleEaten', [position]);
                } else {
                    position.pop();
                }
            }

            function getPosition() {
                return position.slice();
            }

            function setPosition(newPosition) {
                position = newPosition;
            }

            function setDirection(newDirection, server) {
                var allowDirection = [];
                switch (direction) {
                case 'up':
                case 'down':
                    allowDirection = ['left', 'right'];
                    break;
                case 'left':
                case 'right':
                    allowDirection = ['up', 'down'];
                    break;
                }

                if (allowDirection.indexOf(newDirection) > -1) {
                    direction = newDirection;
                    if (server) {
                        server.emit('update', {direction: direction, position: getPosition()});
                    }
                }
            }

            function bodyCollision(head, rest) {
                var isInArray = false;

                $.each(rest, function (index, item) {
                    if (collisionCheck(head, item)) {
                        isInArray = true;
                    }
                });

                return isInArray;
            }

            function checkCollision(player) {
                var wallCollision = false,
                    snakeCollision = false,
                    playerCollision = false,
                    head = position[0],
                    rest = position.slice(1),
                    snakeX = head[0],
                    snakeY = head[1],
                    minX = 1,
                    minY = 1,
                    maxX = width,
                    maxY = height,
                    outsideHorizontal = snakeX < minX || snakeX >= maxX,
                    outsideVertical = snakeY < minY || snakeY >= maxY;

                if (outsideHorizontal || outsideVertical) {
                    wallCollision = true;
                }

                snakeCollision = bodyCollision(head, rest);
                playerCollision = bodyCollision(head, player);

                return wallCollision || snakeCollision || playerCollision;
            }

            function retreat() {
                position = lastPos;
            }

            return {
                draw: draw,
                handleMove: handleMove,
                setDirection: setDirection,
                checkCollision: checkCollision,
                bodyCollision: bodyCollision,
                retreat: retreat,
                getPosition: getPosition
            };
        }

        function setSpeed(newSpeed) {
            if (newSpeed > 0) {
                frameLength = Math.ceil(1000 / newSpeed);
            }
        }

        function newGame() {
            clearTimeout(game);
            $(player1).unbind('appleEaten').unbind('dead');
            $(document).unbind('keydown');
            setSpeed(speed);
            gameEndFlag = false;
            gameMessage = "";
            player1 = null;
            player2 = null;
            apple = null;
        }

        this.start = function () {
            // Set Canvas Size
            $(this).attr('width', canvasWidth).attr('height', canvasHeight);

            // Get Context
            canvas = this[0].getContext('2d');

            // Connect Server
            server = io.connect();

            $('#new').click(function (event) {
                server.emit('new');
                newGame();
                $(this).attr('disabled', true);
                $('#join').attr('disabled', true);
                event.preventDefault();
            });

            $('#join').click(function (event) {
                server.emit('join');
                newGame();
                $(this).attr('disabled', true);
                $('#new').attr('disabled', true);
                event.preventDefault();
            });

            server.on('noPlayer', function (data) {
                newGame();
            });

            server.on('start', function (data) {

                // Initialize Object
                apple = new Apple(30, 20);

                if (data.player1) {
                    player1 = new Snake(player1Start[0], player1Start[1], player1Color, 'right');
                    player2 = new Snake(player2Start[0], player2Start[1], player2Color, 'left');
                } else {
                    player1 = new Snake(player2Start[0], player2Start[1], player2Color, 'left');
                    player2 = new Snake(player1Start[0], player1Start[1], player1Color, 'right');
                }

                server.emit('update', {position: player1.getPosition() });


                // Run Game
                updateFrame();

                // Bind Key Down
                $(document).keydown(function (event) {
                    var keyToDirection = {
                        37: 'left',
                        38: 'up',
                        39: 'right',
                        40: 'down'
                    },
                        direction = keyToDirection[event.which];

                    if (direction) {
                        player1.setDirection(direction, server);
                        event.preventDefault();
                    }
                });

                server.on('update', function (data) {
                    player2.setDirection(data.direction);
                    player2.setPosition(data.position);
                });

                server.on('apple', function (data) {
                    apple.setPosition(data.x, data.y);
                    setSpeed(data.speed);
                });

                server.on('gameEnd', function (data) {
                    gameEndFlag = true;
                    gameMessage = data.message;
                    updateFrame();
                });

                $(player1).bind('appleEaten', function (event, snakeArray) {
                    server.emit('appleEaten');
                    server.emit('update', {position: player1.getPosition()});
                });

                $(player1).bind('dead', function (event) {
                    server.emit('gameEnd');
                });

            });

            return this;

        };

        return this;
    };

}(jQuery));
