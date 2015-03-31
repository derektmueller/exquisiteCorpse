
var ExquisiteCorpseFrontend = (function () {

function ExquisiteCorpseFrontend (Theta) {
    this.Theta = Theta;    
    this.nn = new NN ([]);
    this.h = this.nn.getH (Theta);
    this.init ();
};

ExquisiteCorpseFrontend.prototype.setUpPaper = function () {
    var container$ = $('#canvas-container');
    var sketchpad = new JustDrawing ({
        container: container$,
        width: 400,
        height: 200
    });
    var canvas = sketchpad.getCanvas ();
};

ExquisiteCorpseFrontend.prototype.init = function () {
    this.setUpPaper (); 
};

return ExquisiteCorpseFrontend;

}) ();

