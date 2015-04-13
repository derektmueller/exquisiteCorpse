//#!/usr/bin/node

if (typeof require !== 'undefined') {
    var math = require ('mathjs');
    var numeric = require ('numeric');
    var assert = require ('assert');
} else {
    var math = mathjs;
    var assert = console.assert;
}

var PCA = (function () {

function PCA (X, k, varianceRetention, skipPreproccessing) {
    skipPreproccessing = typeof skipPreproccessing === 'undefined' ? true : skipPreproccessing; 
    this.mu;
    this.s;
    this.X = math.clone (X);
    this.k = k;
    this.varianceRetention = varianceRetention;
    this.run ();
}

PCA.reduceDimensionality = function (X, reducedU) {
    return math.multiply (X, math.transpose (reducedU));
};

PCA.prototype.run = function () {
    var X = this.X;
    var k = this.k;
    var varianceRetention = this.varianceRetention;
    if (!this.skipPreproccessing) this.preprocess ();
    var USV = numeric.svd (this.sigma ());

    if (!k && varianceRetention) {
        var sumOfSingularValues = math.sum (USV.S)
        var sumOfFirstISingularValues = 0;
        for (var i = 0; i < X[0].length; i++) {
            sumOfFirstISingularValues += USV.S[i];
            console.log (sumOfFirstISingularValues / sumOfSingularValues);
            if (1 - sumOfFirstISingularValues / sumOfSingularValues <= 
                1 - varianceRetention / 100) {

                break;
            }
        }
        k = i + 1;
    } else if (!k && !varianceRetention) {
        throw new Error ('Must specify explicity k value or variance retention');
    }

    this.reducedDimension = k;
    this.reducedU = USV.U.slice (0, k);
    this.reducedX = PCA.reduceDimensionality (X, this.reducedU);
};

/**
 * Approximate original dataset
 */
PCA.prototype.reconstruct = function () {
    return math.multiply (this.reducedX, this.reducedU);
};

PCA.prototype.postProcess = function (X) {
    for (var i in X) {
        X[i] = math.add (this.mu, math.dotMultiply (X[i], this.s));
    }
    return X;
};

/**
 * Perform mean normalization and feature scaling on dataset
 */
PCA.prototype.preprocess = function () {
    var X = this.X;
    var mu = math.mean (X, 0);
    var s = math.sqrt (math.subtract (math.mean (math.square (X), 0),  math.square (mu)));
    var divisors = s.map (function (std) {
        return std ? std : 1;
    });
    for (var i in X) {
        X[i] = math.dotDivide (math.subtract (X[i], mu), divisors);
    }
    this.mu = mu;
    this.s = s;
};

/**
 * Compute covariance matrix
 */
PCA.prototype.sigma = function () {
    var X = this.X;
    var sigma = math.dotMultiply (1 / X.length, math.multiply (math.transpose (X), X));
    return sigma;
};

return PCA;

}) ();

if (typeof module !== 'undefined') module.exports = PCA;

if (typeof GLOBAL !== 'undefined') {
    GLOBAL.test = function () {
        var pca = new PCA ([
            [1, 2, 4],
            [3, 4, 4],
            [4, 8, 4],
            [8, 8, 3]
        ], 2);
        console.log ('PCA = ');
        console.log (pca);
        console.log (pca.postProcess (pca.reconstruct ()));
        //console.log (PCA.reconstruct.apply (null, retVal));
    };
}
