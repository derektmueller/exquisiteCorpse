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
    this.imageDimensions = [27, 36];
    this.imageDirectory = 'compressedImages';
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
            resolve (out.replace (/\n$/, '').split ("\n").slice (0, 16));
        });
    });
};

/**
 * Extract pixel data from each file in fileList
 */
ExquisiteCorpse.prototype.vectorizeImages = function (fileList) {
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

/**
 * Process image data into neural net input
 */
ExquisiteCorpse.prototype.buildDataset = function () {
    var that = this;
    return Q.Promise (function (resolve) {
        that.getFileList ()
            .then (that.vectorizeImages.bind (that))
            .then (function (imageData) { 

                var dataset = imageData.map (that.categorizePixels);

                // reduce dimensionality
//                var pca = new PCA (dataset, null, 99)
//                console.log ('pca = ');
//                console.log (pca.reducedX[0].length);

                // scale and normalize
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
                for (var i in dataset) {
                    labeledDataset.push (
                        [dataset[i].slice (0, pixelCount / 2), 
                         dataset[i].slice (pixelCount / 2)]);
                }

                resolve (labeledDataset); 
            })
            .catch (function (error) {
                /**/console.log (error); console.log (error.stack);
            });
    });
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
                pixelCount / 2, pixelCount / 2, pixelCount / 2]);
            nn.trainingSet = dataset;
            nn.enableGradientChecking = false;
            var Theta = nn.gradientDescent (300, 0.10);
            that.h = nn.getH (Theta);
//           console.log ('dataset[0]; = ');
//           console.log (dataset[0][0].length);
//            that.h (dataset[0][0]);
            //return;
            fs.writeFile (that.options.filename, JSON.stringify (Theta), function (err) {
            });
        })
        .catch (function (error) {
            /**/console.log (error); console.log (error.stack);
        });
};


ExquisiteCorpse.prototype.parseArgs = function () {
    var getOpt = require('node-getopt').create([
        ['f', 'filename=ARG' , 'output file'],
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


