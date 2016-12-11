var running = false;

var world,   // .grid[x or width][y or height]
    door = {};

var worldLinks = new Array(new Array()),
    foundLinks = false;

var portalImage,
    treesImage;

var textArray;

// sarah

var body = document.getElementsByTagName('body')[0];

// Variable that counts the number of creature
var count = 0;

var creature = {};

var worldLinks = new Array(new Array()),
    foundLinks = false;

var creatureY = 0,
    creatureX = 0,
    creatureXPixel = 0, // TODO to implement more smooth motions
    creatureYPixel = 0;

/* // laggy
// prevents scrolling on keys
window.addEventListener("keydown", function(e) {
    // space and arrow keys
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);
*/

function buildWorld()
{
	world = new CAWorld({
		width: 60,
		height: 60,
		//height: Math.ceil($(document).height() / 64),
		cellSize: 64
	});

	world.palette = [
		'255, 255, 255, 1',
		'68, 36, 52, 1'
	];

	world.registerCellType('wall', {
		getColor: function () {
			return this.open ? 0 : 1;
		},
		process: function (neighbors) {
			var surrounding = this.countSurroundingCellsWithValue(neighbors, 'wasOpen');
            this.open = (this.wasOpen && surrounding >= 10) || surrounding >= 6;
		},
		reset: function () {
			this.wasOpen = this.open;
		}
	}, function () {
		//init
		this.open = Math.random() > 0.20;
	});

	world.initialize([
		{ name: 'wall', distribution: 100 }
	]);

    //console.log(world);
    //console.log(world.grid[0][0]);
    //console.log(world.grid[0][0].open);
}

function setup()
{
    chrome.runtime.sendMessage({name: "isPaused?"}, function (response) {

    if (response.value != 'true')
    {
      running = true;

      // force it since height is not always 100% of the document
      p5Canvas = createCanvas($(document).width(), $(document).height());

      p5Canvas.elt.style.position = 'absolute';
      p5Canvas.elt.style.top = 0;
      p5Canvas.elt.style.left = 0;
      p5Canvas.elt.style["z-index"] = 1000;
      p5Canvas.elt.style["pointer-events"] = 'none';

      // init chars
      for (var evol = 1; evol < 5; evol++)
      {
          creature[evol] = {
            "left" : {},
            "right": {}
          };
      }
      
      door["white"] = loadImage(
          chrome.extension.getURL("images/blackDoor.png")
      );
      door["black"] = loadImage(
          chrome.extension.getURL("images/blackDoor.png")
      );

      creature[4]["left"] = loadImage(
          chrome.extension.getURL("images/sprite04Left.png")
      );
      creature[4]["right"] = loadImage(
          chrome.extension.getURL("images/sprite04Right.png")
      );

      $('*').css({'cursor': 'none'});

      textArray = extractPageText();
      buildWorld();


    }
    else {
      noLoop();
    }
  });
}

var worldLinks = new Array(new Array()),
    foundLinks = false;

function draw()
{
    if (!running) return;
    
    // first run - document takes time to load
    if (!foundLinks)
    {
        foundLinks = loadLinks();
    }

    gameOver(); // is it?

    background('#ffffff');
    drawMap();
    
    //evolveCharacter();
    
    // draws chacacter
    isJumping = drawCreature();
    keyPressed(isJumping);
    
    drawMouse();

    // window scroll
    /*$('html, body').animate({
        scrollTop: $("body").offset().top +
                   (creatureY / 2 * world.cellSize),
    }, 0);*/
}

function gameOver()
{
    // out of bound
    if (((creatureY * world.cellSize) > $(document).height()) ||
       ((creatureX * world.cellSize) > $(document).width()))
    {
       location.reload();
    }
}

function fromGround()
{
    var cellCount = 1;
    while (world.grid[creatureX][creatureY + cellCount].open)
    {
        cellCount++;
    }
    return cellCount - 1;
}

function onGround()
{
    return (fromGround() == 0);
}

function drawCreature()
{
    var isJumping = false;

    // no ground
    if (!onGround())
    {
        // fall
      creatureY++;

      var pixelX = creatureX * world.cellSize,
          pixelY = creatureY * world.cellSize;

        image(creature[4]["right"], pixelX, pixelY);

        isJumping = true;
    }

    return isJumping;
}

function keyPressed(isJumping)
{
  // make sure it is faster than vertical browser scroll follow
  var pixelStep = 30;

  // interacts with links
  if (keyIsDown (ENTER))
  {
      var href = worldLinks[creatureX][creatureY];
      if (href != '')
      {
          document.location.href = worldLinks[creatureX][creatureY];
      }
  }
  
  try
  {
      // draws chacacter
      if (keyIsDown (LEFT_ARROW) &&
          world.grid[creatureX - 1][creatureY].open)
      {
        creatureX--;
      }
      else if (keyIsDown (RIGHT_ARROW) &&
          world.grid[creatureX + 1][creatureY].open)

      {
        creatureX++;
      }
      // jump
      else if (keyIsDown (UP_ARROW) &&
              (fromGround() < 3) &&
              world.grid[creatureX][creatureY - 1].open)

      {
        creatureY--;
      }
      else if (keyIsDown (DOWN_ARROW) &&
          world.grid[creatureX][creatureY + 1].open)

      {
        creatureY++;
      }
  }
  catch (e) // TypeError == out of the boudaries of the world map
  {
      return;
  }

  var pixelX = creatureX * world.cellSize,
      pixelY = creatureY * world.cellSize;
  
  //console.log("x,y = ", creatureX, creatureY,
  //                      world.grid[creatureX][creatureY].open);
  //console.log("px,py = ", pixelX, pixelY);

  if (!isJumping)
  {
      image(creature[4]["right"], pixelX, pixelY);
  }

  // move mouse on it
  mouseX = pixelX;
  mouseY = pixelY;
}

/*
var evolveCounter = 0

function evolveCharacter()
{
  if (evolveCounter == 0)
  {
    charImageLeft = imgArray[0];
    charImageRight = imgArray[1];
  }
  else if (evolveCounter == 1)
  {
      // TODO
  }
  if (evolveCounter == 2)
  {
  }
  if (evolveCounter == 3)
  {
  }
}
*/
function loadLinks()
{
    var links = [],
        found = false;

    $('a').each(function ()
    {
        var href = $(this).attr('href');

        if (href != undefined &&
            $(this).is(':visible') &&
            href.indexOf("http") != -1)
        {
            links.push(href);
            found = true;
        }
    });

    worldLinks = new Array(world.width);

    // find their places in the world
    for (var i = 0; i < world.width; i++)
    {
        worldLinks[i] = new Array(world.height);

        for (var j = 0; j < world.height; j++)
        {
            var open = world.grid[i][j].open,
                pixelHeight = pixelWidth = world.cellSize,
                pixelXPos = i * pixelHeight,
                pixelYPos = j * pixelWidth;

            if ((open) &&
                (links.length > 0) &&
                (getRandomInt(1, 100) > 70)) // 30 % probability
            {
                // TODO more random positions on worldLinks 2d map

                worldLinks[i][j] = links.pop(links.length - 1);
            }
            else
            {
                worldLinks[i][j] = '';
            }
        }
    }

    console.log(worldLinks);
    return found;
}

// sarah
/*document.onkeypress = function(evt) {
   // prevent the default action (scroll / move caret)
   evt.preventDefault();
    evt = evt || window.event;
    var charCode = evt.keyCode || evt.which;
    var charStr = String.fromCharCode(charCode);
    alert(evt.which);

    if(charStr ==='r')
    {
      creaturePixelX ++;
      10;
    }

    if(charStr ==='l')
    {
      creaturePixelX --;
    }
    if(charStr ==='u')
    {
      creaturePixelY --;
    }
    if(charStr ==='d')
    {
      creaturePixelY ++;
    }

};*/

function isEnglish(word)
{
  var d = word.charCodeAt(0);
  
  return (
      (d > 64 && d < 91) ||     // A-Z
      (d > 96 && d < 123)       // a-z
  );
}

function extractPageText()
{
    var array = [],
        raw = $('p').text();

    console.log(raw);

    for (var i = 0; i < raw.length; i++)
    {
        var letter = raw[i];

        if ((letter != '') && (isEnglish(letter)))
        {
            array.push(letter);
        }
    }

    console.log(array);
    return array;
}

function drawText(l, f, x, y, h, w, lRgb, bgRgb)
{
    // background
    fill(bgRgb[0], bgRgb[1], bgRgb[2]);
    rect(x, y, h, w);

    // text
    fill(lRgb[0], lRgb[1], lRgb[2]);
    textSize(h);
    textFont("Helvetica");
    // x + h/5 serves as an textAlign(CENTER)
    text(l, x + h/5, y, h, w);
}

function drawMouse()
{
    //noStroke();
    fill(255,0,0);
    //image(charImageLeft, mouseX, mouseY);
    //rect(mouseX, mouseY, world.cellSize, world.cellSize);
}

function drawMap()
{
    for (var i = 0; i < world.width; i++)
    {
        for (var j = 0; j < world.height; j++)
        {
            var open = world.grid[i][j].open,
                pixelHeight = pixelWidth = world.cellSize,
                pixelXPos = i * pixelHeight,
                pixelYPos = j * pixelWidth;

            var letter = textArray[i + j];
            letter = letter.toUpperCase();

            if (open)
            {
                drawText(letter, 20, pixelXPos, pixelYPos,
                         pixelHeight, pixelWidth,
                         [0, 0, 0],
                         [255, 255, 255]);
            }
            else // (!open)
            {
                drawText(letter, 20, pixelXPos, pixelYPos,
                         pixelHeight, pixelWidth,
                         [255, 255, 255],
                         [0, 0, 0]);
            }
            // links
            if (open && (worldLinks[i][j] != ''))
            {
                fill(220, 100, 100);
                rect(pixelXPos, pixelYPos, pixelHeight, pixelWidth);
                image(door["black"], pixelXPos, pixelYPos);
                //drawText('?', 20, pixelXPos, pixelYPos,
                //         pixelHeight, pixelWidth,
                //         [158, 112, 116]);
            }
        }
    }
    return true;
}
