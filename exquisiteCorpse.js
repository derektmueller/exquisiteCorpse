#!/usr/bin/node

var exec = require ('child_process').exec,
    exit = process.exit,
    math = require ('mathjs'),
    Q = require ('q'),
    getPixels = require ('get-pixels'),
    NN = require ('./NN'),
    PCA = require ('./PCA'),
    fs = require ('fs')
    ;

Q.longStackSupport = true;

var ExquisiteCorpse = (function () {

function ExquisiteCorpse () {
    this.imageDimensions = [27, 36];
    this.init ();
};

ExquisiteCorpse.prototype.getFileList = function () {
    return Q.Promise (function (resolve) { 
        exec ('find compressedImages/ -type f', function (err, out) {
            resolve (out.replace (/\n$/, '').split ("\n").slice (0, 8));
        });
    });
};

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

ExquisiteCorpse.prototype.buildDataset = function () {
    var that = this;
    return Q.Promise (function (resolve) {
        that.getFileList ()
            .then (that.vectorizeImages.bind (that))
            .then (function (imageData) { 

                // categorize pixels (white or not white)
                var dataset = [];
                for (var i in imageData) {
                    var data = imageData[i];
                    var values = [];
                    for (var i = 0; i < data.length; i += 4) {
                        values.push (
                            data[i] + data[i + 1] + data[i + 2] == (255 * 3) ? 0 : 1
                        ); 
                    }
                    dataset.push (values);
                }

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

ExquisiteCorpse.prototype.learn = function () {
    var that = this;
    this.buildDataset ()
        .then (function (dataset) {
            var pixelCount = math.prod (that.imageDimensions);
            var nn = new NN ([
                pixelCount / 2, pixelCount / 2, pixelCount / 2]);
            nn.trainingSet = dataset;
            var Theta = nn.gradientDescent (18, 0.10);
        })
        .catch (function (error) {
            /**/console.log (error); console.log (error.stack);
        });
};

ExquisiteCorpse.prototype.init = function () {
    this.learn ();
};

return new ExquisiteCorpse;

}) ();


