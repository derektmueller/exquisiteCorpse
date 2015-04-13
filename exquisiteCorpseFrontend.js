
var ExquisiteCorpseFrontend = (function () {

function ExquisiteCorpseFrontend () {
    var that = this;
    //this.imageDimensions = [27, 36 / 2];
    this.imageDimensions = [90, 120 / 2];
    //this.scaleFactor = 14;
    this.scaleFactor = 5;
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
            //url: 'params/16_images_27_by_36_300_iterations.json',
            dataType: 'json',
            success: function (data) {
                that.Theta = data.Theta;
                that.mu = data.mu;
                that.sigma = data.sigma;
                that.reducedU = data.reducedU;
                resolve ();
            }
        });
    });
};

ExquisiteCorpseFrontend.prototype.setUpNN = function () {
    var Theta = this.Theta; 
    var S = Theta.map (function (matrix) { return matrix.length; });
    S.push (Theta[Theta.length - 1][0].length - 1);
    this.nn = new NN (S);
    this.h = this.nn.getH (Theta);
    console.log ('done');
    var that = this;
    setInterval (function () {
    //setTimeout (function () {
        that.vectorizeDrawing ();
    }, 750);
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

ExquisiteCorpseFrontend.prototype.putImageData = function (pixels, canvas) {
    canvas = typeof canvas === 'undefined' ? this.aiPaper$[0] : canvas; 
    var imageData = this.getImageData ();
    for (var i = 0; i < pixels.length; i++) {
        imageData.data[i] = pixels[i];
    }
    this.getCtx (canvas).putImageData (imageData, 0, 0);
};

ExquisiteCorpseFrontend.prototype.getCtx = function (canvas) {
    canvas = typeof canvas === 'undefined' ? this.aiPaper$[0] : canvas; 
    return canvas.getContext ('2d');
};

ExquisiteCorpseFrontend.prototype.getImageData = function (canvas) {
    canvas = typeof canvas === 'undefined' ? this.aiPaper$[0] : canvas; 
    var ctx = this.getCtx (canvas);
    return ctx.getImageData (0, 0, canvas.width, canvas.height);
};

//ExquisiteCorpseFrontend.prototype.vectorizeDrawing = function () {
//    var imageData = this.getImageData (this.userPaper$[0]);
//    var example = this.scaleDownImage (this.categorizePixels (imageData.data));
//    this.restoreImage (this.h (example));
//
//    //var pixels = this.categoriesToPixels (this.scaleUpImage (example));
//    //this.putImageData (pixels, this.userPaperCompressed$[0]);
//};

ExquisiteCorpseFrontend.prototype.scaleAndMeanNormalize = function (example) {
    if (!this.mu || !this.sigma) return example;
    return math.dotDivide (math.subtract (example, this.mu), this.sigma);
};

ExquisiteCorpseFrontend.prototype.reduceDimensionality = function (example) {
    if (!this.reducedU) return example;
    return PCA.reduceDimensionality ([example], this.reducedU)[0];
};

ExquisiteCorpseFrontend.prototype.vectorizeDrawing = function () {
    var imageData = this.getImageData (this.userPaper$[0]);
    var scaled = this.scaleDownImage (
        this.categorizePixels (imageData.data));
    console.log ('ink');
    console.log (scaled.filter (function (elem) { return elem; }).length);
    var example = 
        this.reduceDimensionality (
            this.scaleAndMeanNormalize (
                this.vectorizePixelData (scaled)));
    //console.log ('example = ');
    //console.log (this.h (example));
    this.restoreImage (this.h (example));
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
            that.getCtx (that.userPaperCompressed$[0]).
                clearRect (0, 0, that.aiPaper$[0].width, that.aiPaper$[0].height);
        },
        onDrag: function () {
            var imageData = that.getImageData (that.userPaper$[0]);
            var example = that.scaleDownImage (that.categorizePixels (imageData.data));
            var pixels = that.categoriesToPixels (that.scaleUpImage (example));
            that.putImageData (pixels, that.userPaperCompressed$[0]);
        }
    });
    var canvas = sketchpad.getCanvas ().canvas;

    this.userPaper$ = $(canvas);
    this.aiPaper$ = $('#ai-paper');
    this.aiPaper$.attr ('height', this.userPaper$[0].height);
    this.aiPaper$.attr ('width', this.userPaper$[0].width);

    this.userPaperCompressed$ = $('#canvas-compressed');
    this.userPaperCompressed$.attr ('height', this.userPaper$[0].height);
    this.userPaperCompressed$.attr ('width', this.userPaper$[0].width);
};

ExquisiteCorpseFrontend.prototype.init = function () {
    this.setUpPaper (); 
    this.getTheta ().then (this.setUpNN.bind (this));
};

return ExquisiteCorpseFrontend;

}) ();

