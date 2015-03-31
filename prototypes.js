/*
https://github.com/parenparen/Prototypes.js

Copyright 2013 Derek Mueller
Released under the MIT license
http://opensource.org/licenses/MIT
*/

//// prototypes

// Globals
var proto = {};

proto.LEFT = 37;
proto.UP = 38;
proto.RIGHT = 39;
proto.RETURN = 13;
proto.DOWN = 40;
proto.SPACE = 32;
proto.MP = false;
proto.LOCAL = true;
proto.DEBUG = false;
proto.socket = null;
proto.activeWorld = null;


/***********************************************************************
* Utility functions
***********************************************************************/

proto.err = function (errMsg) {
    proto.DEBUG && console.log ('Error: ' + errMsg);
};

proto.getIntersect = function (
    x1, y1, x2, y2,
    x3, y3, x4, y4) {

    var x = ((x1 * y2 - y1 * x2) * (x3 - x4) - 
                (x1 - x2) * (x3 * y4 - y3 * x4)) /
            ((x1 - x2) * (y3 - y4) - 
                (y1 - y2) * (x3 - x4));
    var y = ((x1 * y2 - y1 * x2) * (y3 - y4) - 
                (y1 - y2) * (x3 * y4 - y3 * x4)) /
            ((x1 - x2) * (y3 - y4) - 
                (y1 - y2) * (x3 - x4));
    return [x, y];
};

proto.cartToPolar = function (x, y) {
    var theta = Math.atan2 (y, x);
    var r = Math.sqrt (x * x + y * y);
    return [r, theta];
};

proto.polarToCartX = function (r, theta) {
    return (Math.cos (theta) * r);
};

proto.polarToCartY = function (r, theta) {
    return (Math.sin (theta) * r);
};

/*
Alters an object's name property so that it doesn't conflict with keys
in a given dictionary.
*/
proto.renameIfNecessary = function (objDict, newElem) {
    //proto.DEBUG && console.log ('renameIfNecessary: objDict.len = ' + 
        //Object.keys (objDict).length);
    if (newElem.name === '' ||  newElem.name === null || 
        typeof newElem.name === 'undefined' || 
        $.inArray (newElem.name, Object.keys (objDict)) !== -1) {

        newElem.name = Object.keys (objDict).length;
        //proto.DEBUG && console.log ('renaming ' + newElem.name);
    }
}

/*
Get the name of an object's constructor
Parameters:
    object - the object whose constructor name should be returned 
Returns:
    string - the name of the specified object's constructor 
*/
proto.name = function (obj) {
    match = obj.constructor.toString ().
        match (/^function\s+(\w+)\s+\((?:\w+(?:,[^,]+)*)?\)/);
    return (match && match.length) ? match[1] : '';
};

/*
Applied in object contructors to facillitate use of variable length
argument lists and default object properties.
Parameters:
    argsDict - a dictionary
    defaultArgsDict - a dictionary whose keys are property names and
        whose values are default property values
*/
proto.unpack = function (argsDict, defaultArgsDict) {
    /*proto.DEBUG && console.log ('unpack');
    proto.DEBUG && console.log (Object.keys (argsDict));
    proto.DEBUG && console.log (argsDict);
    proto.DEBUG && console.log (defaultArgsDict);
    proto.DEBUG && console.log (this);*/
    var that = this;
    for (var i in defaultArgsDict) {
        /*proto.DEBUG && console.log ('i = ' + i);
        proto.DEBUG && console.log (argsDict[i]);*/
        if ($.inArray (i, Object.keys (argsDict)) !== -1 &&
            argsDict[i] !== undefined) {
            //console.log ('in');
            that[i] = argsDict[i];
        } else {
            //console.log ('out');
            that[i] = defaultArgsDict[i];
        }
        //console.log (that[i]);
        //console.log (that);
    }
    //console.log ('done');
    //console.log (that);
}



/***********************************************************************
* WebSocket Setup
***********************************************************************/

proto.setupWebsockets = function (isLocal) {

    proto.socket = null;
    proto.MP = true;
    proto.LOCAL = isLocal;

    proto.websocketConnect ();

    return proto.socket;
}

proto.websocketConnect = function () {
    //establish connection with server
    if (proto.LOCAL) { 
        proto.socket = io.connect("http://localhost", 
                    {port: 8080, transports: ["websocket"]});
    } else {
        proto.socket = io.connect("http://www.parenparen.info", 
                    {port: 8080, transports: ["websocket"]});
    }
}


/***********************************************************************
* Universe object
***********************************************************************/

function Universe () {
    this.worlds = {};
}

Universe.prototype.addWorld = function (world) {
    this.worlds[world.name] = world;
};

Universe.prototype.stopWorlds = function () {
    for (var name in this.worlds) {
        var world = this.worlds[name];
        if (!world.isStopped) {
            world.stop ();
        }
    }
};

Universe.prototype.removeWorld = function (world) {
    if (this.worlds[world.name])
        this.worlds[world.name].takedown ();
    delete this.worlds[world.name]; 
};

Universe.prototype.removeAllWorlds = function (world) {
    for (var i in this.worlds) {
        this.removeWorld (this.worlds[i]);
    }
};

Universe.prototype.getWorld = function (worldName) {
    if (!this.worlds[worldName]) {
        proto.DEBUG && console.log (
            "Warning: Universe.prototype.getWorld () called for " +
            "non-existent world");
    }
    return this.worlds[worldName];
};


/***********************************************************************
* World Utility functions
***********************************************************************/

window.requestAnimFrame = (function () {
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function (callback) {
            window.setTimeout(callback, 1000 / 60);
          };
}) ();

World.animLoop = function (world) {
    return function animLoopInner () {
        world.draw ();
        world.regionDraw (world.currRegion.name);
        if (!world.isStopped)
            requestAnimFrame (animLoopInner);
    };
}


/***********************************************************************
* World Event functions
***********************************************************************/

World.resize = function (world) {
    return function inner () {
        if (world.isStopped) {
            $(document).unbind ('resize', inner);
            return;
        }
        if (world.currRegion)
            world.currRegion.alignAllCanvasLayersToDummy (
                world.dummyCanvas);
    };
};

World.click = function (world) {
    return function inner (evt) {
        if (world.isStopped) {
            $(document).unbind ('click', inner);
            return;
        }
        proto.DEBUG && console.log ('click: ' + evt.clientX + ', ' + evt.clientY);
        var mouseX = evt.clientX - 
                $('#' + world.name).offset ().left;
        var mouseY = evt.clientY - 
                $('#' + world.name).offset ().top +
                     $(window).scrollTop ();
        if (world.currRegion)
            world.currRegion.click (mouseX, mouseY, world.view);
        world.click (mouseX, mouseY);
    };
};

World.mousemove = function  (world) {
    return function inner (evt) {
        if (world.isStopped) {
            $(document).unbind ('mousemove', inner);
            return;
        }
        //console.log ('mousemove: ' + evt.clientX + ', ' + evt.clientY);
        var mouseX = evt.clientX - 
                $('#' + world.name).offset ().left;
        var mouseY = evt.clientY - 
                $('#' + world.name).offset ().top +
                     $(window).scrollTop ();
        world.mousemove (mouseX, mouseY);
        if (world.currRegion)
            world.currRegion.mousemove (mouseX, mouseY, world.view);
        if (proto.MP) {
            socket.emit (
                'mousemove', {mouseX: mouseX, mouseY: mouseY});
        }
    };
};

World.mousedown = function (world) {
    return function inner (evt) {
        if (world.isStopped) {
            $(document).unbind ('mousedown', inner);
            return;
        }
        proto.DEBUG && console.log ('mousedown: ' + evt.clientX + ', ' + evt.clientY);
        var mouseX = evt.clientX - 
                $('#' + world.name).offset ().left;
        var mouseY = evt.clientY - 
                $('#' + world.name).offset ().top +
                     $(window).scrollTop ();
        proto.DEBUG && console.log ('mousedown translated: ' + mouseX + ', ' + mouseY);
        if (world.currRegion)
            world.currRegion.mousedown (mouseX, mouseY, world.view);
    };
};

World.mouseup = function (world) {
    return function inner (evt) {
        if (world.isStopped) {
            $(document).unbind ('mouseup', inner);
            return;
        }
        proto.DEBUG && console.log ('mouseup: ' + evt.clientX + ', ' + evt.clientY);
        var mouseX = evt.clientX - 
                $('#' + world.name).offset ().left;
        var mouseY = evt.clientY - 
                $('#' + world.name).offset ().top +
                     $(window).scrollTop ();
        if (world.currRegion)
            world.currRegion.mouseup (mouseX, mouseY, world.view);
    };
};

World.keydown = function (world) {
    return function inner (evt) {
        if (world.isStopped) {
            $(document).unbind ('keydown', inner);
            return;
        }
        //evt.preventDefault ();
        proto.DEBUG && console.log ('keydown: ' + evt.keyCode);
        var key = evt.keyCode;
        if (key == 8) {
            if (world.currRegion && world.currRegion.me)
                world.currRegion.keypress (world.currRegion.me.id, 
                                            key, world.view);
            if (proto.MP) socket.emit ('keypress', {key:key});
        } else if (key == proto.UP || key == proto.LEFT || 
                   key == proto.RIGHT || key == proto.DOWN || 
                   key == proto.RETURN) {
            if (world.currRegion && world.currRegion.me)
                world.currRegion.keydown (world.currRegion.me.id, 
                                           key, world.view);
            if (proto.MP) socket.emit ('keydown', {key:key});
        } else if ($.browser && (Object.keys ($.browser))[0] == 'chrome') {
            World.unsupportedKeypress (evt.keyCode, world);
        }

        // prevent arrow keys from scrolling page
        if (key == proto.UP || key == proto.LEFT || 
            key == proto.RIGHT || key == proto.DOWN) {
            evt.preventDefault ();
            return false;
        }
    }
};

World.keyup = function (world) {
    return function inner (evt) {
        if (world.isStopped) {
            $(document).unbind ('keyup', inner);
            return;
        }
        //evt.preventDefault ();
        proto.DEBUG && console.log ('keyup: ' + evt.keyCode);
        var key = evt.keyCode;
        if (key == proto.UP || key == proto.LEFT || 
            key == proto.RIGHT || key == proto.DOWN || 
            key == proto.RETURN) {
            if (world.currRegion && world.currRegion.me)
                world.currRegion.keyup (world.currRegion.me.id, 
                                         key, world.view);
            if (proto.MP) socket.emit ('keyup', {key:key});
        } 

        // prevent arrow keys from scrolling page
        if (key == proto.UP || key == proto.LEFT || 
            key == proto.RIGHT || key == proto.DOWN) {
            evt.preventDefault ();
            return false;
        }
    }
};

World.keypress = function (world) {
    return function inner (evt) {
        if (world.isStopped) {
            $(document).unbind ('keypress', inner);
            return;
        }
        //evt.preventDefault ();
        proto.DEBUG && console.log ('keypress: ' + evt.charCode);
        var key = evt.charCode;
        if (key >= 32 && key <= 122) {
            if (world.currRegion && world.currRegion.me)
                world.currRegion.keypress (world.currRegion.me.id, 
                                            evt.charCode, world.view);
            if (proto.MP) socket.emit ('keypress', {key:key});
        }
    }; 
};

/* 
Used for Chrome since keypress event doesn't work on it
*/
World.unsupportedKeypress = function (charCode, world) {
    if (charCode == 191) {
        charCode = 47;
    } else if (charCode + 32 >= 32 && charCode + 32 <= 122) {
        charCode += 32;
    }

    proto.DEBUG && console.log ('keypress: ' + charCode);
    var key = charCode;
    if (key >= 32 && key <= 122) {
        if (world.currRegion && world.currRegion.me)
            world.currRegion.keypress (world.currRegion.me.id, 
                                        charCode, world.view);
        if (proto.MP) socket.emit ('keypress', {key:key});
    }
};



/***********************************************************************
* World object
***********************************************************************/

function World (argsDict) {

    var defaultPropsDict = {
        name: 'default',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        parentElement: null,
        suppressEvtFns: false
    }

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);

    this.regions = {};
    this.currRegion;
    this.things = {};

    this.view = new View (this.x, this.y, this.width, this.height); 
    this.isStopped = true;
    this.animationLoopFunction = World.animLoop (this);

    this.setupFunctions = [];
    this.takedownFunctions = [];
    this.evtFns = {}; // used in takedown process

    // make dummy canvas
    this.dummyCanvas = $("<canvas>", {
        id: this.name,
        width: this.view.width,
        height: this.view.height,
        visibility: "hidden",
        "z-index": "2"
    });
    $(this.parentElement).append (this.dummyCanvas);      

}


// private instance methods

// bug: more things need to be handled
// e.g. delete audio tags, stop animations, etc.
World.prototype._takedown = function () {
    this.currRegion.takedown ();
    for (var i in this.takedownFunctions) {
        this.takedownFunctions[i] (this);
    }
    proto.DEBUG && console.log ('removing ');
    proto.DEBUG && console.debug ($(this.dummyCanvas).parent ());
    $(this.dummyCanvas).siblings ('canvas').remove ();
};

World.prototype._setup = function () {
    for (var i in this.setupFunctions) {
        this.setupFunctions[i] (this);
    }
    if (this.currRegion) {
        this.currRegion.setup ();
    }
};

World.prototype._unbindEventFns = function () {
    if (!this.suppressEvtFns) {
        $(document).unbind ("click", this.evtFns['click']);
        $(document).unbind ("mousemove", this.evtFns['mousemove']);
        $(document).unbind ("keypress", this.evtFns ['keypress']);
        $(document).unbind ("keydown", this.evtFns ['keydown']);
        $(document).unbind ("keyup", this.evtFns ['keyup']);
        $(document).unbind ("mousedown", this.evtFns ['mousedown']);
        $(document).unbind ("mouseup", this.evtFns ['mouseup']);
    }
    $(window).unbind ('resize', this.evtFns['resize']);
};

World.prototype._setupEventFns = function () {
    this.evtFns['resize'] = World.resize (this)
    if (!this.suppressEvtFns) {
        this.evtFns['click'] = World.click (this);
        this.evtFns['mousemove'] = World.mousemove (this);
        this.evtFns['keypress'] = World.keypress (this);
        this.evtFns['keydown'] = World.keydown (this);
        this.evtFns['keyup'] = World.keyup (this);
        this.evtFns['mousedown'] = World.mousedown (this);
        this.evtFns['mouseup'] = World.mouseup (this);
        document.addEventListener ("click", this.evtFns['click']);
        document.addEventListener ("mousemove", this.evtFns['mousemove']);
        document.addEventListener ("keypress", this.evtFns ['keypress']);
        document.addEventListener ("keydown", this.evtFns ['keydown']);
        document.addEventListener ("keyup", this.evtFns ['keyup']);
        document.addEventListener ("mousedown", this.evtFns ['mousedown']);
        document.addEventListener ("mouseup", this.evtFns ['mouseup']);
    }
    $(window).resize (this.evtFns['resize']);
};


// public instance methods

World.prototype.allSpritesLoaded = function () {
    
};

World.prototype.addSetupFunction = function (fn) {
    this.setupFunctions.push (fn);
};

World.prototype.addTakedownFunction = function (fn) {
    this.takedownFunctions.push (fn);
};

World.prototype.makeActive = function () {
    proto.activeWorld = this;
    CanvasLayer.setDummyCanvasId (this.name);
    CanvasLayer.setParentElement ($(this.dummyCanvas).parent ());
};

World.prototype.start = function () {
    this.isStopped = false;
    this._setup ();
    this._setupEventFns ();
    this.animationLoopFunction ();
};

World.prototype.stop = function () {
    this._takedown ();
    this._unbindEventFns ();
    this.isStopped = true;
};

World.prototype.resizeView = function (w, h) {
    this.view.resize (w, h);
};


World.prototype.addRegion = function (region) {
    this.regions[region.name] = region;
};

World.prototype.addThing = function (thing) {
    proto.renameIfNecessary (this.things, thing);
    this.things[thing.name] = thing;
};

World.prototype.changeRegion = function (regionName) {
    if (this.currRegion) {
        this.currRegion.takedown ();
    }
    this.currRegion = this.regions[regionName];
    this.currRegion.setup ();
};
World.prototype.regionGetState = function (regionName) {

    return this.regions[regionName].getState ();

};

World.prototype.regionSetState = function (regionName, stateObjs) {

    this.regions[regionName].setState (stateObjs);

};

World.prototype.draw = function () {
    for (var thingName in this.things) {
        this.things[thingName].draw (this.view);
    }
};

World.prototype.regionDraw = function (regionName) {
    this.regions[regionName].draw (this.view);
};

World.prototype.regionAddUser = function (regionName, user) {
    this.regions[regionName].addUser (user);
};

World.prototype.regionDeleteUser = function (regionName, userId) {
    this.regions[regionName].deleteUser (userId);
};

World.prototype.regionAddThing = function (regionName, thing) {
    this.regions[regionName].addThing (thing);
};

World.prototype.regionDeleteThing = function (regionName, thing) {
    this.regions[regionName].deleteThing (thing);
};

World.prototype.regionKeydown = function (regionName, userId, key) {
    this.regions[regionName].keydown (userId, key, this.view);
};

World.prototype.regionKeyup = function (regionName, userId, key) {
    this.regions[regionName].keyup (userId, key, this.view);
};

World.prototype.regionKeypress = function (regionName, userId, key) {
    this.regions[regionName].keypress (userId, key);
};

World.prototype.mousemove = function (mouseX, mouseY) {
    var thing;
    for (var thingName in this.things) {
        thing = this.things[thingName];

        // setup mouseIsInside variable
        if ((thing.isMouseoverable || thing.isMouseoffable) &&
            thing.mouseIsInside == undefined) {
            //proto.DEBUG && console.log ('setup');
            if (thing.clickedInBox (mouseX, mouseY, this.view)) {
                thing.mouseIsInside = true;
            } else {
                thing.mouseIsInside = false;
            }
        }

        if (thing.isMouseoverable && 
            thing.mouseIsInside == false &&
            thing.clickedInBox (mouseX, mouseY, this.view)) {
            thing.mouseover (mouseX, mouseY);
            thing.mouseIsInside = true; 
        } 

        if (thing.isMouseoffable &&
            thing.mouseIsInside == true &&
            !thing.clickedInBox (mouseX, mouseY, this.view)) {
            thing.mouseoff (mouseX, mouseY);
            thing.mouseIsInside = false; 
        } 

        if (thing.isHoverable &&
            !thing.clickedInBox (mouseX, mouseY, this.view)) {
            thing.mouseIsInside = false; 
            //thing.hover (mouseX, mouseY);
        } 

        if (thing.isHoverable &&
            thing.clickedInBox (mouseX, mouseY, this.view)) {
            thing.hover (mouseX, mouseY);
            thing.mouseIsInside = true; 
        } 
    }
};

World.prototype.click = function (mouseX, mouseY) {
    for (var thingName in this.things) {
        proto.DEBUG && console.log ('world.click');
        if (this.things[thingName].isClickable &&
            this.things[thingName].clickedInBox (
                mouseX, mouseY, this.view)) {
            proto.DEBUG && console.log ('world.click: calling click ()');
            this.things[thingName].click (mouseX, mouseY, this.view);
        }
    }
};

World.prototype.regionClick = function (regionName, mouseX, 
                                         mouseY) {
    this.regions[regionName].click (mouseX, mouseY, this.view);
};

World.prototype.currRegionMousemove = function (mouseX, 
                                         mouseY) {
    if (this.currRegion)
        this.currRegion.mousemove (mouseX, mouseY, this.view);
};

World.prototype.regionUpdateAllCanvasLayers = function (
                                                      regionName) {
    this.regions[regionName].updateAllCanvasLayers ();
};

World.prototype.alignAllCanvasLayersToDummy = function (
                                                      regionName) {
    this.regions[regionName].alignAllCanvasLayersToDummy (
        this.dummyCanvas);
};

World.prototype.alignAllCanvasLayersToView = function (
                                                      regionName) {
    this.regions[regionName].alignAllCanvasLayersToView (this.view);
};

/***********************************************************************
* Region object
***********************************************************************/


function Region (argsDict) {

    var defaultPropsDict = {
        name: 'default',
        x: 0,
        y: 0,
        width: (proto.activeWorld ? proto.activeWorld.width : 0),
        height: (proto.activeWorld ? proto.activeWorld.height : 0),
        turnLength: 1000 /* in ms */
    }

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);

    this.users = {};
    this.things = {};
    this.setupFunctions = [];
    this.takedownFunctions = [];
    this.turnFunctions = [];
    this.me = null;
};

Region.prototype.allSpritesLoaded = function () {
    var allSpritesLoaded = true;
    for (var i in this.things) {
        allSpritesLoaded = 
            allSpritesLoaded && 
            this.things[i].allSpritesLoaded ()
    }
    return allSpritesLoaded;
};

Region.prototype.startTurnEvents = function (fn) {
    var that = this;
    if (this.turnTimeout) {
        clearTimeout (this.turnTimeout);
    }
    this.turnTimeout = setTimeout (function setReady () {
        //console.log ('EventFunction: ' + this.name + ' spinning');
        for (var i in that.turnFunctions) {
            that.turnFunctions[i] ();
        }
        if (that.turnFunctions.length > 0) {
            if (this.turnTimeout) {
                clearTimeout (this.turnTimeout);
            }
            this.turnTimeout = setTimeout (setReady, that.turnLength);
        }
    }, this.turnLength);
};

Region.prototype.addTurnFunction = function (fn) {
    this.turnFunctions.push (fn);
    if (this.turnFunctions.length === 1) {
        this.startTurnEvents ();
    }
};

Region.prototype.addSetupFunction = function (fn) {
    this.setupFunctions.push (fn);
};

Region.prototype.addTakedownFunction = function (fn) {
    this.takedownFunctions.push (fn);
};

Region.prototype.setup = function () {
    this.unhideAllThings ();
    for (var i in this.setupFunctions) {
        this.setupFunctions[i] ();
    }
};

Region.prototype.takedown = function () {
    this.hideAllThings ();
    for (var i in this.takedownFunctions) {
        this.takedownFunctions[i] ();
    }
};

Region.prototype.getState = function () {

    var stateObjs = {};

    for (var thingName in this.things) {
        if (this.things[thingName].isPersistent) {
            stateObjs[thingName] =
                this.things[thingName].getState ();
        }
    }

    return stateObjs;

};

Region.prototype.setState = function (stateObjs) {

    for (var stateObjName in stateObjs) {
        if (!this.things[stateObjName]) {
            proto.DEBUG && console.log ('Warning: Region.setState: Region does ' +
                         'not have a Thing named ' + stateObjName);
            continue;
        }
        this.things[stateObjName].setState (
            stateObjs[stateObjName]);
    }

};

//draw ():
//    loop through all things and users in the region
//        if they're in your view, draw them
Region.prototype.draw = function (view) {
    // draw all users
    for (var userId in this.users) {
        this.users[userId].draw (view);
    }
    // draw all things
    var thingsDrawn = [];
    for (var thingName in this.things) {
        var thing = this.things[thingName];
        if (thing.draw (view) && thing.isSolid)
            thingsDrawn.push (thing);
    }

    if (thingsDrawn.length !== 0)
        this.checkCollisions (thingsDrawn);
};

// O(n^2) algorithm. Don't make lots of solid things
Region.prototype.checkCollisions = function (thingsDrawn) {
    for (var i in thingsDrawn) {
        var thing1 = thingsDrawn[i];
        for (var j = i + 1; j < thingsDrawn.length; ++j) {
            var thing2 = thingsDrawn[j];
            if (thing1.collisionCheck (thing2)) {
                thing1.setIsInCollision (true);
                thing2.setIsInCollision (true);
            } else {
                thing1.setIsInCollision (false);
                thing2.setIsInCollision (false);
            }
        }
    }
};

Region.prototype.addUser = function (user) {
    if (user.id === -1) {
        this.me = user;
    }
    this.users[user.id] = user;
};

Region.prototype.deleteUser = function (userId) {
    if (userId === -1) {
        this.me = null;
    }
    delete (this.users[userId]);
};

Region.prototype.addThing = function (thing) {
    proto.DEBUG && console.log ('Region.addThing: thing.name = ' + thing.name);
    if (thing.name === '' || 
        $.inArray (thing.name, Object.keys (this.things)) !== -1) {
        thing.name = Object.keys (this.things).length;
        proto.DEBUG && console.log ('renaming ' + thing.name);
    }
    this.things[thing.name] = thing;
};

Region.prototype.deleteThing = function (thing) {
    this.things[thing.name].hide (true);
    delete (this.things[thing.name]);
};

Region.prototype.keydown = function (userId, key, view) {

    proto.DEBUG && console.log ("region.keydown: key, userId = " + key + 
                 ", " + userId);
    this.users[userId].keydown (key, userId);

    for (var thingName in this.things) {
        this.things[thingName].keydown (key)
    }
};

Region.prototype.keyup = function (userId, key, view) {

    proto.DEBUG && console.log ("region.keyup: key, userId = " + key + 
                 ", " + userId);
    this.users[userId].keyup (key, userId);

    for (var thingName in this.things) {
        this.things[thingName].keyup (key)
    }
};

Region.prototype.keypress = function (userId, key) {
    proto.DEBUG && console.log ('Region.keyPress');
    this.users[userId].keypress (key);
    for (var thingName in this.things) {
        this.things[thingName].keydown (key)
    }
};

Region.prototype.click = function (mouseX, mouseY, view) {
    proto.DEBUG && console.log ('Region.click');
    var topmost = null;
    for (var thingName in this.things) {
        if (this.things[thingName].isClickable &&
            !this.things[thingName].isHidden &&
            this.things[thingName].clickedInBox (mouseX, mouseY, 
                                                    view)) {
            if (topmost == null ||
                topmost.getTopZindex () < 
                this.things[thingName].getTopZindex ()) {
                topmost = this.things[thingName];
            } 
        }
    }
    if (topmost) {
        proto.DEBUG && console.log ('Region.click: clicking ' + topmost);
        topmost.click (mouseX, mouseY);
    }
};

Region.prototype.mousedown = function (mouseX, mouseY, view) {
    for (var thingName in this.things) {
        if (this.things[thingName].isDraggable &&
            !this.things[thingName].isHidden &&
            this.things[thingName].clickedInBox (mouseX, mouseY, 
                                                    view)) {
            this.things[thingName].isBeingDragged = true;
            this.things[thingName].setMouseClickCoords (mouseX, mouseY);

        }
    }
};

Region.prototype.mouseup = function (mouseX, mouseY, view) {
    for (var thingName in this.things) {
        if (this.things[thingName].isDraggable &&
            !this.things[thingName].isHidden && 
            this.things[thingName].isBeingDragged) {

            this.things[thingName].isBeingDragged = false;
            this.things[thingName].drop (mouseX, mouseY);
        }
    }
};

Region.prototype.mousemove = function (mouseX, mouseY, view) {
    var thing;

    var topmost = null;
    for (var thingName in this.things) {
        thing = this.things[thingName];
        if (thing.isDraggable &&
            thing.isBeingDragged) {
            if (topmost == null ||
                topmost.getTopZindex () < 
                thing.getTopZindex ()) {
                topmost = thing; 
            } 
        }
    }
    if (topmost) {
        topmost.drag (mouseX, mouseY);
    }

    for (var thingName in this.things) {
        thing = this.things[thingName];

        // setup mouseIsInside variable
        if ((thing.isMouseoverable || thing.isMouseoffable) &&
            thing.mouseIsInside == undefined) {
            //proto.DEBUG && console.log ('setup');
            if (thing.clickedInBox (mouseX, mouseY, view)) {
                thing.mouseIsInside = true;
            } else {
                thing.mouseIsInside = false
            }
        }


        if (thing.isMouseoverable && 
            thing.mouseIsInside == false &&
            thing.clickedInBox (mouseX, mouseY, view)) {
            thing.mouseover (mouseX, mouseY);
            thing.mouseIsInside = true; 
        } 

        if (thing.isMouseoffable &&
            thing.mouseIsInside == true &&
            !thing.clickedInBox (mouseX, mouseY, view)) {
            thing.mouseoff (mouseX, mouseY);
            thing.mouseIsInside = false; 
        } 

        if (thing.isHoverable &&
            !thing.clickedInBox (mouseX, mouseY, view)) {
            thing.mouseIsInside = false; 
            //thing.hover (mouseX, mouseY);
        } 

        if (thing.isHoverable &&
            thing.clickedInBox (mouseX, mouseY, view)) {
            thing.hover (mouseX, mouseY);
            thing.mouseIsInside = true; 
        } 
    }
};

Region.prototype.updateAllCanvasLayers = function () {
    for (var thingName in this.things) {
        this.things[thingName].updateAllCanvasLayers ();
    }
    for (var userId in this.users) {
        this.users[userId].updateAllCanvasLayers ();
    }
};

Region.prototype.alignAllCanvasLayersToView = function (view) {
    for (var thingName in this.things) {
        this.things[thingName].alignAllCanvasLayersToView (view);
    }
    for (var userId in this.users) {
        this.users[userId].alignAllCanvasLayersToView (view);
    }
};

Region.prototype.alignAllCanvasLayersToDummy = 
    function (dummyCanvas) {

    for (var thingName in this.things) {
        this.things[thingName].alignAllCanvasLayersToDummy (
            dummyCanvas);
    }
    for (var userId in this.users) {
        this.users[userId].alignAllCanvasLayersToDummy (
            dummyCanvas);
    }
};

Region.prototype.hideAllThings = function () {
    for (var thingName in this.things) {
        this.things[thingName].hide ();
    }
};

Region.prototype.unhideAllThings = function () {
    for (var thingName in this.things) {
        this.things[thingName].unhide ();
    }
};




/***********************************************************************
* View object
***********************************************************************/


function View (x, y, w, h) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
}

View.prototype.moveTo = function (x, y) {
    this.x = x;
    this.y = y;
    world.currRegion.updateAllCanvasLayers ();
};

View.prototype.moveToRelative = function (x, y) {
    this.x += x;
    this.y += y;
    world.currRegion.updateAllCanvasLayers ();
};

View.prototype.resize = function (w, h) {
    if (w !== null) this.width = w;
    if (h !== null) this.height = h;
};

function viewCreateFromObj (obj) {
    return new View (obj.x, obj.y, obj.width, obj.height);
};



/***********************************************************************
* User object
***********************************************************************/


function User (id) {
    this.id = id;
    this.keydownFunctions = [];
    this.keyupFunctions = [];
}

User.prototype.draw = function (view) {
}

User.prototype.moveTo = function (x, y) {
}

User.prototype.moveToRelative = function (x, y) {
}

User.prototype.scale = function (xScaleFactor, yScaleFactor) {
}

User.prototype.addAvatar = function (thing) {
}

User.prototype.addKeydownFunction = function (keydownFunction) {
    this.keydownFunctions.push (keydownFunction);
};

User.prototype.keydown = function (key, otherUid) {
    for (var i in this.keydownFunctions) {
        this.keydownFunctions[i] (key);
    }
}

User.prototype.keyup = function (key, otherUid) {
    for (var i in this.keyupFunctions) {
        this.keyupFunctions[i] (key);
    }
}

User.prototype.keypress = function (key) {
    for (var i in this.keydownFunctions) {
        this.keydownFunctions[i] (key);
    }
}

User.prototype.updateAllCanvasLayers = function () {
}

User.prototype.alignAllCanvasLayersToDummy = 
    function (dummyCanvas) {

}

User.prototype.alignAllCanvasLayersToView = function (view) {
}


/***********************************************************************
* Me object
***********************************************************************/

function Me () {
    var myId = -1;

    // add User's properties                   
    User.call (this, myId);
}

// inherit from User
Me.prototype = Object.create (User.prototype);



/***********************************************************************
* Private EventFunction object
***********************************************************************/

function EventFunction (name, fn, frequency) {
    this.frequency = typeof frequency === 'undefined' ? 0 : frequency;
    this.name = name;
    this.fn = fn;
    this.isOn = false;
    this.evtTimeout = null;
}

EventFunction.prototype.call = function () {
    this.fn ();
};

EventFunction.prototype.turnOn = function () {
    proto.DEBUG && console.log ('EventFunction: setReady: turning on evt fn');
    this.isOn = true;

    if (this.frequency === 0) {
        $(document).on (this.name, this.fn);
    } else {

	    var that = this;
	    if (this.evtTimeout) {
	        clearTimeout (this.evtTimeout);
	    }
	    this.evtTimeout = setTimeout (function setReady () {
            //console.log ('EventFunction: ' + this.name + ' spinning');
	        that.call ();
	        if (that.isOn) {
	            if (this.evtTimeout) {
	                clearTimeout (this.evtTimeout);
	            }
	            this.evtTimeout = setTimeout (setReady, that.frequency);
	        }
	    }, this.frequency);
    }
};

EventFunction.prototype.turnOff = function () {
    this.isOn = false;
    if (this.frequency === 0) {
        $(document).unbind (this.name, this.fn);
    }
};


/***********************************************************************
* Thing object
***********************************************************************/

function Thing (argsDict) {

    proto.DEBUG && console.log ('Thing argsDict = ');
    proto.DEBUG && console.debug (argsDict);

    // x, y, w, h set the collision rectangle, they don't correspond to
    // the location and sizes of the avatar's sprites
    var defaultPropsDict = {
        name: 'default',
        x: 0,
        y: 0,
        width: (proto.activeWorld ? proto.activeWorld.width : 0),
        height: (proto.activeWorld ? proto.activeWorld.height : 0),
        isSolid: false,
        isInteractive: false,
        isClickable: false,
        isPersistent: false,
        isMouseoverable: false,
        isMouseoffable: false,
        isDraggable: false,
        isHoverable: false,
        isFixed: false
    };

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);

    proto.DEBUG && console.log (this);

    this.isBeingDragged = false;

    this.isHidden = false;
    this.isVisible = true;

    this.mouseIsInside;

    this.canvasLayers = {};
    this.videos = {};
    this.audioTracks = {};
    this.iframes = {};

    this.clickFunctions = [];
    this.mouseoverFunctions = [];
    this.mouseoffFunctions = [];
    this.hoverFunctions = [];
    this.keydownFunctions = [];
    this.keyupFunctions = [];
    this.dragFunctions = [];
    this.dropFunctions = [];
    this.eventFunctions = {};

    this.mouseClickX;
    this.mouseClickY;

    this.xVelocity = 0; // in pixels per second
    this.yVelocity = 0; // in pixels per second
    this.motionTimeout = null;
    this.frameRate = 100; // in milliseconds per frame
    this.gravity = 0;

}

Thing.prototype.setIsClickable = function (isClickable) {
    this.isClickable = isClickable;
};

Thing.prototype.setIsMouseoverable = function (isMouseoverable) {
    this.isMouseoverable = isMouseoverable;
};

Thing.prototype.setIsMouseoffable = function (isMouseoffable) {
    this.isMouseoffable = isMouseoffable;
};

Thing.prototype.allSpritesLoaded = function () {
    var allSpritesLoaded = true;
    for (var i in this.canvasLayers) {
        allSpritesLoaded = 
            allSpritesLoaded && 
            this.canvasLayers[i].allSpritesLoaded ()
    }
    return allSpritesLoaded;
}

Thing.prototype.setGravity = function (accG) {
    this.gravity = accG;
}


Thing.prototype.setVelocity = function (xVelocity, yVelocity) {

    var isInMotion = false;
    if (this.xVelocity !== 0 || this.yVelocity !== 0) {
        isInMotion = true;
    }
    this.xVelocity = xVelocity;
    this.yVelocity = yVelocity;

    if (isInMotion) return;

    if (this.xVelocity !== 0 || this.yVelocity !== 0) {
        var that = this;

        if (this.motionTimeout) {
            clearTimeout (this.motionTimeout);
            this.motionTimeout = null;
        }
        this.motionTimeout = setTimeout (
            function moveForward () {
	            proto.DEBUG && console.log ('setVelocity timeout');
	
	            that.yVelocity = that.yVelocity + 
	                (that.frameRate / 1000) * that.gravity;
	
	            that.moveToRelative (
	                that.xVelocity * (that.frameRate / 1000),
	                that.yVelocity * (that.frameRate / 1000));
	
	            if (this.motionTimeout) {
	                clearTimeout (this.motionTimeout);
	                this.motionTimeout = null;
	            }
	            if (that.xVelocity !== 0 || that.yVelocity !== 0) {
	                setTimeout (moveForward, that.frameRate);
	            }
        }, this.frameRate);
    } else {
        if (this.motionTimeout) {
            clearTimeout (this.motionTimeout);
            this.motionTimeout = null;
        }
    }
};

Thing.prototype.setMouseClickCoords = function (mouseX, mouseY) {
    this.mouseClickX = mouseX - this.x;
    this.mouseClickY = mouseY - this.y;
};

Thing.prototype.getTopZindex = function () {
    if (this.cachedZindex) {
        return this.cachedZindex;
    } 
    
    var topmostZindex = null;
    for (var canvasLayerName in this.canvasLayers) {
        if (topmostZindex == null ||
            topmostZindex < 
            this.canvasLayers[canvasLayerName].zIndex) {
            topmostZindex = 
                this.canvasLayers[canvasLayerName].zIndex;
        }
    }
    this.cachedZindex = topmostZindex;
    return topmostZindex;
}


Thing.prototype.setCollRect = function (x, y, w, h) {
    this.x = x;
    this.y = y;
    this.height = h;
    this.width = w;
}

Thing.prototype.setCollRectRel = function (x, y, w, h) {
    this.x += x;
    this.y += y;
    this.height += h;
    this.width += w;
}

Thing.prototype.addVideo = function (video) {
    this.videos[video.name] = video;
}

Thing.prototype.addAudioTrack = function (audioTrack) {
    this.audioTracks[audioTrack.name] = audioTrack;
}

Thing.prototype.getAudioTrack = function (audioTrackName) {
    if (audioTrackName == "") {
        for (var audioTrackName in this.audioTracks) {
            return this.audioTracks[audioTrackName];
        }
    } else {
        return this.audioTracks[audioTrackName];
    }
}

Thing.prototype.playAudioTrack = function (audioTrackName) {
    if (audioTrackName == "") {
        for (var audioTrackName in this.audioTracks) {
            this.audioTracks[audioTrackName].play ();
        }
    } else {
        this.audioTracks[audioTrackName].play ();
    }
}

Thing.prototype.pauseAudioTrack = function (audioTrackName) {
    if (audioTrackName == "") {
        for (var audioTrackName in this.audioTracks) {
            this.audioTracks[audioTrackName].pause ();
        }
    } else {
        this.audioTracks[audioTrackName].pause ();
    }
}

Thing.prototype.addIframe = function (iframe) {
    this.iframes[iframe.name] = iframe;
}

Thing.prototype.iframeSetSrc = function (iframeName, url) {
    this.iframes[iframeName].setSrc (url);
}

Thing.prototype.iframeGetSrc = function (iframeName, url) {
    this.iframes[iframeName].getSrc (url);
}


Thing.prototype.addClickFunction = function (fn, makeClickable) {
    if (makeClickable !== undefined)
        this.isClickable = makeClickable;
    this.clickFunctions.push (fn);
}

Thing.prototype.addMouseoverFunction = function (fn) {
    this.mouseoverFunctions.push (fn);
}

Thing.prototype.addMouseoffFunction = function (fn) {
    this.mouseoffFunctions.push (fn);
}

Thing.prototype.addHoverFunction = function (fn) {
    this.hoverFunctions.push (fn);
}

Thing.prototype.addKeydownFunction = function (fn) {
    this.keydownFunctions.push (fn);
}

Thing.prototype.addArrowFunctions = function (argsDict) {
    var arrowsFn = function (key) {
        proto.DEBUG && console.log ('arrowsFn');
        switch (key) {
            case proto.LEFT:
                argsDict['left'] ();
                break;
            case proto.RIGHT:
                argsDict['right'] ();
                break;
            case proto.UP:
                argsDict['up'] ();
                break;
            case proto.DOWN:
                argsDict['down'] ();
                break;
        }
    }
    this.keydownFunctions.push (arrowsFn);
};

Thing.prototype.addKeyleftFunction = function (fn) {
    var keyleftFn = function (key) {
        if (key === proto.LEFT) fn ();
    }
    this.keydownFunctions.push (keyleftFn);
};

Thing.prototype.addKeyupFunction = function (fn) {
    this.keyupFunctions.push (fn);
}

/*
Parameters:
   fn - a function with two params (mouseX, mouseY) 
*/
Thing.prototype.addDragFunction = function (fn, makeDraggable) {
    makeDraggable = 
        typeof makeDraggable === 'undefined' ? false : makeDraggable;
    this.dragFunctions.push (fn);
    this.isDraggable = makeDraggable;
};

/*
Parameters:
   fn - a function with two params (mouseX, mouseY) 
Preconditions:
    - thing is draggable 
*/
Thing.prototype.addDropFunction = function (fn) {
    if (!this.isDraggable) {
        proto.err ('Thing.addDropFunction: thing is not dragable');
        return;
    }
    this.dropFunctions.push (fn);
};

Thing.prototype.addEventFunction = function (name, fn, frequency) {
    var newEvtFn = new EventFunction (name, fn, frequency);
    this.eventFunctions[name] = newEvtFn;
};

Thing.prototype.turnOffEventFunction = function (name) {
    if (typeof name == 'undefined') {
        for (var eventFunctionName in this.eventFunctions) {
            this.eventFunctions[eventFunctionName].turnOff ();
        }
    } else {
        this.eventFunctions[name].turnOff ();
    }
};

Thing.prototype.turnOnEventFunction = function (name) {
    if (typeof name == 'undefined') {
        for (var eventFunctionName in this.eventFunctions) {
            this.eventFunctions[eventFunctionName].turnOn ();
        }
    } else {
        this.eventFunctions[name].turnOn ();
    }
};

Thing.prototype.click = function (mouseX, mouseY) {
    proto.DEBUG && console.log ('Thing.click: click!');
    for (var i in this.clickFunctions) {
        this.clickFunctions[i] (mouseX, mouseY);
    }
}

Thing.prototype.drag = function (mouseX, mouseY) {
    /*for (var canvasLayerName in this.canvasLayers) {
        this.canvasLayers[canvasLayerName].
             imageMoveTo (mouseX - this.mouseClickX, 
                            mouseY - this.mouseClickY);
    }*/
    /*this.x = mouseX - this.mouseClickX;
    this.y = mouseY - this.mouseClickY;*/

    for (var i in this.dragFunctions) {
        this.dragFunctions[i] (mouseX, mouseY);
    }
};

Thing.prototype.drop = function (mouseX, mouseY) {
    proto.DEBUG && console.log ('Thing.drop');
    for (var i in this.dropFunctions) {
        this.dropFunctions[i] (mouseX, mouseY);
    }
};

Thing.prototype.keydown = function (key) {
    proto.DEBUG && console.log ('Thing.keydown: keydown ' + key);
    for (var i in this.keydownFunctions) {
        this.keydownFunctions[i] (key);
    }
}

Thing.prototype.keyup = function (key) {
    proto.DEBUG && console.log ('Thing.keyup: keyup ' + key);
    for (var i in this.keyupFunctions) {
        this.keyupFunctions[i] (key);
    }
}

Thing.prototype.mouseover = function (mouseX, mouseY) {
    for (var i in this.mouseoverFunctions) {
        this.mouseoverFunctions[i] (mouseX, mouseY);
    }
}

Thing.prototype.mouseoff = function (mouseX, mouseY) {
    for (var i in this.mouseoffFunctions) {
        this.mouseoffFunctions[i] (mouseX, mouseY);
    }
}

Thing.prototype.hover = function (mouseX, mouseY) {
    for (var i in this.hoverFunctions) {
        this.hoverFunctions[i] (mouseX, mouseY);
    }
}

Thing.prototype.deleteAllAttributes = function () {
    for (var canvasLayerName in this.canvasLayers) {
        this.canvasLayers[canvasLayerName].deleteAllAttributes ();
    }
}

Thing.prototype.addCanvasLayer = function (canvasLayer) {
    this.canvasLayers[canvasLayer.name] = canvasLayer;
}

Thing.prototype.draw = function (view) {

    var drewSomething = false;

    if (this.isFixed) {
        drewSomething = this.drawFixed ();
        return;
    }
    
    // loop through animations and sprites and draw them
    for (var canvasLayerName in this.canvasLayers) {
        if (this.canvasLayers[canvasLayerName].isUpdated === false) {
            this.canvasLayers[canvasLayerName].draw (view);
            drewSomething = true;
        }
    }
    // add animations //
    return drewSomething;
}

Thing.prototype.drawFixed = function () {

    var drewSomething = false;
    var tmpView = new View (0, 0, 0, 0);
    
    // loop through animations and sprites and draw them
    for (var canvasLayerName in this.canvasLayers) {
        if (this.canvasLayers[canvasLayerName].isUpdated == false) {
            this.canvasLayers[canvasLayerName].drawFixed (tmpView);
            drewSomething = true;
        }
    }
    // add animations //
    return drewSomething;
}

Thing.prototype.moveTo = function (x, y, maintainOffset) {
    maintainOffset = 
        maintainOffset === undefined ? false : maintainOffset;
    for (var canvasLayerName in this.canvasLayers) {
        if (maintainOffset) {
            this.canvasLayers[canvasLayerName].
                imageMoveToMaintainOffset (x, y, this.x, this.y);
        } else {
            this.canvasLayers[canvasLayerName].imageMoveTo (
                x, y, maintainOffset);
        }
    }
    this.x = x;
    this.y = y;
}

Thing.prototype.moveToRelative = function (x, y) {
    this.x += x;
    this.y += y;
    for (var canvasLayerName in this.canvasLayers) {
        this.canvasLayers[canvasLayerName].
            imageMoveToRelative (x, y);
    }
}

Thing.prototype.scale = function (xScaleFactor, yScaleFactor) {
    this.width *= xScaleFactor;
    this.height *= yScaleFactor;
    for (var canvasLayerName in this.canvasLayers) {
        this.canvasLayers[canvasLayerName].
            imageScale (xScaleFactor, yScaleFactor);
    }
}

/*
collisionCheck -
    Returns true if this collision rectangle overlaps obj's collision
rectangle, false otherwise.
*/
Thing.prototype.collisionCheck = function (obj) {
    proto.DEBUG && console.log ('collisionCheck: ' +
                 'this.x = ' + this.x + ', ' + 
                 'this.width = ' + this.width + ', ' + 
                 'obj.x = ' + obj.x + ', ' + 
                 'obj.width = ' + obj.width);
    if (obj.x + obj.width > this.x && 
        obj.x < this.x + this.width &&
        obj.y + obj.height > this.y && 
        obj.y < this.y + this.height) {
        return true;
    } 
    return false;
}

/*
clickedInBox -
    Returns true if the mouse position is inside of this collision
rectangle, false otherwise. 
*/
Thing.prototype.clickedInBox = function (mouseX, mouseY, view) {
    if (!this.isFixed) {
        if (mouseX > this.x - view.x && 
            mouseX < this.x - view.x + this.width &&
            mouseY > this.y - view.y && 
            mouseY < this.y - view.y + this.height) {
            return true;
        }
    } else {
        if (mouseX > this.x && 
            mouseX < this.x + this.width &&
            mouseY > this.y && 
            mouseY < this.y + this.height) {
            return true;
        }
    }
    return false;
}

Thing.prototype.updateAllCanvasLayers = function () {
    for (var canvasLayerName in this.canvasLayers) {
        this.canvasLayers[canvasLayerName].isUpdated = false;
    }
}

Thing.prototype.alignAllCanvasLayersToDummy = 
    function (dummyCanvas) {

    for (var canvasLayerName in this.canvasLayers) {
        this.canvasLayers[canvasLayerName].alignToDummy (
            dummyCanvas);
    }
}

Thing.prototype.alignAllCanvasLayersToView = function (view) {
    for (var canvasLayerName in this.canvasLayers) {
        this.canvasLayers[canvasLayerName].
            resize (view.width, view.height);
    }
}

//Avatar.prototype.checkCollisions = function (size of avatar):
//    loop through all things in the current region
//        if they're solid, check for collision by comparing sizes and
//            locations

Thing.prototype.hide = function (force /* optional */) {
    force = typeof force === 'undefined' ? false : true;

    for (var i in this.eventFunctions) {
        this.eventFunctions[i].turnOff ();
    }

    if (force) this.setIsVisible (false);

    this.isHidden = true;

    for (var canvasLayerName in this.canvasLayers) {
        this.canvasLayers[canvasLayerName].hide ();
    }
    for (var videoName in this.videos) {
        this.videos[videoName].hide ()
    }
    for (var iframeName in this.iframes) {
        this.iframes[iframeName].hide ()
    }
}

Thing.prototype.unhide = function (force /* optional */) {
    force = typeof force === 'undefined' ? false : true;

    for (var i in this.eventFunctions) {
        this.eventFunctions[i].turnOn ();
    }

    if (force) this.setIsVisible (true);

    if (!this.isVisible) return;

    this.isHidden = false;

    for (var canvasLayerName in this.canvasLayers) {
        this.canvasLayers[canvasLayerName].unhide ();
    }
    for (var videoName in this.videos) {
        this.videos[videoName].unhide ()
    }
    for (var iframeName in this.iframes) {
        this.iframes[iframeName].unhide ()
    }
}

Thing.prototype.setIsVisible = function (visibility) {
    if (visibility) {
        this.isVisible = true;
    } else {
        this.isVisible = false;
    }
    for (var canvasLayerName in this.canvasLayers) {
        this.canvasLayers[canvasLayerName].
            setIsVisible (visibility);
    }
    for (var videoName in this.videos) {
        this.videos[videoName].setIsVisible (visibility);
    }
    for (var iframeName in this.iframes) {
        this.iframes[iframeName].setIsVisible (visibility);
    }
}



/***********************************************************************
Button object
Description: creates a button and automatically adds a sprite and text
    object using the image path and text specified in the parameters.
    The button will call clickFunction when pressed.
***********************************************************************/

function Button (name, x, y, width, height, zIndex, buttonImagePath,
                 text, font, fontSize, clickFunction, view) {
    var buttonSpr, buttonCanvas, buttonText;

    // add Thing's properties                   
    Thing.call (this, name, x, y, width, height);
    this.isClickable = true;

    buttonCanvas = new CanvasLayer ({
        'name': name, 
        'w': view.width,
        'h': view.height, 
        'zIndex': zIndex, 
        'isUpdated': false
    });

    buttonSpr = new Sprite ({
        name: name, 
        x: x, 
        y: y, 
        width: width, 
        height: height, 
        imageSrc: buttonImagePath
    });

    buttonText = new Text ({
        name: name, 
        x: x + 40, 
        y: y + 10, 
        fontSize: fontSize, 
        font: font,
        lineLength: 10000, 
        lineWidt: width - 80, 
        string: text
    });

    buttonCanvas.addSprite (buttonSpr);
    buttonCanvas.addText (buttonText);
                                         
    this.addClickFunction (clickFunction);

    this.addCanvasLayer (buttonCanvas);
}

// inherit from Thing
Button.prototype = Object.create (Thing.prototype);

/*
Make the button show the new image whenever it gets mouseovered 
*/
Button.prototype.addMouseoverImage = function (imagePath) {
    var hoverSpr;

    this.isMouseoverable = true;
    this.isMouseoffable = true;

    hoverSpr = new Sprite ({
        name: this.name + "_hover", 
        x: this.x, 
        y: this.y, 
        width: this.width, 
        height: this.height, 
        imageSrc: imagePath, 
        isHidden: true
    });
    this.canvasLayers[this.name].addSprite (hoverSpr);
    
    var that = this;
    this.addMouseoverFunction (function () {
        that.canvasLayers[that.name].
             sprites[that.name + "_hover"].isHidden = false;
        that.canvasLayers[that.name].
             sprites[that.name].isHidden = true;
        that.canvasLayers[that.name].isUpdated = false;

    });

    this.addMouseoffFunction (function () {
        that.canvasLayers[that.name].
             sprites[that.name + "_hover"].isHidden = true;
        that.canvasLayers[that.name].
             sprites[that.name].isHidden = false;
        that.canvasLayers[that.name].isUpdated = false;

    });

}


/***********************************************************************
CommonThing object
Description: A Thing object whose sprite object and collision box
    have the same dimension and whose canvas is the standard size.
    CommonThing objects do not have is_* attributes set.
    One of the purposes of the CommonThing object is to abstract
    some of the features of CanvasLayer, Sprite, and Text.
***********************************************************************/

function CommonThing (argsDict) {//x, y, width, height, zIndex, view,
                       //imagePaths /*optional*/) {
    argsDict = typeof argsDict === 'undefined' ? {} : argsDict;

    var thingSpr, thingCanvas;

    proto.DEBUG && console.log ('argsDict = ');
    proto.DEBUG && console.debug (argsDict);

    var defaultPropsDict = {
        zIndex: 0,
        view: proto.activeWorld.view,
        imagePaths: null,
        clearOnDraw: true
    }

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);

    // add Thing's properties                   
    Thing.call (this, argsDict);

    proto.DEBUG && console.log (this);

    thingCanvas = new CanvasLayer ({
        'name': this.name, 
        'w': this.view.width, 
        'h': this.view.height, 
        'zIndex': this.zIndex, 
        'isUpdated': false,
        'clearOnDraw': this.clearOnDraw
    });

    if (typeof this.imagePaths === 'string') { // 1 img only
        var spr = new Sprite ({
            name: this.name, 
            x: this.x, 
            y: this.y, 
            width: this.width, 
            height: this.height, 
            imageSrc: this.imagePaths
        });
        thingCanvas.addSprite (spr);
    } else if (typeof this.imagePaths === 'object') { // array specified
        var spr;
        for (var i in this.imagePaths) {
            spr = new Sprite ({
                name: this.name + "_" + i, 
                x: this.x, 
                y: this.y, 
                width: this.width, 
                height: this.height, 
                imageSrc: this.imagePaths[i]
            });
            thingCanvas.addSprite (spr);
        }
    }

    this.addCanvasLayer (thingCanvas);
}

// inherit from Thing
CommonThing.prototype = Object.create (Thing.prototype);

CommonThing.prototype.clearCanvases = function () {
    for (var i in this.canvasLayers) {
        var canvas = this.canvasLayers[i];
        canvas.clear ();
    }
};

CommonThing.prototype.refreshCanvases = function () {
    for (var i in this.canvasLayers) {
        var canvas = this.canvasLayers[i];
        canvas.isUpdated = false;
    }
};

CommonThing.prototype.getTopCanvas = function () {
    var topCanvas = null;
    for (var i in this.canvasLayers) {
        var canvas = this.canvasLayers[i];
        if (topCanvas === null)
            topCanvas = canvas;
        else if (canvas.zIndex > topCanvas.zIndex)
            topCanvas = canvas;
    }
    return topCanvas;
};

CommonThing.prototype.addPath = function (varArgs, zIndex) {
    varArgs = typeof varArgs === 'undefined' ? {} : varArgs;

    var path;
    if (varArgs instanceof Path) {
        //proto.DEBUG && console.log ('instance of');
        path = varArgs;
    } else {
        path = new Path (varArgs);
    }
 
    if (typeof zIndex === 'undefined') {
        this.getTopCanvas ().addPath (path);
        //proto.DEBUG && console.log (path.owner);
        path.owner = this.getTopCanvas ();
        //proto.DEBUG && console.log (path.owner);
        //proto.DEBUG && console.log ('ownership set');
    } else {

        var len = 0;
        for (var canvasLayerName in this.canvasLayers) {
            if (this.canvasLayers[canvasLayerName].zIndex == 
                zIndex) {
                this.canvasLayers[canvasLayerName].addPath (path);
                path.owner = this.canvasLayers[canvasLayerName];
                return path;
            }
            len++;
        }

        var viewWidth = proto.activeWorld.view.width;
        var viewHeight = proto.activeWorld.view.height;
 
        var thingCanvas = new CanvasLayer ({
            'name': this.name + '_' + len, 
            'w': viewWidth,
            'h': viewHeight, 
            'zIndex': zIndex, 
            'isUpdated': false,
            'clearOnDraw': this.clearOnDraw
        });

        thingCanvas.addPath (path);
        path.owner = this.canvasLayers[thingCanvas.name];
        this.addCanvasLayer (thingCanvas);
    }

    return path;

}

CommonThing.prototype.addCircle = function (varArgs) {
    var circle;
    var x = varArgs['x'];
    var y = varArgs['y'];
    varArgs['x'] = typeof x === 'undefined' ? this.x : x;
    varArgs['y'] = typeof y === 'undefined' ? this.y : y;
    if (varArgs instanceof Circle) {
        circle = varArgs;
    } else {
        circle = new Circle (varArgs);
    }

    return this.addPath (circle);
};

CommonThing.prototype.addRect = function (argsDict) {
    argsDict = typeof argsDict === 'undefined' ? {} : argsDict;

    var name = argsDict['name'];
    var x = argsDict['x'];
    var y = argsDict['y'];
    var width = argsDict['width'];
    var height = argsDict['height'];
    var zIndex = argsDict['zIndex'];

    argsDict['x'] = typeof x === 'undefined' ? this.x : x;
    argsDict['y'] = typeof y === 'undefined' ? this.y : y;
    argsDict['width'] = 
        typeof width === 'undefined' ? this.width : width;
    argsDict['height'] = 
        typeof height === 'undefined' ? this.height : height;

    if (argsDict instanceof Rect) {
        var rect = argsDict;

    } else {

        proto.DEBUG && console.log ('addRect: '); 
        var rect = new Rect (argsDict);
        proto.DEBUG && console.log (rect);

    }
 
    if (typeof zIndex === 'undefined') {
        this.getTopCanvas ().addRect (rect);
        rect.owner = this.getTopCanvas ();
    } else {

        var len = 0;
        for (var canvasLayerName in this.canvasLayers) {
            if (this.canvasLayers[canvasLayerName].zIndex ===
                zIndex) {
                this.canvasLayers[canvasLayerName].addRect (rect);
                return rect;
            }
            len++;
        }

        var viewWidth = proto.activeWorld.view.width;
        var viewHeight = proto.activeWorld.view.height;

        proto.DEBUG && console.log ('creating new canvasLayer');
 
        var thingCanvas = new CanvasLayer ({
            'name': this.name + '_' + len, 
            'w': viewWidth,
            'h': viewHeight, 
            'zIndex': zIndex, 
            'isUpdated': false,
            'clearOnDraw': this.clearOnDraw
        });

        thingCanvas.addRect (rect);
        rect.ownder = thingCanvas;
        this.addCanvasLayer (thingCanvas);
    }

    return rect;

}

CommonThing.prototype.unhideRect = function (rectName) {
    for (var canvasLayerName in this.canvasLayers) {
        if (this.canvasLayers[canvasLayerName].rects[rectName]) {
            this.canvasLayers[canvasLayerName].rects[rectName].
                isHidden = false;
            this.canvasLayers[canvasLayerName].isUpdated = false;
        }
    }
}

CommonThing.prototype.hideRect = function (rectName) {
    for (var canvasLayerName in this.canvasLayers) {
        if (this.canvasLayers[canvasLayerName].rects[rectName]) {
            this.canvasLayers[canvasLayerName].rects[rectName].
                isHidden = true;
            this.canvasLayers[canvasLayerName].isUpdated = false;
        }
    }
}

CommonThing.prototype.clearCommands = function (pathName) {
    for (var canvasLayerName in this.canvasLayers) {
        if (this.canvasLayers[canvasLayerName].paths[pathName]) {
            this.canvasLayers[canvasLayerName].paths[pathName].
                clearCommands ();
            this.canvasLayers[canvasLayerName].isUpdated = false;
        }
    }
}
                                            

CommonThing.prototype.addSprite = function (name, x, y, width, 
                                              height, imagePaths, 
                                              zIndex) {
    var isArray = false;
    var spr;

    if (typeof imagePaths == 'string') { // 1 img only
        spr = new Sprite ({
            name: name, 
            x: x, 
            y: y, 
            width: width, 
            height: height, 
            imageSrc: imagePaths
        });
    } else if (typeof imagePaths == 'object') { // array specified
        spr = [];
        for (var i in imagePaths) {
            nextSpr = new Sprite ({
                name: name + "_" + i, 
                x: x, 
                y: y, 
                width: width, 
                height: height, 
                imageSrc: imagePaths[i]
            });
            spr.push(nextSpr);
        }
        isArray = true;
    } else {
        proto.DEBUG && console.log (
            "Error: CommonThing: imagePaths of invalid type");
    }
 
    if (typeof zIndex == 'undefined') {
        
        if (isArray) {
            for (var i in spr) {
                this.canvasLayers[this.name].addSprite (spr[i]);
            }
        } else {
            this.canvasLayers[this.name].addSprite (spr);
        }

    } else {

        var len = 0;
        for (var canvasLayerName in this.canvasLayers) {
            if (this.canvasLayers[canvasLayerName].zIndex == 
                zIndex) {
                if (isArray) {
                    for (var i in spr) {
                        this.canvasLayers[canvasLayerName].
                             addSprite (spr[i]);
                    }
                } else {
                    this.canvasLayers[canvasLayerName].
                         addSprite (spr);
                }
                return;
            }
            len++;
        }

        var viewWidth = proto.activeWorld.view.width;
        var viewHeight = proto.activeWorld.view.height;
 
        var thingCanvas = new CanvasLayer ({
            'name': this.name + '_' + len, 
            'w': viewWidth,
            'h': viewHeight, 
            'zIndex': zIndex, 
            'isUpdated': false,
            'clearOnDraw': this.clearOnDraw
        });

        if (isArray) {
            for (var i in spr) {
                thingCanvas.addSprite (spr[i]);
            }
        } else {
            thingCanvas.addSprite (spr);
        }

        this.addCanvasLayer (thingCanvas);
    }

}

CommonThing.prototype.animationStart = function (name) {

    if (typeof name == 'undefined') {
        for (var canvasLayerName in this.canvasLayers) {
            for (var animName in 
                 this.canvasLayers[canvasLayerName].animations) {
                this.canvasLayers[canvasLayerName]
                    .animations[animName].start ();
            }
        }
        
    } else {
        for (var canvasLayerName in this.canvasLayers) {
            if (this.canvasLayers[canvasLayerName]
                    .animations[name]) {
                this.canvasLayers[canvasLayerName]
                    .animations[name].start ();
            }
        }
    }

}

CommonThing.prototype.animationStop = function (name) {

    if (typeof name == 'undefined') {
        for (var canvasLayerName in this.canvasLayers) {
            for (var animName in 
                 this.canvasLayers[canvasLayerName].animations) {
                this.canvasLayers[canvasLayerName]
                    .animations[animName].stop ();
            }
        }
        
    } else {
        for (var canvasLayerName in this.canvasLayers) {
            if (this.canvasLayers[canvasLayerName]
                    .animations[name]) {
                this.canvasLayers[canvasLayerName]
                    .animations[name].stop ();
            }
        }
    }

};

CommonThing.prototype.animationNext = function (name) {

    if (typeof name == 'undefined') {
        for (var canvasLayerName in this.canvasLayers) {
            for (var animName in 
                 this.canvasLayers[canvasLayerName].animations) {
                this.canvasLayers[canvasLayerName]
                    .animations[animName].next ();
                this.canvasLayers[canvasLayerName].
                    isUpdated = false;
            }
        }
        
    } else {
        for (var canvasLayerName in this.canvasLayers) {
            if (this.canvasLayers[canvasLayerName]
                    .animations[name]) {
                this.canvasLayers[canvasLayerName]
                    .animations[name].next ();
                this.canvasLayers[canvasLayerName].
                    isUpdated = false;
            }
        }
    }

}

CommonThing.prototype.animationPrev = function (name) {

    if (typeof name == 'undefined') {
        for (var canvasLayerName in this.canvasLayers) {
            for (var animName in 
                 this.canvasLayers[canvasLayerName].animations) {
                this.canvasLayers[canvasLayerName]
                    .animations[animName].prev ();
                this.canvasLayers[canvasLayerName].
                    isUpdated = false;
            }
        }
        
    } else {
        for (var canvasLayerName in this.canvasLayers) {
            if (this.canvasLayers[canvasLayerName]
                    .animations[name]) {
                this.canvasLayers[canvasLayerName]
                    .animations[name].prev ();
                this.canvasLayers[canvasLayerName].
                    isUpdated = false;
            }
        }
    }

}

CommonThing.prototype.getAnimation = function (name) {

    if (typeof name == 'undefined') {
        for (var canvasLayerName in this.canvasLayers) {
            for (var animName in 
                 this.canvasLayers[canvasLayerName].animations) {
                return this.canvasLayers[canvasLayerName]
                           .animations[animName];
            }
        }
        
    } else {
        for (var canvasLayerName in this.canvasLayers) {
            if (this.canvasLayers[canvasLayerName]
                    .animations[name]) {
                return this.canvasLayers[canvasLayerName]
                           .animations[name];
            }
        }
    }

    return null;

}

CommonThing.prototype.addAnimation = function (argsDict) {/*name, speed,
                                                 x, y, width, 
                                                 height, imagePaths, 
                                                 zIndex) {*/

    var x = argsDict['x'];
    var y = argsDict['y'];
    var width = argsDict['width'];
    var height = argsDict['height'];
    var zIndex = argsDict['zIndex'];
    var imagePaths = argsDict['imagePaths'];
    var speed = argsDict['speed'];
    var name = argsDict['name'];

    x = x === undefined ? this.x : x;
    y = y === undefined ? this.y : y;
    width = width === undefined ? this.width : width;
    height = height === undefined ? this.height : height;

    var newAnim = new Animation ({
        'name': name, 
        'speed': speed, 
        'imagePaths': imagePaths,
        'x': x, 
        'y': y, 
        'width': width, 
        'height': height
    });

    if (typeof zIndex === 'undefined') {
        
        //this.canvasLayers[this.name].addAnimation (newAnim);
        this.getTopCanvas ().addAnimation (newAnim);
    } else {

        var len = 0;
        for (var canvasLayerName in this.canvasLayers) {
            if (this.canvasLayers[canvasLayerName].zIndex == 
                zIndex) {
                this.canvasLayers[canvasLayerName].
                     addAnimation (newAnim);
                return;
            }
            len++;
        }

        var viewWidth = proto.activeWorld.view.width;
        var viewHeight = proto.activeWorld.view.height;
 
        var thingCanvas = new CanvasLayer ({
            'name': this.name + '_' + len, 
            'w': viewWidth,
            'h': viewHeight, 
            'zIndex': zIndex, 
            'isUpdated': false,
            'clearOnDraw': this.clearOnDraw
        });

        thingCanvas.addAnimation (newAnim);

        this.addCanvasLayer (thingCanvas);
    }

    return newAnim;

}

CommonThing.prototype.addText = function (argsDict) {
                                            /*name, x, y, fontSize, 
                                            font, lineLength, 
                                            lineWidth, string,
                                            zIndex) {*/

    argsDict = typeof argsDict === 'undefined' ? {} : argsDict;

    var x = argsDict['x'];
    var y = argsDict['y'];
    var zIndex = argsDict['zIndex'];

    argsDict['x'] = typeof x === 'undefined' ? this.x : x;
    argsDict['y'] = typeof y === 'undefined' ? this.y : y;
    proto.DEBUG && console.log ('addText: argsDict = ');
    proto.DEBUG && console.log (argsDict);
    if (argsDict instanceof Text) {
        var txt = argsDict;
    } else {
        var txt = new Text (argsDict);
    }

    if (typeof zIndex == 'undefined') {
        this.getTopCanvas ().addText (txt);
    } else {

        var len = 0;
        for (var canvasLayerName in this.canvasLayers) {
            if (this.canvasLayers[canvasLayerName].zIndex == 
                zIndex) {
                this.canvasLayers[canvasLayerName].addText (txt);
                return;
            }
            len++;
        }

        var viewWidth = proto.activeWorld.view.width;
        var viewHeight = proto.activeWorld.view.height;
 
        var thingCanvas = new CanvasLayer ({
            'name': this.name + '_' + len, 
            'w': viewWidth,
            'h': viewHeight, 
            'zIndex': zIndex, 
            'isUpdated': false,
            'clearOnDraw': this.clearOnDraw
        });
        thingCanvas.addText (txt);
        this.addCanvasLayer (thingCanvas);
    }

    return txt;

}

CommonThing.prototype.textSetRgb = function (
                                          name, rval, gval, bval) {

    for (var canvasLayerName in this.canvasLayers) {
        if (this.canvasLayers[canvasLayerName].texts[name]) {
            this.canvasLayers[canvasLayerName].
                textSetRgb (rval, gval, bval, name);
        }
    }

}

/***********************************************************************
TextThing object
***********************************************************************/

function TextThing (name, x, y, fontSize, font, lineLength,
                     lineWidth, string, zIndex, view) {
    var thingText, thingCanvas;

    // add Thing's properties                   
    Thing.call (this, name, x, y, lineWidth, fontSize);

    thingText = new Text ({
        name: name, 
        x: x, 
        y: y, 
        fontSize: fontSize, 
        font: font, 
        lineLength: lineLength, 
        lineWidth: lineWidth, 
        string: string
    });
    thingCanvas = new CanvasLayer ({
        'name': this.name + '_' + len, 
        'w': view.width,
        'h': view.height, 
        'zIndex': zIndex, 
        'isUpdated': false
    });
    thingCanvas.addText (thingText);
                                         
    this.addCanvasLayer (thingCanvas);
}

// inherit from Thing
TextThing.prototype = Object.create (Thing.prototype);

TextThing.prototype.changeText = function (string) {
    this.canvasLayers[this.name].texts[this.name].setString (string);
};

TextThing.prototype.appendText = function (string) {
    this.canvasLayers[this.name].texts[this.name].
        appendString (string);
};




/***********************************************************************
* CanvasLayer object
***********************************************************************/

CanvasLayer._dummyCanvasId = "";
CanvasLayer._parentElement = "";

CanvasLayer.setDummyCanvasId = function (name) {
    CanvasLayer._dummyCanvasId = name;
};

CanvasLayer.setParentElement = function (element) {
    CanvasLayer._parentElement = $(element);
};

/*
Description -
    A wrapper around an HTML5 canvas. CanvasLayer objects contain
    associative arrays of Sprite and Text objects which contain the
    information needed to draw images and text on the canvas. Methods
    are provided which modify the attributes and style of the canvas.
    Other methods operate on all of the associated Sprite and Text
    objects.
*/
function CanvasLayer (argsDict) {/*name, w, h, zIndex, isUpdated, 
                       isVisible) {*/

    argsDict = typeof argsDict === 'undefined' ? {} : argsDict;
    var w = 
        typeof argsDict['w'] === 'undefined' ? 0 : argsDict['w'];
    var h = 
        typeof argsDict['h'] === 'undefined' ? 0 : argsDict['h'];

    var defaultPropsDict = {
        name: undefined,
        zIndex: 0,
        isUpdated: true,
        isVisible: true,
        clearOnDraw: true
    }

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);
    // check for argument else use default
    this.visibility = this.isVisible ? "visible" : "hidden";
    this.isHidden = false;

    proto.DEBUG && console.log (CanvasLayer._dummyCanvasId);
    this.canvasTop = 
        $("#" + CanvasLayer._dummyCanvasId).position ().top;
    this.canvasLeft = 
        $("#" + CanvasLayer._dummyCanvasId).position ().left;
    this.sprites = {};
    this.animations = {};
    this.texts = {};
    this.rects = {};
    this.paths = {};

    // setup the canvas
    var canvasEle = document.createElement ("canvas");

    var canvasSelector = '#' + name + '_canvas_' + 
          CanvasLayer._dummyCanvasId;
    if ($(canvasSelector).length !== 0) {
        proto.DEBUG && console.log ('rename canvas');
        var canvasNum = $(CanvasLayer._parentElement).
            find ('canvas').length;
        canvasEle.id = (name + '_' + canvasNum +  '_canvas_' +
            CanvasLayer._dummyCanvasId);
        this.name = name + '_' + canvasNum;
        proto.DEBUG && console.log ('id = ' + canvasEle.id);
    } else {
        canvasEle.id = 
            (name + '_canvas_' + CanvasLayer._dummyCanvasId);
    }

    canvasEle.width = w;
    canvasEle.height = h;
    canvasEle.setAttribute (
        "style", 
        "visibility: " + this.visibility + "; " +
        "display: block; " +
        "position: absolute; " +
        "top: " + this.canvasTop +
        "px;" +
        "left: " + this.canvasLeft +
        "px;" +
        "z-index: " + this.zIndex + ";");
    $(CanvasLayer._parentElement).append (canvasEle);
    //$('body').append (canvasEle);
    this.canvas = canvasEle;
    this.ctx = this.canvas.getContext ('2d');
    this.offsetX = 0;
    this.offsetY = 0;
}

CanvasLayer.prototype.toDataURL = function () {
    return this.canvas.toDataURL ();
}

CanvasLayer.prototype.allSpritesLoaded = function () {
    var allSpritesLoaded = true;
    for (var i in this.sprites) {
        allSpritesLoaded = 
            allSpritesLoaded && 
            this.sprites[i].isLoaded
    }
    for (var i in this.animations) {
        allSpritesLoaded = 
            allSpritesLoaded && 
            this.animations[i].allSpritesLoaded ();
    }
    return allSpritesLoaded;
}

CanvasLayer.prototype.startContinuous = function () {

    proto.DEBUG && console.log ('canvasLayer.startContinuous');
    for (var animName in this.animations) {
        proto.DEBUG && console.log ('canvasLayer.startContinuous looking:' +
                     animName + ', ' + animName.isContinuous);
        if (this.animations[animName].isContinuous) {
            proto.DEBUG && console.log ('canvasLayer.startContinuous starting');
            this.animations[animName].start (this);
        }
    }
}

CanvasLayer.prototype.stopContinuous = function () {
    for (var animName in this.animations) {
        if (this.animations[animName].isContinuous) {
            this.animations[animName].stop (this);
        }
    }
}

CanvasLayer.prototype.deleteAllAttributes = function () {
    document.body.removeChild (this.canvas);  
}

CanvasLayer.prototype.addSprite = function (sprite) {

    // if the sprite is not loaded, keep checking until it is
    proto.DEBUG && console.log ("CanvasLayer.addSprite: sprite.isLoaded = " +
                 sprite.isLoaded);
    if (sprite.isLoaded == false) {
        var that = this;
        setTimeout (function checkIsLoaded () {
            proto.DEBUG && console.log ("checkIsLoaded: sprite, sprite.isLoaded = " +
                         sprite.image.src + ", " + 
                         sprite.isLoaded);
            if (sprite.isLoaded == false) {
                setTimeout (checkIsLoaded, 100);
            } else {
                that.isUpdated = false;
            }
        }, 100);
    } 

    this.sprites[sprite.name] = sprite;
}

CanvasLayer.prototype.deleteSprite = function (sprite) {
    delete this.sprites[sprite.name];
}

CanvasLayer.prototype.addAnimation = function (animation) {
    if (animation.isLoaded == false) {
        var that = this;
        setTimeout (function checkIsLoaded () {
            proto.DEBUG && console.log ("checkIsLoaded: anim, anim.isLoaded = " +
                         animation.name+ ", " + 
                         animation.isLoaded);
            if (animation.isLoaded == false) {
                setTimeout (checkIsLoaded, 100);
            } else {
                that.isUpdated = false;
            }
        }, 100);
    } 
    this.animations[animation.name] = animation;
    animation.owner = this;
}

CanvasLayer.prototype.addRect = function (rect) {
    proto.renameIfNecessary (this.rects, rect);
    proto.DEBUG && console.log ('addRect: name = ' + rect.name);
    this.rects[rect.name] = rect;
    this.isUpdated = false;
}

CanvasLayer.prototype.addPath = function (path) {
    //proto.DEBUG && console.log ('addPath ');
    proto.renameIfNecessary (this.paths, path);
    //proto.DEBUG && console.log (path);
    this.paths[path.name] = path;
    this.isUpdated = false;
}

CanvasLayer.prototype.addText = function (text) {
    proto.renameIfNecessary (this.texts, text);
    this.texts[text.name] = text;
    this.isUpdated = false;
}

CanvasLayer.prototype.textAppendString = function (string) {
    var lineAdded;
    for (var textName in this.texts) {
        lineAdded = this.texts[textName].appendString (string);
    }
    this.isUpdated = false;
    return lineAdded;
}

CanvasLayer.prototype.getTextString = function () {
    var textNames = Object.keys (this.texts);
    return this.texts[textNames[0]].string;
}

CanvasLayer.prototype.textSetString = function (string) {
    for (var textName in this.texts) {
        this.texts[textName].setString (string);
    }
    this.isUpdated = false;
}

CanvasLayer.prototype.textSetRgb = function (r, g, b, name) {
    if (!name) {
        for (var textName in this.texts) {
            this.texts[textName].setRgb (r, g, b);
        }
    } else {
        this.texts[name].setRgb (r, g, b);
    }
    this.isUpdated = false;
}

CanvasLayer.prototype.textDeleteLastChar = function () {
    for (var textName in this.texts) {
        lineAdded = this.texts[textName].deleteLastChar ();
    }
    this.isUpdated = false;
}

CanvasLayer.prototype.clear = function () {
    this.ctx.clearRect (0, 0, this.canvas.width, this.canvas.height);
};

CanvasLayer.prototype.draw = function (view) {
    proto.DEBUG && console.log ("CanvasLayer: " + this.name + ": draw");

    if (this.clearOnDraw) {
        proto.DEBUG && console.log ('CanvasLayer: clearing');
        this.ctx.clearRect (0, 0, this.canvas.width, 
                            this.canvas.height);
    }

    // loop through each drawable, call their draw functions
    for (var animName in this.animations) {
        this.animations[animName].draw (this.canvas, this.ctx, view);
    }
    for (var spriteName in this.sprites) {
        if (!this.sprites[spriteName].isHidden) {
            proto.DEBUG && console.log ("canvasLayer.draw: drawing " + spriteName);
            this.sprites[spriteName].draw (this.canvas, this.ctx, 
                                            view);
        }
    }
    for (var rectName in this.rects) {
        if (!this.rects[rectName].isHidden) {
            this.rects[rectName].draw (this.canvas, this.ctx, view);
        }
    }
    for (var pathName in this.paths) {
        this.paths[pathName].draw (this.canvas, this.ctx, view);
    }
    for (var textName in this.texts) {
        this.texts[textName].draw (this.canvas, this.ctx, view);
    }
    this.isUpdated = true;
}

CanvasLayer.prototype.drawFixed = function (view) {

    if (this.clearOnDraw) {
        proto.DEBUG && console.log ('CanvasLayer: drawFixed: clearing');
        this.ctx.clearRect (0, 0, this.canvas.width, 
                            this.canvas.height);
    }

    // loop through each drawable, call their draw functions
    for (var animName in this.animations) {
        this.animations[animName].drawFixed (this.canvas, this.ctx, 
                                               view);
    }
    for (var spriteName in this.sprites) {
        if (!this.sprites[spriteName].isHidden) {
            proto.DEBUG && console.log ("canvasLayer.draw: drawing " + spriteName);
            this.sprites[spriteName].drawFixed (this.canvas, this.ctx, 
                                            view);
        }
    }
    for (var textName in this.texts) {
        this.texts[textName].draw (this.canvas, this.ctx, view);
    }
    this.isUpdated = true;
}

CanvasLayer.prototype.drawImagePixels = function (
    view, rMin, rMax, gMin, gMax, bMin, bMax) {

    //this.ctx.clearRect (0, 0, this.canvas.width, this.canvas.height);
    for (var spriteName in this.sprites) {
        this.sprites[spriteName].drawPixels (
            this.canvas, this.ctx, view,
            rMin, rMax, gMin, gMax, bMin, bMax);
    }

    this.isUpdated = true;
}

CanvasLayer.prototype.drawText = function (textName, view) {

    if (textName == "") {
        for (var textName in this.texts) {
            this.texts[textName].draw (this.canvas, this.ctx, view);
        }
    } else if (this.texts[textName]) {
        this.texts[textName].draw (this.canvas, this.ctx, view);
    }

    this.isUpdated = true;
}

CanvasLayer.prototype.textChangeFont = function (font) {
    for (var textName in this.texts) {
        this.texts[textName].font = font;
    }

    this.isUpdated = false;
}

CanvasLayer.prototype.textChangeFontSize = function (size) {
    for (var textName in this.texts) {
        this.texts[textName].fontSize = size;
    }

    this.isUpdated = false;
}
CanvasLayer.prototype.clear = function () {

    proto.DEBUG && console.log ('canvasLayer.clear, name = ' + this.name);
    this.ctx.clearRect (0, 0, this.canvas.width, this.canvas.height);
}

CanvasLayer.prototype.imageScale = function (xScaleFactor, 
                                               yScaleFactor) {
    for (var spriteName in this.sprites) {
        this.sprites[spriteName].scale (xScaleFactor, 
                                         yScaleFactor);
    }
    this.isUpdated = false;
}
CanvasLayer.prototype.imageMoveToMaintainOffset = function (
    x, y, thingX, thingY) {
    var xOffset;
    var yOffset;

    // loop through each drawable, call their moveTo functions
    for (var spriteName in this.sprites) {
        var sprite = this.sprites[spriteName];
        xOffset = thingX - sprite.x;
        yOffset = thingY - sprite.y;
        sprite.moveTo (x + xOffset, y + yOffset);
    }
    for (var textName in this.texts) {
        var text = this.texts[textName];
        xOffset = text.x - thingX;
        yOffset = text.y - thingY;
        text.moveTo (x + xOffset, y + yOffset);
    }
    for (var rectName in this.rects) {
        var rect = this.rects[rectName];
        xOffset = thingX - rect.x;
        yOffset = thingY - rect.y;
        rect.moveTo (x + xOffset, y + yOffset);
    }
    for (var animName in this.animations) {
        var anim = this.anims[animName];
        xOffset = thingX - anim.x;
        yOffset = thingY - anim.y;
        anim.moveTo (x + xOffset, y + yOffset);
    }
    var path;
    for (var pathName in this.paths) {
        path = this.paths[pathName];
        if (path instanceof Circle) {
            xOffset = path.x - thingX;
            yOffset = path.y - thingY;
            path.moveTo (x + xOffset, y + yOffset);
        }
    }
    this.isUpdated = false;
};

CanvasLayer.prototype.imageMoveTo = function (x, y, maintainOffset) {

    // loop through each drawable, call their moveTo functions
    for (var spriteName in this.sprites) {
        this.sprites[spriteName].moveTo (x, y);
    }
    for (var textName in this.texts) {
        this.texts[textName].moveTo (x, y);
    }
    for (var rectName in this.rects) {
        this.rects[rectName].moveTo (x, y);
    }
    for (var animName in this.animations) {
        this.animations[animName].moveTo (x, y);
    }
    for (var textName in this.texts) {
        this.texts[textName].moveTo (x, y);
    }
    var path;
    for (var pathName in this.paths) {
        path = this.paths[pathName];
        if (path instanceof Circle) {
            path.moveTo (x, y);
        }
    }
    this.isUpdated = false;
}

CanvasLayer.prototype.imageMoveToRelative = function (x, y) {
    // loop through each drawable, call their moveToRelative functions
    for (var spriteName in this.sprites) {
        this.sprites[spriteName].moveToRelative (x, y);
    }
    for (var textName in this.texts) {
        this.texts[textName].moveToRelative (x, y);
    }
    for (var rectName in this.rects) {
        this.rects[rectName].moveToRelative (x, y);
    }
    for (var animName in this.animations) {
        this.animations[animName].moveToRelative (x, y);
    }
    this.isUpdated = false;
}

CanvasLayer.prototype.imageAddHeightWidth = function (x, y) {
    for (var spriteName in this.sprites) {
        this.sprites[spriteName].addHeightWidth (x, y);
    }
    this.isUpdated = false;
}

CanvasLayer.prototype.imageSetHeightWidth = function (x, y) {
    for (var spriteName in this.sprites) {
        this.sprites[spriteName].setHeightWidth (x, y);
    }
    this.isUpdated = false;
}

CanvasLayer.prototype.resize = function (w, h) {

    this.canvas.width = w;
    this.canvas.height = h;
    this.isUpdated = false;
}

CanvasLayer.prototype.move = function (x, y) {

    this.offsetX = x;
    this.offsetY = y;

    this.canvasTop = this.canvasTop + y;
    this.canvasLeft = this.canvasLeft + x;
    this.canvas.setAttribute ("style", 
                             "visibility: " + this.visibility + "; " +
                             "display: block; " +
                             "position: absolute; " +
                             "top: " + this.canvasTop + "px;" +
                             "left: " + this.canvasLeft + "px; " +
                             "z-index: " + this.zIndex + ";");
}

CanvasLayer.prototype.center = function () {

    proto.DEBUG && console.log ('window.innerWidth = ' + window.innerWidth);
    proto.DEBUG && console.log ('this.canvas.width = ' + this.canvas.width);
    this.canvasTop = ((window.innerHeight - this.canvas.height) / 2.0);
    this.canvasLeft = ((window.innerWidth - this.canvas.width) / 2.0);
    this.canvas.setAttribute ("style", 
                             "visibility: " + this.visibility + "; " +
                             "display: block; " +
                             "position: absolute; " +
                             "top: " + this.canvasTop + "px;" +
                             "left: " + this.canvasLeft + "px; " +
                             "z-index: " + this.zIndex + ";");
    proto.DEBUG && console.log ('this.canvas.style.left = ' +
                 this.canvas.style.left);
}

CanvasLayer.prototype.alignToDummy = function (dummyCanvas) {

    proto.DEBUG && console.log ('window.innerWidth = ' + window.innerWidth);
    proto.DEBUG && console.log ('this.canvas.width = ' + this.canvas.width);
    this.canvasTop = $(dummyCanvas)
        .position ().top + this.offsetY;
    this.canvasLeft = $(dummyCanvas)
        .position ().left + this.offsetX;
    var visibility = (this.isHidden ? "hidden" : "visible");
    this.canvas.setAttribute ("style", 
                             "visibility: " + visibility + "; " +
                             "display: block; " +
                             "position: absolute; " +
                             "top: " + this.canvasTop + "px;" +
                             "left: " + this.canvasLeft + "px; " +
                             "z-index: " + this.zIndex + ";");
    proto.DEBUG && console.log ('this.canvas.style.left = ' +
                 this.canvas.style.left);
}

CanvasLayer.prototype.resetZindex = function (zIndex) {

    this.zIndex = zIndex;
    this.canvas.setAttribute ("style", 
            "visibility: " + this.visibility + "; " +
            "display: block; " +
            "position: absolute; " +
            "top: " + this.canvasTop +
            "px;" +
            "left: " + this.canvasLeft +
            "px;" +
            "z-index: " + this.zIndex + ";");
    this.isUpdated = false;
}

CanvasLayer.prototype.setIsVisible = function (isVisible) {
    this.isVisible = isVisible;
    this.visibility = this.isVisible ? "visible" : "hidden";
}

// hides canvas regardless of its visibility attribute
CanvasLayer.prototype.hide = function () {
    this.isHidden = true;

    this.stopContinuous ();

    this.canvas.setAttribute ("style", 
            "visibility: hidden; " +
            "display: block; " +
            "position: absolute; " +
            "top: " + this.canvasTop +
            "px;" +
            "left: " + this.canvasLeft +
            "px;" +
            "z-index: " + this.zIndex + ";");
}

// only hides canvas if its visibility attribute is set to true
CanvasLayer.prototype.unhide = function () {
    if (!this.isVisible) return;

    this.isHidden = false;

    this.startContinuous ();

    this.canvas.setAttribute ("style", 
            "visibility: visible; " +
            "display: block; " +
            "position: absolute; " +
            "top: " + this.canvasTop +
            "px;" +
            "left: " + this.canvasLeft +
            "px;" +
            "z-index: " + this.zIndex + ";");

}

/***********************************************************************
* Path object
***********************************************************************/

Path.lineTo = 0;
Path.moveTo = 1;
Path.arc = 2;
Path.bezierCurveTo = 3;
Path.closePath = 4;


/* private prototype Command */

Path.Command = function (cmmd, opts, owner) {

    this.cmmd = cmmd;
    this.coordType;
    this.owner = owner;

    if (cmmd === Path.lineTo || cmmd === Path.moveTo) {
        this.parseCoords (opts);
    } else if (cmmd === Path.arc) {
        this.parseCoords (opts);
        this.radius = opts.radius;
        this.startAngle = opts.startAngle;
        this.endAngle = opts.endAngle;
        this.anticlockwise = opts.anticlockwise;
    } else if (cmmd === Path.bezierCurveTo) {
        this.cp1x = opts.cp1x;
        this.cp1y = opts.cp1y;
        this.cp2x = opts.cp2x;
        this.cp2y = opts.cp2y;
        this.parseCoords (opts);
    } else if (cmmd === Path.closePath) {
    } else {
        proto.DEBUG && console.log ("Command: error: invalid cmmd type");
        return null;
    }
}

Path.Command.prototype.parseCoords = function (opts) {
    if (opts['r'] !== undefined && opts['theta'] !== undefined) {
        this.r = opts['r'];
        this.theta = opts['theta']; // radians
        this.coordType = 'polar';
    } else if (opts['x'] !== undefined && opts['y'] !== undefined) {
        this.x = opts['x'];
        this.y = opts['y'];
        this.coordType = 'cartesian';
    }
}

Path.Command.prototype.executeCommand = function (ctx) {
    //proto.DEBUG && console.log ('executeCommand: currPosX, currPosY = ' +
        //this.owner.currPosX + ',' + this.owner.currPosY);

    if (this.coordType === 'polar') {
        this.x = this.owner.currPosX + 
            proto.polarToCartX (this.r, this.theta);
        this.y = this.owner.currPosY -
            proto.polarToCartY (this.r, this.theta);
    }

    switch (this.cmmd) {
        case Path.moveTo:
            /*proto.DEBUG && console.log ("executeCommand: moveTo(" + this.x +
                         ", " + this.y + ")");*/
            ctx.moveTo (this.x, this.y);
            break;
        case Path.lineTo:
            /*proto.DEBUG && console.log ("executeCommand: lineTo(" + this.x +
                         ", " + this.y + ")");*/
            ctx.lineTo (this.x, this.y);
            break;
        case Path.bezierCurveTo:
            ctx.bezierCurveTo (this.cp1x, this.cp1y,
                               this.cp2x, this.cp2y,
                               this.x, this.y);
            break;
        case Path.arc:
            ctx.arc (this.x, this.y,
                     this.radius, this.startAngle,
                     this.endAngle, this.anticlockwise);
            break;
        case Path.closePath:
            proto.DEBUG && console.log ('close path');
            ctx.closePath ();
            break;
        default:
            proto.DEBUG && console.log ("executeCommand: switch error");
    }
    this.owner.currPosX = this.x;
    this.owner.currPosY = this.y;
}

function Path (argsDict) {
    argsDict = typeof argsDict === 'undefined' ? {} : argsDict;

    var defaultPropsDict = {
        name: null,
        lineWidth: 0,
        isFilled: true,
        isHidden: false,
        lineJoin: 'round',
        color: "black",
        cmmds: []
    }

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);

    // used for polar coordinates
    this.currPosX;
    this.currPosY;

    this.owner = null;
}

Path.prototype.setColor = function (string) {
    this.color = string;
    if (this.owner) this.owner.isUpdated = false;
}

Path.prototype.addCommand = function (cmmd, opts) {
    var cmmd = new Path.Command (cmmd, opts, this);
    if (!cmmd) {
        proto.DEBUG && console.log ("addCommand: error: invalid args");
    }
    this.cmmds.push (cmmd);
}

Path.prototype.clearCommands = function (cmmd, opts) {
    this.cmmds = [];
}

Path.prototype.draw = function (canvas, ctx, view) {

    proto.DEBUG && console.log ('path.draw: drawing');
    ctx.fillStyle = this.color; 
    ctx.strokeStyle = this.color; 
    ctx.lineWidth = this.lineWidth; 
    ctx.lineJoin = this.lineJoin; 
    ctx.beginPath ();

    for (var cmmd in this.cmmds) {
        this.cmmds[cmmd].executeCommand (ctx);
    }

    if (this.isFilled) {
        ctx.fill ();
    } else {
        ctx.stroke ();
    }
}

/***********************************************************************
* Circle object
***********************************************************************/

function Circle (argsDict) {
    argsDict = typeof argsDict === 'undefined' ? {} : argsDict;
    proto.DEBUG && console.log ('new Circle: ');
    proto.DEBUG && console.debug ($.extend (true, {}, argsDict));
    var defaultPropsDict = {
        name: null,
        x: 0,
        y: 0,
        radius: 0
    };

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);

    // add Path's properties                   
    Path.call (this, argsDict);

    this.addCommand (Path.arc, {
        x: this.x, 
        y: this.y,
        radius: this.radius,
        startAngle: 0,
        endAngle: Math.PI * 2,
        anticlockwise: false
    });

}

// inherit from Path
Circle.prototype = Object.create (Path.prototype);

Circle.prototype.moveTo = function (x, y) {
    this.x = x;
    this.y = y;
    this.cmmds[0]['x'] = x;
    this.cmmds[0]['y'] = y;
};

Circle.prototype.moveToRelative = function (x, y) {
    this.x += x;
    this.y += y;
    this.cmmds[0]['x'] = x;
    this.cmmds[0]['y'] = y;
};




/***********************************************************************
* Rect object
***********************************************************************/

function Rect (argsDict) {
    var defaultPropsDict = {
        name: null,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        isHidden: false,
        color: 'black',
        owner: null
    };

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);
}

Rect.prototype.resize = function (w, h) {
    this.width = w;
    this.height = h;
    if (this.owner) this.owner.isUpdated = false;
}

Rect.prototype.moveTo = function (x, y) {
    this.x = x;
    this.y = y;
    if (this.owner) this.owner.isUpdated = false;
}

Rect.prototype.moveToRelative = function (x, y) {
    this.x += x;
    this.y += y;
    if (this.owner) this.owner.isUpdated = false;
}

Rect.prototype.draw = function (canvas, ctx, view) {

    // draw if image is inside the view
    proto.DEBUG && console.log ('Rect.draw: drawing ' + this.name+
                 'this.x = ' + this.x +
                 'this.y = ' + this.y +
                 'view.x = ' + view.x +
                 'view.y = ' + view.y +
                 'this.x - view.x = ' + (this.x - view.x) +
                 'this.y - view.y = ' + (this.y - view.y) +
                 'this.width = ' + this.width +
                 'this.height = ' + this.height);
    if ((this.x + this.width >= view.x && 
         this.x - this.width <= view.x + view.width) &&
        (this.y + this.height >= view.y && 
         this.y - this.height <= view.y + view.height)) {
        proto.DEBUG && console.log ('drawing ' + this.color);
        ctx.fillStyle = this.color; 
        ctx.fillRect (this.x - view.x, this.y - view.y, this.width, 
                      this.height);
    }
}


/***********************************************************************
* Square object
***********************************************************************/

function Square (argsDict) {
    argsDict['height'] = argsDict['width'];

    // add Path's properties                   
    Rect.call (this, argsDict);

    proto.DEBUG && console.log ('new Square '); 
    proto.DEBUG && console.log (this);

}

// inherit from Rect
Square.prototype = Object.create (Rect.prototype);


/***********************************************************************
* Sprite object
***********************************************************************/

/*
Description - Sprite objects contain all the information needed by a
    CanvasLayer object to draw images. Use CanvasLayer.addSprite () 
    to add a Sprite object to a CanvasLayer.
*/
function Sprite (argsDict) {//name, x, y, w, h, imageSrc, isHidden) {

    argsDict = typeof argsDict === 'undefined' ? {} : argsDict;

    var defaultPropsDict = {
        name: 'default',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        imageSrc: undefined,
        isHidden: false
    };

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);

    // setup image
    this.image = new Image ();
    this.image.src = this.imageSrc;
    var that = this;
    this.image.onload = function () { that.isLoaded = true; };

    this.isLoaded = false;

}

/*
draw -
    Clears the given canvas, sets the font color and draws this.image.
The image will be drawn relative to the coordinates contained in view 
and will only be drawn if it is inside of the view.
Arguments:
    canvas - the canvas that the image will be drawn on
    ctx - the context corresponding to the canvas
    view - a View object 
*/
Sprite.prototype.draw = function (canvas, ctx, view) {

    // draw if image is inside the view
    proto.DEBUG && console.log ('Sprite.draw: drawing ' + this.image.src +
                 'this.x = ' + this.x +
                 'this.y = ' + this.y +
                 'view.x = ' + view.x +
                 'view.y = ' + view.y +
                 'this.x - view.x = ' + (this.x - view.x) +
                 'this.y - view.y = ' + (this.y - view.y));
    if ((this.x + this.width >= view.x && 
         this.x - this.width <= view.x + view.width) &&
        (this.y + this.height >= view.y && 
         this.y - this.height <= view.y + view.height)) {
        proto.DEBUG && console.log ('drawing');
        ctx.drawImage (this.image, this.x - view.x, 
                      this.y - view.y, this.width, this.height);
    }
}

Sprite.prototype.drawSlice = function (canvas, ctx, view,
                                        sx, sy, swidth, sheight,
                                        dx, dy, dwidth, dheight) {

    proto.DEBUG && console.log ('Sprite.drawSlice: drawing');
    ctx.drawImage (this.image, sx, sy, swidth, sheight, 
                   this.x - view.x + dx, this.y - view.y + dy, 
                   dwidth, dheight);

};


Sprite.prototype.drawFixed = function (canvas, ctx, view) {

    // draw if image is inside the view
    proto.DEBUG && console.log ('Sprite.draw: drawing ' + this.image.src +
                 'this.x = ' + this.x +
                 'this.y = ' + this.y +
                 'view.x = ' + view.x +
                 'view.y = ' + view.y +
                 'this.x - view.x = ' + (this.x - view.x) +
                 'this.y - view.y = ' + (this.y - view.y));
    proto.DEBUG && console.log ('drawing');
    ctx.drawImage (this.image, this.x - view.x, 
                   this.y - view.y, this.width, this.height);
}

// modified version of code from mdn:
//    developer.mozilla.org/en-US/docs/ManipulatingVideoUsingCanvas
Sprite.prototype.drawPixels = function (canvas, ctx, view,
                                         rMin, rMax, gMin, gMax,
                                         bMin, bMax) {

    /*ctx.drawImage (this.image, this.x - view.x, 
                   this.y - view.y, this.width, this.height);*/

    var frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    var l = frame.data.length / 4;
     
    for (var i = 0; i < l; i++) {
        var r = frame.data[i * 4 + 0];
        var g = frame.data[i * 4 + 1];
        var b = frame.data[i * 4 + 2];
        if (r > rMin && r < rMax && 
            g > gMin && g < gMax && 
            b > bMin && b < bMax)
            frame.data[i * 4 + 3] = 0;
     }

     ctx.putImageData(frame, 0, 0);

}

Sprite.prototype.moveTo = function (x, y) {
    this.x = x;
    this.y = y;
}

Sprite.prototype.moveToRelative = function (x, y) {
    this.x += x;
    this.y += y;
}

Sprite.prototype.scale = function (xScaleFactor, yScaleFactor) {
    this.width *= xScaleFactor;
    this.height *= yScaleFactor;
}

Sprite.prototype.addHeightWidth = function (x, y) {
    this.width += x;
    this.height += y;
}

Sprite.prototype.setHeightWidth = function (x, y) {
    this.width = x;
    this.height = y;
}



/***********************************************************************
* Animation object
***********************************************************************/

/*
Optional arguments allows automatic creation of a list of sprites or a 
single sprite.
*/
function Animation (argsDict) {

    var defaultPropsDict = {
        name: 'default',
        speed: 0, // in draw cycles per frame
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        imagePaths: null,
        owner: null,
        isContinuous: false
    }

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);

    this.rotationInc = 0; // in degrees
    this.rotationAng = 0; // in degrees
    this.rotOrigX;
    this.rotOrigY;
    this.deltaX = 0;
    this.deltaY = 0;
    this.sprites = [];
    this.currFrame = -1;
    this._nextFrame = 0;
    this.isStopped = true;
    this.isLoaded = false;
    this.spritesLoaded = 0;
    this.animTimeout = null;

    // delays repeated calls to next () and prev ()
    this.cycleDelay = 0; 
    this.cycleIsDelayed = false; 

    if (this.imagePaths) {
        if (typeof this.imagePaths == 'string') { // 1 img only
            var spr = new Sprite ({
                'name': name, 
                'x': this.x, 
                'y': this.y, 
                'width': this.width, 
                'height': this.height, 
                'imageSrc': this.imagePaths
            });
            this.addSprite (spr);
        } else if (typeof this.imagePaths == 'object') { // array specified
            var spr;
            for (var i in this.imagePaths) {
                spr = new Sprite ({
                    name: name + "_" + i, 
                    x: this.x, 
                    y: this.y, 
                    width: this.width, 
                    height: this.height, 
                    imageSrc: this.imagePaths[i]
                });
                this.addSprite (spr);
            }
        } else {
            proto.DEBUG && console.log (
                "Error: Animation: imagePaths of invalid type");
        }
    }

}

Animation.prototype.allSpritesLoaded = function () {
    var allSpritesLoaded = true;
    for (var i in this.sprites) {
        allSpritesLoaded = 
            allSpritesLoaded && 
            this.sprites[i].isLoaded
    }
    return allSpritesLoaded;
}

Animation.prototype.getIsStopped = function () {
    return this.isStopped;
};

Animation.prototype.getCurrFrame = function () {
    return this.currFrame;
};

// potential bug, only change isLoaded after all sprites loaded
Animation.prototype.addSprite = function (sprite) {
    this.isLoaded = false;

    // if the sprite is not loaded, keep checking until it is
    proto.DEBUG && console.log ("Animation.addSprite: sprite.isLoaded = " +
                 sprite.isLoaded);

    if (sprite.isLoaded == false) {
        var that = this;
        setTimeout (function checkIsLoaded () {
            proto.DEBUG && console.log ("checkIsLoaded: sprite, sprite.isLoaded = " +
                         sprite.image.src + ", " + 
                         sprite.isLoaded);
            if (sprite.isLoaded == false) {
                setTimeout (checkIsLoaded, 100);
            } else {
                ++that.spritesLoaded;
                if (that.spritesLoaded == that.sprites.length) 
                    that.isLoaded = true;
            }
        }, 100);
    } 
    this.sprites.push (sprite);
}

Animation.prototype.moveToRelative = function (x, y) {
    for (var spriteName in this.sprites) {
        this.sprites[spriteName].moveToRelative (x, y);
    }
}

Animation.prototype.moveTo = function (x, y) {
    for (var spriteName in this.sprites) {
        this.sprites[spriteName].moveTo (x, y);
    }
}

/*
hack: Rotating sprites are drawn by first translating the canvas to the
specified origin and then drawing the sprite at 0, 0. This requires
that clearRect be called with different parameters in order to reset
the canvas. So if the parent canvas layer contains more than one
animation (with one of them rotating) they might clobber each other.
*/
Animation.prototype.setRotation = function (rotationInc, origX, 
                                             origY, canvasLayer,
                                             view) {
    this.rotationInc = rotationInc;
    canvasLayer.ctx.translate (origX, origY);
    this.rotOrigX = origX; // center of rotation relative to sprite
    this.rotOrigY = origY;
    this.viewOrigX = view.x // save in case view changes
    this.viewOrigY = view.y

}

Animation.prototype.draw = function (canvas, ctx, view) {
    proto.DEBUG && console.log ("drawing animation frame");
    var currSpr = this.sprites[this._nextFrame];

    if (this.rotationInc != 0) { // handle rotating sprite

        // translate canvas and center of rotation if the view changes
        if (view.x != this.viewOrigX || view.y != this.viewOrigY) {
            ctx.translate (-(view.x - this.viewOrigX),
                           -(view.y - this.viewOrigY));
            this.rotOrigX -= view.x - this.viewOrigX;
            this.rotOrigY -= view.y - this.viewOrigY;
            this.viewOrigX = view.x;
            this.viewOrigY = view.y;
        }

        var currSprX = currSpr.x;
        var currSprY = currSpr.y;
        currSpr.x = view.x - (this.rotOrigX - (currSprX - view.x));
        currSpr.y = view.y - (this.rotOrigY - (currSprY - view.y));
        ctx.clearRect (-view.width, -view.height, 2 * view.width, 
                       2 * view.height);
        ctx.save ();
        ctx.rotate (this.rotationAng);
        currSpr.draw (canvas, ctx, view);
        ctx.restore ();
        currSpr.x = currSprX;
        currSpr.y = currSprY;
    } else { // handle default animation
        currSpr.draw (canvas, ctx, view);
    }

    this.currFrame = this._nextFrame;

}

Animation.prototype.drawFixed = function (canvas, ctx, view) {
    proto.DEBUG && console.log ("drawing animation frame");
    var currSpr = this.sprites[this._nextFrame];

    if (this.rotationInc != 0) { // handle rotating sprite

        // translate canvas and center of rotation if the view changes
        if (view.x != this.viewOrigX || view.y != this.viewOrigY) {
            ctx.translate (-(view.x - this.viewOrigX),
                           -(view.y - this.viewOrigY));
            this.rotOrigX -= view.x - this.viewOrigX;
            this.rotOrigY -= view.y - this.viewOrigY;
            this.viewOrigX = view.x;
            this.viewOrigY = view.y;
        }

        var currSprX = currSpr.x;
        var currSprY = currSpr.y;
        currSpr.x = view.x - (this.rotOrigX - (currSprX - view.x));
        currSpr.y = view.y - (this.rotOrigY - (currSprY - view.y));
        ctx.clearRect (-view.width, -view.height, 2 * view.width, 
                       2 * view.height);
        ctx.save ();
        ctx.rotate (this.rotationAng);
        currSpr.drawFixed (canvas, ctx, view);
        ctx.restore ();
        currSpr.x = currSprX;
        currSpr.y = currSprY;
    } else { // handle default animation
        currSpr.drawFixed (canvas, ctx, view);
    }
    this.currFrame = this._nextFrame;

}

Animation.prototype.stop = function () {
    this.isStopped = true;
}

Animation.prototype.next = function () {
    if (this.cycleIsDelayed) return;

    this._nextFrame = this._nextFrame + 1;
    if (this._nextFrame >= this.sprites.length) {
        this._nextFrame = 0;
    }

    this.cycleIsDelayed = true;
    var that = this;
    setTimeout (function delayNext () {
        that.cycleIsDelayed = false;
    }, this.cycleDelay);
}

Animation.prototype.prev = function () {
    if (this.cycleIsDelayed) return;

    this._nextFrame = this._nextFrame - 1;
    if (this._nextFrame < 0) {
        this._nextFrame = this.sprites.length - 1;
    }

    this.cycleIsDelayed = true;
    var that = this;
    setTimeout (function delayPrev () {
        that.cycleIsDelayed = false;
    }, this.cycleDelay);
}

Animation.prototype.setFrame = function (frameNum) {
    if (this.cycleIsDelayed) return;

    if (frameNum >= this.sprites.length ||
        frameNum < 0) {
        proto.DEBUG && console.log ("Animation.setFrame: invalid frame number");
        return;
    }

    this._nextFrame = frameNum;
    this.owner.isUpdated = false;

    if (this.cycleIsDelayed > 0) {
        this.cycleIsDelayed = true;
        var that = this;
        setTimeout (function delayPrev () {
            that.cycleIsDelayed = false;
        }, this.cycleDelay);
    }
}

Animation.prototype.start = function (once /* optional */) {
    once = typeof once === 'undefined' ? false : true;

    this.isStopped = false;
    var thisAnim = this;
    if (this.animTimeout) {
        clearTimeout (this.animTimeout);
    }
    this.animTimeout = setTimeout (function animate () {

        if (!thisAnim.isStopped) {
            proto.DEBUG && console.log ('animating, speed = ' + thisAnim.speed);

            thisAnim._nextFrame = thisAnim._nextFrame + 1;
            if (thisAnim._nextFrame >= thisAnim.sprites.length) {
                thisAnim._nextFrame = 0;
            }
 
            if (thisAnim.rotationInc != 0) {
                thisAnim.rotationAng += thisAnim.rotationInc; 
            }
 
            //proto.DEBUG && console.debug (thisAnim.owner);
            thisAnim.owner.isUpdated = false;

            if (once && thisAnim._nextFrame === 0) {
                proto.DEBUG && console.log ('animation finished once');
                thisAnim.stop ();
                return;
            }

            // requests the next frame in the animation
            if (thisAnim.animTimeout) {
                clearTimeout (thisAnim.animTimeout);
            }
            thisAnim.animTimeout = setTimeout (
                animate, thisAnim.speed);
       }
    }, thisAnim.speed);
}

Animation.prototype.reset = function () {
    this._nextFrame = 0;
}


/***********************************************************************
* AudioTrack object
***********************************************************************/

function AudioTrack (name, soundFile) {

    var audioEle = document.createElement ("audio");
    audioEle.id = (name + '_audioTrack');
    audioEle.src = soundFile;
    document.body.appendChild (audioEle);
    this.audioTrack = document.getElementById (name + '_audioTrack');

}

AudioTrack.prototype.play = function () {
    this.audioTrack.play ();
};

AudioTrack.prototype.setCurrentTime = function (currentTime) {
    this.audioTrack.currentTime = currentTime;
};

AudioTrack.prototype.pause = function () {
    this.audioTrack.pause ();
};



/***********************************************************************
* CustomFont object
***********************************************************************/

function CustomFont (name, cellWidth, cellHeight, imagePath) {
    this.name = name;
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
    this.name = name;

    this.fontImage = new Sprite ({
        name: 'fontImage', 
        width: cellWidth * 26,
        height: cellHeight * 2, 
        imageSrc: imagePath
    });
    if (this.fontImage.isLoaded == false) {
        var that = this;
        setTimeout (function checkIsLoaded () {
            proto.DEBUG && console.log (
                "checkIsLoaded: sprite, sprite.isLoaded = " +
                that.fontImage.image.src + ", " + 
                that.fontImage.isLoaded);
            if (that.fontImage.isLoaded == false) {
                setTimeout (checkIsLoaded, 100);
            } else {
                that.isLoaded = true;
            }
        }, 100);
    } 
}

CustomFont.prototype.drawLine = function (line, canvas, ctx, view,
                                            x, y, lineWidth, 
                                            fontSize) {

    proto.DEBUG && console.log ("CustomFont.drawLine: drawing " + line);

    var letterWidth = 
        Math.min ((this.cellWidth / this.cellHeight) * fontSize, 
                  lineWidth / line.length);
    var letterHeight = fontSize;

    for (var i = 0; i < line.length; ++i) {
        this.drawLetter (line[i], canvas, ctx, view, 
                          x + letterWidth * i, y, letterWidth,
                          letterHeight);
    }

};

CustomFont.prototype.drawLetter = function (letter, canvas, ctx, 
                                              view, x, y, width,
                                              height) {

    proto.DEBUG && console.log ("CustomFont.draw: drawing " + letter);

    var asciiVal = letter.charCodeAt (0);

    var fontRow;
    var fontCol;
    if (asciiVal >= 97 && asciiVal <= 122) {
        fontRow = 0;
        fontCol = asciiVal - 97;
    } else if (asciiVal >= 65 && asciiVal <= 90) {
        fontRow = 1;
        fontCol = asciiVal - 65;
    } else if (asciiVal >= 48 && asciiVal <= 57) {
        fontRow = 2;
        fontCol = asciiVal - 48;
    } else if (asciiVal >= 32 && asciiVal <= 47) {
        fontRow = 3;
        fontCol = asciiVal - 32;
    } else {
        proto.DEBUG && console.log ("CustomFont.draw: Warning: invalid char");
        return;
    }

    this.fontImage.drawSlice (canvas, ctx, view,
                          fontCol * this.cellWidth,
                          fontRow * this.cellHeight,
                          this.cellWidth, this.cellHeight,
                          x, y, width, height);

};


/***********************************************************************
* Text object
***********************************************************************/

/*
Description - Text objects contain all the information needed by a
    CanvasLayer object to draw text. Use CanvasLayer.addText () to
    add a Text object to a CanvasLayer.
*/
function Text (argsDict) {
    /*name, x, y, fontSize, font, lineLength, lineWidth, 
               string, alignment) {*/

    argsDict = typeof argsDict === 'undefined' ? {} : argsDict;

    var defaultPropsDict = {
        name: 'default',
    /* x and y represent the coordinates of the text with respect to 
       the current region */ 
        x: 0,
        y: 0,
        font: 'courier', // a string or CustomFont object
        fontSize: 12,
        lineLength: 72, // max characters per line
        lineWidth: 72, // max line width
        string: '', // the text to be drawn
        alignment: 'left',
        color: 'black',
        spacing: 0
    };

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);

    this.fontType = typeof (this.font);
    this.lineHeight = this.fontSize;
    //this.lines = 0;
    this.lines = this.string.length / this.lineLength;

}

/*
appendString -
    Appends the given string to this.string. Returns true if at least 1
new line is needed to contain the new string, false otherwise. 
Bug: if the new string length requires multiple new lines, this.lines
     should probably be updated. Perhaps the number of new lines added
     should be returned instead of true.
*/
Text.prototype.appendString = function (string) {
    this.string += string;
    if (this.string.length - (this.lines * this.lineLength) > 
        this.lineLength) return true;
    return false;
}

Text.prototype.setString = function (string) {
    this.string = string; 
    this.lines = this.string.length / this.lineLength;
}

Text.prototype.deleteLastChar = function () {
    this.string = this.string.substring (0, this.string.length - 1);
    this.lines = this.string.length / this.lineLength;
}

/*
draw -
    Clears the given canvas, sets the font color and draws this.string.
this.string is drawn on multiple lines if its length exceeds 
this.lineLength. The text will be drawn relative to the coordinates
contained in view.
Arguments:
    canvas - the canvas that the text will be drawn on
    ctx - the context corresponding to the canvas
    view - a View object 
Bug: text is drawn even if it's outside of the view.
*/
Text.prototype.draw = function (canvas, ctx, view) {
    var remainingString = this.string;
    var line;
    var lineNumber = 1;

    proto.DEBUG && console.log ('Text.draw: drawing ' + this.string);
    proto.DEBUG && console.log ('name = ' + this.name);
    if (this.fontType === 'string') {
        //ctx.clearRect (0, 0, view.width, view.height);
        ctx.font = this.fontSize + "pt " + this.font;
        ctx.fillStyle = this.color;
        ctx.textAlign = this.alignment;
    }

    // draw text one line at a time
    while (remainingString.length > this.lineLength ||
           remainingString.indexOf ('\n') != -1) {
        //proto.DEBUG && console.log ('Text.draw: drawing line ' + lineNumber);

        // handle newline characters
        if (remainingString.indexOf ('\n') != -1 &&
            remainingString.indexOf ('\n') < this.lineLength + 1) {

            line = remainingString.substring (
                       0, remainingString.indexOf ('\n'));
            remainingString = remainingString.substring (
                remainingString.indexOf ('\n') + 1);
        } else {
            line = remainingString.substring (0, this.lineLength + 1);
            remainingString =
                remainingString.substring (this.lineLength + 1);
        }

        //proto.DEBUG && console.log ('Text.draw: line = ' + line);
/*
        proto.DEBUG && console.log ('Text.draw: this.x - view.x = ' + 
                     (this.x - view.x));
        proto.DEBUG && console.log ('Text.draw: y = ' + 
              ((this.y - view.y) + (lineNumber * this.lineHeight)));
*/
        if (this.fontType === 'string') {
            ctx.fillText (line, this.x - view.x, 
                          (this.y - view.y) + 
                          (lineNumber * this.lineHeight),
                          this.lineWidth);
        } else {
            this.font.drawLine (line, 
                           canvas, ctx, view,
                           this.x - view.x, 
                           (this.y - view.y) + 
                           (lineNumber * this.lineHeight),
                           this.lineWidth, this.fontSize);
        }

        lineNumber++;
    }

    // draw any remaining text
    /*proto.DEBUG && console.log ('Text.draw: drawing line ' + lineNumber);
    proto.DEBUG && console.log ('Text.draw: line = ' + remainingString);
    proto.DEBUG && console.log ('Text.draw: this.x - view.x = ' + 
                 (this.x - view.x));
    proto.DEBUG && console.log ('view.y = ' + view.y);
    proto.DEBUG && console.log ('this.lineHeight = ' + this.lineHeight);
    proto.DEBUG && console.log ('Text.draw: y = ' + 
          ((this.y - view.y) + (lineNumber * this.lineHeight)));*/

    if (this.fontType === 'string') {
        //console.log ('Text.draw: drawing line');
        ctx.fillText (
            remainingString, this.x - view.x, 
            (this.y - view.y) + 
            (lineNumber * (this.spacing + this.lineHeight)),
            this.lineWidth);
    } else {
        this.font.drawLine (
            remainingString, canvas, ctx, view,
            this.x - view.x, 
            (this.y - view.y) + 
            (lineNumber * (this.spacing + this.lineHeight)),
            this.lineWidth, this.fontSize);
    }

    this.lines = lineNumber - 1;

}

Text.prototype.moveTo = function (x, y) {
    this.x = x;
    this.y = y;
}

Text.prototype.moveToRelative = function (x, y) {
    this.x += x;
    this.y += y;
}

