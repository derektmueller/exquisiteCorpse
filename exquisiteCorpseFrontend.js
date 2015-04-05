
var ExquisiteCorpseFrontend = (function () {

function ExquisiteCorpseFrontend () {
    var that = this;
    this.imageDimensions = [27, 36 / 2];
    this.scaleFactor = 14;
    this.canvasDimensions = this.imageDimensions.map (function (elem) { 
        return elem * that.scaleFactor; 
    });
    this.userPaper$ = null;
    this.aiPaper$ = null;
    ExquisiteCorpseBase.call (this);
    this.init ();
};

ExquisiteCorpseFrontend.prototype = Object.create (ExquisiteCorpseBase.prototype);

ExquisiteCorpseFrontend.prototype.categorizePixels = function (data) {
    var values = [];
    for (var i = 0; i < data.length; i += 4) {
        values.push (
            data[i + 3] > 0 ? 1 : 0
        ); 
    }
    return values;
};

ExquisiteCorpseFrontend.prototype.getTheta = function () {
    var that = this;
    return new Promise (function (resolve) {
        $.ajax ({
            url: 'theta.json',
            dataType: 'json',
            success: function (data) {
                resolve (data);
            }
        });
    });
};

ExquisiteCorpseFrontend.prototype.setUpNN = function (Theta) {
    this.Theta = Theta;    
    var S = Theta.map (function (matrix) { return matrix.length; });
    S.push (Theta[Theta.length - 1][0].length - 1);
    this.nn = new NN (S);
    this.h = this.nn.getH (Theta);
    console.log ('done');
};

ExquisiteCorpseFrontend.prototype.scaleDownImage = function (data) {
    var scaled = [];
    //console.assert (data.length == 14 * 14 * this.imageDimensions[0] * this.imageDimensions[1]);
    for (var l = 0; l < this.imageDimensions[1]; l++) {
        scalePixel: 
        for (var i = 0; i < this.imageDimensions[0]; i++) {
            for (var j = 0; j < this.scaleFactor; j++) {
                for (var k = 0; k < this.scaleFactor; k++) {
                    var pixelIndex = 
                        l * this.scaleFactor * this.canvasDimensions[0] + 
                        i * this.scaleFactor + k + j * this.canvasDimensions[0];
                    if (data[pixelIndex]) {
                        scaled.push (1);
                        continue scalePixel;
                    }
                }
            }
            scaled.push (0);
        }
    }
    return scaled;
};

ExquisiteCorpseFrontend.prototype.scaleUpImage = function (data) {
    var restored = new Array (data.length * Math.pow (this.scaleFactor, 2)).join (',').split (',');
    console.assert (data.length == this.imageDimensions[1] * this.imageDimensions[0]);
    for (var l = 0; l < this.imageDimensions[1]; l++) {
        for (var i = 0; i < this.imageDimensions[0]; i++) {
            for (var j = 0; j < this.scaleFactor; j++) {
                for (var k = 0; k < this.scaleFactor; k++) {
                    restored[
                        l * this.scaleFactor * this.canvasDimensions[0] +
                        i * this.scaleFactor + k + j * this.canvasDimensions[0]] = 

                        data[l * this.imageDimensions[0] + i];
                }
            }
        }
    }
    return restored;
};

ExquisiteCorpseFrontend.prototype.categoriesToPixels = function (data) {
    var pixels = [];
    for (var i in data) {
        if (data[i]) {
            pixels.push (0, 0, 0, 255);
        } else {
            pixels.push (255, 255, 255, 255);
        }
    }
    return pixels;
};

ExquisiteCorpseFrontend.prototype.threshold = function (data, threshold) {
    threshold = typeof threshold === 'undefined' ? 0.5 : threshold; 
    data = data.map (function (elem) {    
        return elem > threshold ? 1 : 0;
    });
    return data;
};

ExquisiteCorpseFrontend.prototype.restoreImage = function (hypothesis) {
    var pixels = this.categoriesToPixels (this.scaleUpImage (this.threshold (hypothesis)));
    this.putImageData (pixels);
};

ExquisiteCorpseFrontend.prototype.putImageData = function (pixels) {
    var imageData = this.getImageData ();
    for (var i = 0; i < pixels.length; i++) {
        imageData.data[i] = pixels[i];
    }
    this.getCtx ().putImageData (imageData, 0, 0);
};

ExquisiteCorpseFrontend.prototype.getCtx = function (userCanvas) {
    userCanvas = typeof userCanvas === 'undefined' ? false : userCanvas; 
    if (userCanvas) {
        var canvas = this.userPaper$[0];
    } else {
        var canvas = this.aiPaper$[0];
    }
    return canvas.getContext ('2d');
};

ExquisiteCorpseFrontend.prototype.getImageData = function (userCanvas) {
    userCanvas = typeof userCanvas === 'undefined' ? false : userCanvas; 
    var canvas = this.userPaper$[0];
    var ctx = this.getCtx (userCanvas);
    return ctx.getImageData (0, 0, canvas.width, canvas.height);
};

ExquisiteCorpseFrontend.prototype.vectorizeDrawing = function () {
    var imageData = this.getImageData (true);
    var example = this.scaleDownImage (this.categorizePixels (imageData.data));
    //console.log (this.categorizePixels (imageData.data).reverse ());
    //console.log (example.reverse ());
    this.restoreImage (this.h (example));
    return;
    var pixels = this.categoriesToPixels (this.scaleUpImage (example));
    this.putImageData (pixels);
};

ExquisiteCorpseFrontend.prototype.setUpPaper = function () {
    var that = this;
    var container$ = $('#canvas-container');
    var sketchpad = new JustDrawing ({
        container: container$,
        width: this.canvasDimensions[0],
        height: this.canvasDimensions[1],
        onClear: function () {
            that.getCtx ().clearRect (0, 0, that.aiPaper$[0].width, that.aiPaper$[0].height);
        }
    });
    var canvas = sketchpad.getCanvas ().canvas;

    this.userPaper$ = $(canvas);
    this.aiPaper$ = $('#ai-paper');
    this.aiPaper$.attr ('height', this.userPaper$[0].height);
    this.aiPaper$.attr ('width', this.userPaper$[0].width);
};

ExquisiteCorpseFrontend.prototype.init = function () {
    this.setUpPaper (); 
    this.getTheta ().then (this.setUpNN.bind (this));
};

return ExquisiteCorpseFrontend;

}) ();

