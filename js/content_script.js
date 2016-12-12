/* Chrome Extension
 * CART 351 - Concordia University
 * Written by Vsevolod (Seva) Ivanov
 *
 * You can explore any webpage with this playful Chrome extension in a new way.
 *
 * - Map is generated with cellauto.js library using automata principles.
 * - Text content is extracted from the page using a Regular Expression on
 *   English ascii characters.
 *
 * Game controls :
 *      arrows      - move around
 *      enter       - enter the link (doors) on the current cell
 *      space       - erase current cell
 *      other keys  - write their content to the current cell
 *      ctrl + r    - reload the current page
 */
var running = false;

var body = document.getElementsByTagName('body')[0];

// world.grid has [height, width] <=> [rows, columns]
var world,
    door = {};

var worldLinks = new Array(new Array()),
    foundLinks = false,
    linkDiv;

var pageWords,
    pageLetters = new Array(new Array());

var capturedLetters = [];

var creatureY = 0,
    creatureX = 0;

// cellauto.js library
function buildWorld()
{
    /* To get a world of the size of the document the height / width needs
     * to be determined on window load considering the dynamically modified css.
     * Therefore, the world will need to be created there too. However, on
     * window load did not work for me. Here is how a height would be
     * calculated:
     *      height: Math.ceil($(document).width() / 64)
     */
	world = new CAWorld({
		height: 20, // columns
		width: 30,  // rows
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
}

function setup()
{
    chrome.runtime.sendMessage({name: "isPaused?"}, function (response)
    {
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

            door["white"] = loadImage(
                chrome.extension.getURL("images/whiteDoor.png")
            );
            door["black"] = loadImage(
                chrome.extension.getURL("images/blackDoor.png")
            );

            $('*').css({'cursor': 'none'});

            buildWorld();

            initArrays();

            extractPageText();

            lastKeyPressedTimer = millis();

            // bottom screen url display
            linkDiv = document.createElement('div');
            linkDiv.id = 'p5LinkDiv';
            $(linkDiv).appendTo(body);

            $('#p5LinkDiv').css({
                position: "fixed",
                width: "100%",
                height: "auto",
                left: 0,
                bottom: 0,
                margin: "auto",
                background: "black",
                opacity: 0.9,
                "z-index": 30000,
                "font-size": "14pt",
                color: "rgb(68, 154, 254)"
            });
        }
        else
        {
            noLoop();
        }
    });
}

function draw()
{
    camera.off(); // p5.play compatibility

    if (!running) return;

    // first run - document takes time to load
    if (!foundLinks)
    {
        foundLinks = loadLinks();
    }

    background('#ffffff');
    drawMap();

    // draws chacacter
    keyPressed();

    cellContentInteraction();

    // window scroll
    $('html, body').animate({
        scrollTop: creatureY * world.cellSize - 100,
    }, 0);
}

function cellContentInteraction()
{
    var letter = pageLetters[creatureX][creatureY];

    // write in cell the char codes
    $(document).keypress(function(e)
    {
        e.preventDefault();

        // spacebar
        if (e.keyCode == 32)
        {
            capturedLetters.push(letter);
            pageLetters[creatureX][creatureY] = '';
        }
        else
        {
            var charCode = e.keyCode || e.which;
            var charStr = String.fromCharCode(charCode);
            console.log(charStr);
            pageLetters[creatureX][creatureY] = charStr;
        }
    });

    // get links at current cell
    var href = worldLinks[creatureX][creatureY].toUpperCase();

    // show links urls
    if (href != '')
    {
        $(linkDiv).html(href);
    }
    else
    {
        $(linkDiv).html('');
    }
}

function keyPressed()
{
    // slow down keypress speed
    if (millis() - lastKeyPressedTimer < 80)
    {
        fill(0, 0, 0, 80);
        rect(creatureX * world.cellSize,
             creatureY * world.cellSize,
             world.cellSize, world.cellSize);
        return;
    }
    else
    {
        lastKeyPressedTimer = millis();
    }

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
        else if (keyIsDown (UP_ARROW) &&
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

    // eraser
    fill(0, 0, 0, 80);
    //fill(225, 225, 225, 20);
    rect(pixelX, pixelY, world.cellSize, world.cellSize);

    // move mouse on it
    mouseX = pixelX;
    mouseY = pixelY;
}

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

    // find their places in the world
    for (var i = 0; i < world.width; i++)
    {
        for (var j = 0; j < world.height; j++)
        {
            var open = world.grid[j][i].open,
                pixelHeight = pixelWidth = world.cellSize,
                pixelXPos = i * pixelHeight,
                pixelYPos = j * pixelWidth;

            if ((open) &&
                (links.length > 0) &&
                (getRandomInt(1, 100) > 70)) // 30 % probability
            {
                // TODO more random positions on worldLinks 2d map

                worldLinks[j][i] = links.pop(links.length - 1);
            }
            else
            {
                worldLinks[j][i] = '';
            }
        }
    }
    return found;
}

function isEnglish(letter)
{
    return /^[a-zA-Z]+$/.test(letter);
}

function getEnglishWords(text)
{
    // /gi -> /g for unicode
    return /\b[^\d\W]+\b/gi.exec(text);
}

function initArrays()
{
    worldLinks = new Array(world.height);
    pageLetters = new Array(world.height);

    for (var i = 0; i < world.height; i++)
    {
        worldLinks[i] = new Array(world.width);
        pageLetters[i] = new Array(world.width);
    }
}

function extractPageText()
{
    var letters = [],
        text = $('p').text();

    pageWords = getEnglishWords(text);

    for (var i = 0; i < text.length; i++)
    {
        var letter = text[i];

        if ((letter == ' ') || (isEnglish(letter)))
        {
            letters.push(letter);
        }
    }

    // convert to 2d matrix
    for (var i = 0; i < world.width; i++)
    {
        var line = letters.splice(0, world.height);

        for (var j = 0; j < world.height; j++)
        {
            if (line[j])
            {
                pageLetters[j][i] = line[j];
            }
        }
    }
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

    // custom textAlign(CENTER)
    if ((l == 'm') || (l == 'M'))
    {
        x += (h / 20);
    }
    else if ((l != 'w') && (l != 'W'))
    {
        x += (h / 5);
    }
    text(l, x, y, h, w);
}

function drawMap()
{
    for (var i = 0; i < world.width; i++)
    {
        for (var j = 0; j < world.height; j++)
        {
            var open = world.grid[j][i].open,
                pixelHeight = pixelWidth = world.cellSize,
                pixelXPos = j * pixelHeight,
                pixelYPos = i * pixelWidth;

            var letter = pageLetters[j][i];
            letter = letter ? letter.toUpperCase() : '';

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
            if (open && (worldLinks[j][i] != ''))
            {
                fill(68, 154, 254);
                rect(pixelXPos, pixelYPos, pixelHeight, pixelWidth);
                image(door["black"], pixelXPos, pixelYPos);
            }
        }
    }
    return true;
}
