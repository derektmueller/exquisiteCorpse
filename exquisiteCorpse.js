#!/usr/bin/node

var exec = require ('child_process').exec,
    exit = process.exit,
    math = require ('mathjs'),
    Q = require ('q'),
    getPixels = require ('get-pixels'),
    NN = require ('./NN'),
    PCA = require ('./PCA'),
    ExquisiteCorpseBase = require ('./exquisiteCorpseBase'),
    fs = require ('fs')
    ;

Q.longStackSupport = true;

var exquisiteCorpse = (function () {

function ExquisiteCorpse () {
    this.parseArgs ();
    //this.imageDimensions = [27, 36];
    //this.imageDirectory = 'compressedImages';
    this.datasetSize = 140;
    this.imageDimensions = [90, 120];
    this.imageDirectory = 'images';
    this.h = null;
    ExquisiteCorpseBase.call (this);
    this.init ();
};

ExquisiteCorpse.prototype = Object.create (ExquisiteCorpseBase.prototype);

/**
 * Get list of image filenames
 */
ExquisiteCorpse.prototype.getFileList = function () {
    var that = this;
    return Q.Promise (function (resolve) { 
        exec ('find ' + that.imageDirectory + ' -type f', function (err, out) {
            //resolve (out.replace (/\n$/, '').split ("\n").slice (0, 16));
            resolve (out.replace (/\n$/, '').split ("\n").slice (0, that.datasetSize));
        });
    });
};

/**
 * Extract pixel data from each file in fileList
 */
ExquisiteCorpse.prototype.getPixelData = function (fileList) {
    var that = this;
    return Q.all (fileList.map (function (filename) { 
        return Q.Promise (function (resolve) {
            getPixels (filename, function (err, pixels) {
                if (pixels.data.length !== math.prod (that.imageDimensions) * 4) {
                    throw new Error ('invalid image dimensions');
                }
                resolve (pixels.data);
            });
        });
    }));
};

//ExquisiteCorpse.prototype.vectorizePixelData = function (pixelData) {
//    return pixelData;
//};

/**
 * Capture information only about the contours of the drawing. For each black pixel, add that 
 * pixel's index to the input vector. Fill remaining parameters with zeroes.
 */
ExquisiteCorpse.prototype.vectorizePixelData = function (pixelData) {
    var n = 486;
    var vec = new Array (486).join (',').split (',').map (function (elem) {
        return 0;
    });
    var j = 0;
    for (var i in pixelData) {
        if (j >= n) break;
        var datum = pixelData[i];
        if (datum) {
            vec[j++] = parseInt (i, 10);
        }
    }
    return vec;
};

/**
 * Process image data into neural net input
 */
ExquisiteCorpse.prototype.buildDataset = function () {
    var that = this;

    return Q.Promise (function (resolve) {
        if (that.options.infile) {
            
            fs.readFile (that.options.infile, function (err, data) {
                resolve (JSON.parse (data)); 
            });
            return;
        }
        that.getFileList ()
            .then (that.getPixelData.bind (that))
            .then (function (imageData) { 
                var dataset = imageData.map (that.categorizePixels);

//                // reduce dimensionality
//                var pca = new PCA (dataset, null, 99)
//                console.log ('pca = ');
//                console.log (pca.reducedX[0].length);
//
//                // scale and normalize
//                var mu = math.mean (dataset, 0);
//                var s = math.sqrt (
//                    math.subtract (math.mean (math.square (dataset), 0),  math.square (mu)));
//                var divisors = s.map (function (std) {
//                    return std ? std : 1;
//                });
//                for (var i in dataset) {
//                    dataset[i] = math.dotDivide (math.subtract (dataset[i], mu), divisors);
//                }

                // split image data into feature vectors and labels
                var pixelCount = math.prod (that.imageDimensions);
                var labeledDataset = [];
                var labels = [];
                var vectors = [];
                for (var i in dataset) {
                    vectors.push (that.vectorizePixelData (dataset[i].slice (0, pixelCount / 2)));
                    labels.push (dataset[i].slice (pixelCount / 2));
                    labeledDataset.push ([vectors[i], labels[i]]);
                }

                that.postProcessDataset (labeledDataset, vectors);
                if (!that.options.preprocessOnly) resolve (labeledDataset); 
            })
            .catch (function (error) {
                /**/console.log (error); console.log (error.stack);
            });
    });
};

ExquisiteCorpse.prototype.postProcessDataset = function (labeledDataset, vectors) {
    // scale and normalize
//    var mu = math.mean (vectors, 0);
//    var s = math.sqrt (
//        math.subtract (math.mean (math.square (vectors), 0),  math.square (mu)));
//    var divisors = s.map (function (std) {
//        return std ? std : 1;
//    });
//    for (var i in vectors) {
//        vectors[i] = math.dotDivide (math.subtract (vectors[i], mu), divisors);
//    }

    var pca = new PCA (vectors, null, 99.9)
    console.log ('pca = ');
    console.log (pca.reducedX[0].length);
    for (var i in pca.reducedX) {
        labeledDataset[i][0]= pca.reducedX[i];
    }
    if (this.options.preprocessOnly) this.writeOutput (JSON.stringify (labeledDataset));
};

/**
 * Learn neural net parameters from processed image data
 */
ExquisiteCorpse.prototype.learn = function () {
    var that = this;
    this.buildDataset ()
        .then (function (dataset) {
            var pixelCount = math.prod (that.imageDimensions);
            var nn = new NN ([
                dataset[0][0].length, 
                dataset[0][0].length, 
                dataset[0][0].length, 
                pixelCount / 2]);
            nn.lambda = 0.001;
            nn.trainingSet = dataset;
            //nn.enableRegularization = false;
            nn.enableGradientChecking = false;
            console.log ('nn = ');
            console.log (nn);
            var Theta = nn.gradientDescent (1, 0.3);
            that.h = nn.getH (Theta);
           //console.log ('dataset[0]; = ');
//           console.log (dataset[0][0].length);
//            that.h (dataset[0][0]);
            that.writeOutput (JSON.stringify (Theta));
        })
        .catch (function (error) {
            /**/console.log (error); console.log (error.stack);
        });
};

ExquisiteCorpse.prototype.writeOutput = function (output) {
    fs.writeFile (this.options.filename, output, function (err) {
        exit ();
    });
};


ExquisiteCorpse.prototype.parseArgs = function () {
    var getOpt = require('node-getopt').create([
        ['f', 'filename=ARG' , 'output file'],
        ['p', 'preprocessOnly' , 'prepdocess dataset only'],
        ['i', 'infile=ARG' , 'input file'],
    ])          
    .bindHelp();

    var opt = getOpt.parseSystem();
    if (!opt.options.filename) {
        getOpt.showHelp ();
        process.exit ();
    }

    this.options = opt.options;
};

ExquisiteCorpse.prototype.init = function () {
    this.learn ();
};

return new ExquisiteCorpse;

}) ();


