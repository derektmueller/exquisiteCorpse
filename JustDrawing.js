/*
https://github.com/parenparen/

Copyright 2013 Derek Mueller
Released under the MIT license
http://opensource.org/licenses/MIT

Sat Nov  9 15:35:50 PST 2013
*/


JustDrawing.debug = true;

function JustDrawing (argsDict) {
    argsDict = typeof argsDict === 'undefined' ? {} : argsDict;

    var defaultPropsDict = {
        container: null,
        width: 100,
        height: 100,
        name: '',
        onClear: function () {},
        onDrag: function () {}
    };

    proto.unpack.apply (this, [argsDict, defaultPropsDict]);

    this._parentElement = $(this.container);

    this._init ();
}

/*
Public static methods
*/

/*
Private static methods
*/

/*
Public instance methods
*/

/*
Private instance methods
*/

JustDrawing.prototype._setUpCanvas = function () {
    var that = this;

    this._world = new World ({
        name: this.name + 'JDWorld',
        x: this.x,
        y: this.y,
        width: this.width, 
        height: this.height,
        parentElement: this._parentElement,
        suppressEvtFns: false
    });

    this._world.makeActive ();
    var newRegion = new Region ({name: "UI_0"});

    var surface = new CommonThing ({
        'name': 'surface',
        'clearOnDraw': true
    });

    var stroke = surface.addPath ({ 
        name: 'stroke',
        lineWidth: 1, color: 'black', isFilled: false, 
        lineJoin: 'round'});

    var prevPoint = null;
    surface.addDragFunction (function (mouseX, mouseY) {
        var currPoint = [mouseX, mouseY];
        if (prevPoint) {
            stroke.addCommand (Path.lineTo, {
                x: currPoint[0],
                y: currPoint[1]
            });
        } else {
            stroke.addCommand (Path.moveTo, {
                x: currPoint[0],
                y: currPoint[1]
            });
        }
        surface.refreshCanvases ();
        prevPoint = currPoint;
        that.onDrag ();
    }, true);

    surface.addDropFunction (function (mouseX, mouseY) {
        prevPoint = null;
        that.onDrag ();
    });
    
    newRegion.addThing (surface);

    this._world.addRegion (newRegion);

    this._world.changeRegion ("UI_0");
    this._world.start ();

    $(this._parentElement).outerWidth (this.width);
    $(this._parentElement).height (this.height);

};

JustDrawing.prototype.getCanvas = function () {
    return this._getSurface ().getTopCanvas ();
};


JustDrawing.prototype._getSurface = function () {
    return this._world.currRegion.things.surface;
};


JustDrawing.prototype._setUpControls = function () {
    var that = this;   
    var controls = $('<div>', { 'class': 'jd-controls' }).append (
        $('<button>', {
            'class': 'jd-clear-button',
            'text': 'Clear',
        })
    );

    $(this._parentElement).before ($(controls));

    $(controls).find ('.jd-clear-button').click (function () {
        var surface = that._getSurface ()
        surface.clearCanvases ();
        surface.getTopCanvas ().paths.stroke.clearCommands ();
        that.onClear ();
    });

    $(controls).width (this.width);
};

JustDrawing.prototype._init = function () {

    $(this._parentElement).addClass ('jd-canvas-container');
    this._setUpControls ();
    this._setUpCanvas ();

};

