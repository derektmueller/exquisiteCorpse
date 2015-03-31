//#!/usr/bin/node

if (typeof require !== 'undefined') {
    var math = require ('mathjs');
    var assert = require ('assert');
} else {
    var math = mathjs;
    var assert = console.assert;
}

var NN = (function () {

/**
 * @param Array S units per layer
 */
function NN (S) {
    this.S = S; 
    this.L = this.S.length; // number of layers
    this.trainingSet = [];    
    this.lambda = 0.01; // regularization term
    this.a = []; // activations
    this.enableRegularization = true;
    this.enableGradientChecking = false;
};

NN.getElem = function (i) {
    return function (a) {
        return a[i];
    }
};

/**
 * Hypothesis function getter
 * @param Array X
 */
NN.prototype.getH = function (Theta) {
    var that = this;
    return function (X) {
        return that.forwardProp (Theta, X);
    };
};

/**
 * Get regularization term of cost function
 */
NN.prototype.getRegularizationTerm = function (Theta) {
//    console.log ('getRegularizationTerm');
//    console.log ('Theta = ');
//    console.log (Theta);
//    console.log (this.unrollParams (Theta, true));
//    console.log (math.square (this.unrollParams (Theta, true)));
//    console.log (math.sum (math.square (this.unrollParams (Theta, true))));
    return math.multiply (
        this.lambda / (2 * this.trainingSet.length),
        math.sum (math.square (this.unrollParams (Theta, true)))
    );
};

/**
 * Cost function
 * @param Array Theta
 */
NN.prototype.J = function (Theta) {
    var cost = 0, 
        h = this.getH (Theta),
        hVal,
        ex,
        x,
        y;
    for (var i in this.trainingSet) {
        ex = this.trainingSet[i];
        x = ex[0];
        y = ex[1];
        hVal = h (x);
        cost = math.add (
            cost,
            math.sum (math.add (
                math.multiply (
                    y,
                    math.log (
                        hVal
                    )
                ),
                math.multiply (
                    math.subtract (
                        1,
                        y
                    ),
                    math.log (
                        math.subtract (
                            1,
                            hVal
                        )
                    )
                )
            ))
        );
    }
    cost = math.multiply (
        -(1 / this.trainingSet.length),
        cost
    );
    if (this.enableRegularization)
        cost = math.add (
            cost,
            this.getRegularizationTerm (Theta)
        );
    return cost;
};

/**
 * Sigmoid activation
 */
NN.prototype.g = function (X, Theta) {
    if (X instanceof Array) {
        return math.divide (
            1,
            math.add (
                1, 
                math.pow (
                    Math.E, 
                    -math.multiply (
                        Theta, 
                        X
                    )
                )
            )
        );
    } else {
        return math.divide (
            1,
            math.add (
                1, 
                math.pow (
                    Math.E, 
                    -X
                )
            )
        );
    }
};

/**
 * Map helper which coerces argument to array
 */
NN.prototype.map = function (x, callback) {
    x = x instanceof Array ? x : [x];
    return math.map (x, callback); 
};

/**
 * Forward propagate input vector through neural network, saving 
 * activations of each layer of neurons in the property a. Saved
 * activation values can are used by back propagation.
 * @param Array X training example
 * @return Array hypothesis
 */
NN.prototype.forwardProp = function (Theta, X, i) {
    var L = Theta.length + 1;
    i = typeof i === 'undefined' ? L - 2 : i; 
    if (i === -1) {
        this.a[i + 1] = X;
    } else {
        var that = this;
    //   console.log ('this.Theta[i]  = ');
    //   console.log (this.Theta[i] );
    //   console.log ('[1].concat (this.forwardProp (X, i - 1)) = ');
    //   console.log ([1].concat (this.forwardProp (X, i - 1)));
        this.a[i + 1] = this.map (
            math.multiply (
                Theta[i], 
                this.forwardProp (Theta, X, i - 1)
            ), function (elem) {
                return that.g (elem);
            });
    }
    if (i !== this.L - 2) {
        // add bias activation value
        this.a[i + 1] = [1].concat (this.a[i + 1]);
    }
    return this.a[i + 1];
};

/**
 * Helper function for backProp which recursively calculates error 
 * terms for each neuron
 */
NN.prototype.getErrorTerms = function (Theta, y, delta, i) {
//    console.log ('delta = ');
//    console.log (delta);
    if (typeof i === 'undefined') {
        i = this.S.length - 1;
//        console.log ('this.a[i] = ');
//        console.log (this.a[i]);
        delta = [math.subtract (
            this.a[i],
            y
        )];
    } else if (i === 0) {
        return delta;
    } else {
//        console.log ('math.transpose (this.Theta[i]) = ');
//        console.log (math.transpose (this.Theta[i]));
        delta = [math.dotMultiply (
            math.multiply (
                math.transpose (Theta[i]),
                i === this.S.length - 2 ? 
                    delta[0] :
                    delta[0].slice (1) // remove bias error unit
            ),
            math.dotMultiply (
                this.a[i],
                math.subtract (
                    1,
                    this.a[i]
                )
            )
        )].concat (delta);
    }
//    console.log ('i = ');
//    console.log (i);
    return this.getErrorTerms (Theta, y, delta, i - 1);
};

/**
 * Computes partial derivatives of cost function J
 */
NN.prototype.backProp = function (Theta) {
    // initialize partial derivative values at 0
    var Delta = [];
    for (var i = 0; i < this.S.length - 1; i++) {
        Delta.push ([]);
        for (var j = 0; j < this.S[i + 1]; j++) {
            Delta[i].push ([]);
            for (var k = 0; k < this.S[i] + 1; k++) {
                Delta[i][j].push (0);
            }
        }
    }
    //console.log ('Delta = ');
    //console.log (Delta);

    var ex, delta;
    for (var i in this.trainingSet) {
        ex = this.trainingSet[i];
        this.forwardProp (Theta, ex[0]); // calculate activation values
//        console.log ('this.a = ');
//        console.log (this.a);
//        console.log ('ex[1] = ');
//        console.log (ex[1]);
        delta = this.getErrorTerms (Theta, ex[1]);
//        console.log ('delta = ');
//        console.log (delta);
        for (var j = 0; j < this.S.length - 1; j++) {
//            console.log ('j = ');
//            console.log (j);
//            console.log ('Delta[j]');
//            console.log (Delta[j]);
//           console.log ('delta[j] = ');
//            console.log (delta[j].slice (j === this.S.length - 2 ? 0 : 1).
//                map (function (elem) {
//                    return [elem];
//                }));
            Delta[j] = math.add (
                Delta[j],
                math.multiply (
                    delta[j].slice (j === this.S.length - 2 ? 0 : 1).
                        map (function (elem) {
                            return [elem];
                        }),
                    [this.a[j]]
                )
            );
        }
        //console.log ('Delta = ');
        //console.log (Delta);
    }
    //console.log ("\n");
    //console.log ('Delta = ');
    //console.log (Delta);
    for (var i = 0; i < this.S.length - 1; i++) {
        if (this.enableRegularization) {
//           console.log ('Delta[i] = ');
//           console.log (Delta[i]);
//            console.log ('this.lambda, = ');
//            console.log (this.lambda);
//            console.log (Theta[i].map (function (row) { 
//                return [0].concat (row.slice (1));
//            }));
//            console.log (math.multiply (
//                this.lambda,
//                Theta[i].map (function (row) { // remove bias params
//                    return [0].concat (row.slice (1));
//                })
//            ));
//            console.log (math.add (
//                Delta[i],
//                math.multiply (
//                    this.lambda,
//                    Theta[i].map (function (row) { // remove bias params
//                        return [0].concat (row.slice (1));
//                    })
//                )
//            ));
//            console.log (math.multiply (
//                1 / this.trainingSet.length,
//                Delta[i]
//            ));
            Delta[i] = math.add (
                math.multiply (
                    1 / this.trainingSet.length,
                    Delta[i]
                ),
                math.multiply (
                    (this.lambda / this.trainingSet.length),
                    Theta[i].map (function (row) { // remove bias params
                        return [0].concat (row.slice (1));
                    })
                )
            );
        } else {
            Delta[i] = math.multiply (
                1 / this.trainingSet.length,
                Delta[i]
            );
        }
    }

    if (this.enableGradientChecking) {
        this.checkGradient (Theta, Delta);
    }
    //console.log ('Delta = ');
    //console.log (Delta);
    return Delta;
};

/**
 * Calculate gradient approximation
 */
NN.prototype.gradApprox = function (Theta, epsilon) {
    epsilon = typeof epsilon === 'undefined' ? 0.0001 : epsilon; 
    var unrolled = this.unrollParams (Theta),
        gradApprox = [],
        thetaPlus,
        thetaMinus;
   //console.log ('unrollParams = ');
   //console.log (unrolled);

    for (var i in unrolled) {
        thetaPlus = unrolled.slice ()
        thetaMinus = unrolled.slice ()
        thetaPlus[i] = math.add (thetaPlus[i], epsilon);
        thetaMinus[i] = math.subtract (thetaMinus[i], epsilon);
//        console.log (this.reshapeParams (thetaPlus));
//        console.log (this.reshapeParams (thetaMinus));
//        console.log (this.J (this.reshapeParams (thetaPlus)));
//        console.log (this.J (this.reshapeParams (thetaMinus)));
        gradApprox[i] = math.divide (
            math.subtract (
                this.J (this.reshapeParams (thetaPlus)),
                this.J (this.reshapeParams (thetaMinus))
            ),
            2 * epsilon
        );
    }
    //console.log ('gradApprox = ');
    //console.log (gradApprox);
    return this.reshapeParams (gradApprox);
};

/**
 * Calculate relative difference between gradient and gradient 
 * approximation
 */
NN.prototype.getRelativeDifference = function (gradApprox, gradient) {
    var unrolledGradApprox = this.unrollParams (gradApprox);
    var unrolledGradient = this.unrollParams (gradient);
    return math.divide (
        math.norm (
            math.subtract (
                unrolledGradApprox,
                unrolledGradient
            )
        ),
        math.norm (
            math.add (
                unrolledGradApprox,
                unrolledGradient
            )
        )
    );
};

/**
 * Asserts that gradient closely matches approximation
 */
NN.prototype.checkGradient = function (Theta, gradient) {
    var gradApprox = this.gradApprox (Theta);
    var relativeDiff = this.getRelativeDifference (gradApprox, gradient);
//    console.log ('gradApprox = ');
//    console.log (gradApprox);
//    console.log ('gradient = ');
//    console.log (gradient);
    assert (
        math.number (
            this.getRelativeDifference (gradApprox, gradient)) <
        Math.pow (10, -9)
    );
};

/**
 * Initialize parameters to random values in [-epsilon, epsilon)
 * @return Array
 */
NN.prototype.initTheta = function (epsilon) {
    epsilon = typeof epsilon === 'undefined' ? 0.12 : epsilon; 

    // count number of parameters
    var count = 0;
    for (var i = 0; i < this.S.length - 1; i++) {
        count += (this.S[i] + 1) * this.S[i + 1];
    }

    // randomly initialize parameters
    var Theta = [];
    for (var i = 0; i < count; i++) {
        Theta.push (Math.random () * 2 * epsilon - epsilon);
    }
    return this.reshapeParams (Theta);
};

/**
 * Convert matrices of parameters into a parameter vector
 */
NN.prototype.unrollParams = function (Theta, excludeBiasUnits) {
    excludeBiasUnits = typeof excludeBiasUnits === 'undefined' ? 
        false : excludeBiasUnits; 
    var unrolled = [];
    for (var i in Theta) {
        for (var j in Theta[i]) {
            for (var k in Theta[i][j]) {
                if (excludeBiasUnits && k == 0) continue;
                unrolled.push (Theta[i][j][k]); 
            }
        }
    }
    return unrolled;
};

/**
 * Convert vector of parameters into parameter matrices
 * @param Array unrolled parameters
 * @return Array resized parameters
 */
NN.prototype.reshapeParams = function (Theta) {
    var elements,
        elementCount,
        reshaped = [],
        Theta = math.clone (Theta);
    for (var i = 0; i < this.S.length - 1; i++) {
        elementCount = (this.S[i] + 1) * this.S[i + 1];
        elements = Theta.slice (0, elementCount); 
        Theta = Theta.slice (elementCount);
        reshaped.push (
            this.reshape (elements, [this.S[i + 1], this.S[i] + 1]));
    }
    return reshaped;
};

/**
 * Reshapes vector into matrix with specified dimensions
 * @param Array arr
 * @param Array dimensions (e.g. [3, 5])
 * @return Array
 */
NN.prototype.reshape = function (arr, dimensions) {
    var reshaped = []; 
    for (var i = 0; i < dimensions[0]; i++) {
            reshaped.push ([]);
        for (var j = 0; j < dimensions[1]; j++) {
            reshaped[i].push (arr[i * dimensions[1] + j]);
        }
    }
    return reshaped;
};

/**
 * Train parameters on training set
 * @param Number iterations number of iterations of gradient descent
 * @param Number alpha the learning rate
 */
NN.prototype.gradientDescent = function (iterations, alpha) {
    iterations = typeof iterations === 'undefined' ? 1000 : iterations; 
    alpha = typeof alpha === 'undefined' ? 0.01 : alpha; 
    var Theta = this.initTheta (), 
        unrolled,
        h,
        m = this.trainingSet.length;
    for (var i = 0; i < iterations; i++) {
        h = this.getH (Theta);
        unrolled = this.unrollParams (Theta);
        unrolled = math.subtract (
            unrolled, 
            math.multiply (
                alpha,
                this.unrollParams (this.backProp (Theta))
            )
        );
        Theta = this.reshapeParams (unrolled);
        console.log (this.J (Theta));
    }
    
    return Theta;
};


return NN;

}) ();

if (typeof module !== 'undefined') module.exports = NN;

if (typeof GLOBAL !== 'undefined') {

GLOBAL.test = function () {
    
//    // test reshape
//    (function () {
//        var nn = new NN ([]);
//        var arr = [1, 2, 3, 4];
//        var reshaped =  nn.reshape (arr, [2, 2]);
//        assert.deepEqual ([[1, 2], [3, 4]], reshaped);
//    }) ();
//    // test param unroll
//    (function () {
//        var nn = new NN ([2, 2, 1]);
//        var Theta = [[[1, 2, 3], [4, 5, 6]], [[7, 8, 9]]];
//        var unrolled = nn.unrollParams (Theta);
//        assert.deepEqual ([1, 2, 3, 4, 5, 6, 7, 8, 9], unrolled);
//        var unrolled = nn.unrollParams (Theta, true);
//        assert.deepEqual ([2, 3, 5, 6, 8, 9], unrolled);
//    }) ();
//    // test reshape params
//    (function () {
//        var nn = new NN ([2, 2, 1]);
//        var Theta = [[[1, 2, 3], [4, 5, 6]], [[7, 8, 9]]];
//        var unrolled = nn.unrollParams (Theta);
//        assert.deepEqual (Theta, nn.reshapeParams (unrolled));
//    }) ();
//    // test gradApprox
//    (function () {
//        var nn = new NN ([2, 1]);
//        nn.enableRegularization = false;
//        nn.trainingSet = [
//            [[0, 0], 1],
//            [[0, 0], 1],
//            [[0, 0], 1],
//            [[0, 0], 1],
//            [[0, 0], 1],
//            [[0, 0], 1],
//            [[0, 0], 1]
//        ];
//        var Theta = [[[1, 2, 3]]];
//        var h = nn.getH (Theta);
//        var gradient = [math.multiply (
//            1 / nn.trainingSet.length,
//            math.multiply (
//                math.transpose (
//                    math.subtract (
//                        nn.trainingSet.map (NN.getElem (0)).map (h), 
//                        nn.trainingSet.map (NN.getElem (1))
//                    )
//                ),
//                nn.trainingSet.map (NN.getElem (0)).map (
//                    function (elem) {
//                        return [1].concat (elem);
//                    })
//            )
//        )];
//        var gradApprox = nn.gradApprox (Theta);
//        assert (
//            math.number (
//                nn.getRelativeDifference (gradApprox, gradient)) <
//            Math.pow (10, -9)
//        );
//    }) ();
//    // test 2 layer backProp
//    (function () {
//        var nn = new NN ([2, 1]);
//        nn.enableRegularization = false;
//        nn.trainingSet = [
//            [[0, 0], 0],
//            [[1, 0], 0],
//            [[5, 0], 1],
//            [[0, 1], 0],
//            [[0, 0], 1],
//            [[1, 1], 0],
//            [[0, 0], 1]
//        ];
//        var Theta = [[[1, 2, 3]]];
//        var h = nn.getH (Theta);
//        var gradient = [math.multiply (
//            1 / nn.trainingSet.length,
//            math.multiply (
//                math.transpose (
//                    math.subtract (
//                        nn.trainingSet.map (NN.getElem (0)).map (h), 
//                        nn.trainingSet.map (NN.getElem (1))
//                    )
//                ),
//                nn.trainingSet.map (NN.getElem (0)).map (
//                    function (elem) {
//                        return [1].concat (elem);
//                    })
//            )
//        )];
//        var Delta = nn.backProp (Theta);
//        var gradApprox = nn.gradApprox (Theta);
//        assert.deepEqual (gradient, Delta);
//        assert (
//            math.number (
//                nn.getRelativeDifference (gradApprox, Delta)) <
//            Math.pow (10, -9)
//        );
//    }) ();
//    // test back prop with hidden layer
//    (function () {
//        var nn = new NN ([2, 2, 1]); // XNOR network
//        nn.enableRegularization = false;
//        var Theta = [
//            [[-30, 20, 20], [10, -20, -20]],
//            [[-10, 20, 20]]
//        ];
//        var Theta = nn.initTheta ();
//        nn.trainingSet = [
//            [[0, 0], 1],
//            [[0, 1], 0],
//            [[1, 0], 0],
//            [[1, 1], 1],
//        ];
//        var Delta = nn.backProp (Theta);
//        var gradApprox = nn.gradApprox (Theta);
//        assert (
//            math.number (
//                nn.getRelativeDifference (gradApprox, Delta)) <
//            Math.pow (10, -9)
//        );
//    }) ();
//    // test back prop with hidden layer with regularization
//    (function () {
//        var nn = new NN ([2, 2, 1]); // XNOR network
//        nn.enableRegularization = true;
//        var Theta = [
//            [[-30, 20, 20], [10, -20, -20]],
//            [[-10, 20, 20]]
//        ];
//        var Theta = nn.initTheta ();
//        nn.trainingSet = [
//            [[0, 0], 1],
//            [[0, 1], 0],
//            [[1, 0], 0],
//            [[1, 1], 1],
//        ];
//        var Delta = nn.backProp (Theta);
//        var gradApprox = nn.gradApprox (Theta);
//        assert (
//            math.number (
//                nn.getRelativeDifference (gradApprox, Delta)) <
//            Math.pow (10, -9)
//        );
//    }) ();
    // test gradient descent
    (function () {
        // train an XNOR network
        var nn = new NN ([2, 2, 1]); 
        nn.enableGradientChecking = false;
        nn.trainingSet = [
            [[0, 0], [1]],
            [[0, 1], [0]],
            [[1, 0], [0]],
            [[1, 1], [1]],
        ];
        var Theta = nn.gradientDescent (10000, 10);
        var h = nn.getH (Theta);
//        console.log (h ([0, 0]));
//        console.log (h ([0, 1]));
//        console.log (h ([1, 0]));
//        console.log (h ([1, 1]));
        assert (h ([0, 0])[0] >= 0.5);
        assert (h ([0, 1])[0] < 0.5);
        assert (h ([1, 0])[0] < 0.5);
        assert (h ([1, 1])[0] >= 0.5);
        return;

        // train an XOR network
        nn.trainingSet = [
            [[0, 0], 0],
            [[0, 1], 1],
            [[1, 0], 1],
            [[1, 1], 0],
        ];
        var Theta = nn.gradientDescent (10000, 10);
        var h = nn.getH (Theta);
//        console.log (h ([0, 0]));
//        console.log (h ([0, 1]));
//        console.log (h ([1, 0]));
//        console.log (h ([1, 1]));
        assert (h ([0, 0])[0] < 0.5);
        assert (h ([0, 1])[0] >= 0.5);
        assert (h ([1, 0])[0] >= 0.5);
        assert (h ([1, 1])[0] < 0.5);

        // train an AND network
        nn.trainingSet = [
            [[0, 0], 0],
            [[0, 1], 0],
            [[1, 0], 0],
            [[1, 1], 1],
        ];
        var Theta = nn.gradientDescent (10000, 10);
        var h = nn.getH (Theta);
//        console.log (h ([0, 0]));
//        console.log (h ([0, 1]));
//        console.log (h ([1, 0]));
//        console.log (h ([1, 1]));
        assert (h ([0, 0])[0] < 0.5);
        assert (h ([0, 1])[0] < 0.5);
        assert (h ([1, 0])[0] < 0.5);
        assert (h ([1, 1])[0] >= 0.5);
    }) ();
    return;

//    // test cost function
//    (function () {
//        var nn = new NN ([2, 1]);
//        nn.trainingSet = [
//            [[0, 0], 0],
//            [[0, 1], 0],
//            [[1, 0], 0],
//            [[1, 1], 1],
//        ];
//        var Theta = [[[-30, 20, 20]]]; // AND params
//        console.log (nn.J (Theta));
//        Theta = [[[10, -20, -20]]]; // NAND params
//        console.log (nn.J (Theta));
//        Theta = [[[-10, 20, 20]]]; // OR params
//        console.log (nn.J (Theta));
//    }) ();
//    return;

//    // basic functionality test
//    (function () {
//        // test param initialization
//        var nn = new NN ([2, 2, 1]);
//        var Theta = nn.initTheta ();
//        console.log ('Theta = ');
//        console.log (Theta);
//        // test activation function
//        console.log (nn.g ([1, 1, 1], Theta[0][0]));
//    } ());
//    return;

//    // AND network
//    (function () {
//        var nn = new NN ([2, 1]);
//        var Theta = [[-30, 20, 20]];
//        console.log (nn.forwardProp (Theta, [0, 0]));
//        console.log (nn.forwardProp (Theta, [0, 1]));
//        console.log (nn.forwardProp (Theta, [1, 0]));
//        console.log (nn.forwardProp (Theta, [1, 1]));
//    }) ();
//    return;
//
//    // NAND network
//    (function () {
//        var nn = new NN ([2, 1]);
//        nn.Theta = [[10, -20, -20]];
//        console.log (nn.forwardProp ([0, 0]));
//        console.log (nn.forwardProp ([0, 1]));
//        console.log (nn.forwardProp ([1, 0]));
//        console.log (nn.forwardProp ([1, 1]));
//    }) ();
//
//    // OR network
//    (function () {
//        var nn = new NN ([2, 1]);
//        nn.Theta = [[-10, 20, 20]];
//        console.log (nn.forwardProp ([0, 0]));
//        console.log (nn.forwardProp ([0, 1]));
//        console.log (nn.forwardProp ([1, 0]));
//        console.log (nn.forwardProp ([1, 1]));
//    }) ();
//
//    // XNOR network
//    (function () {
//        // test param initialization
//        var nn = new NN ([2, 2, 1]);
//        nn.Theta = [
//            [[-30, 20, 20], [10, -20, -20]],
//            [[-10, 20, 20]]
//        ];
//        console.log (nn.forwardProp ([0, 0]));
//        console.log (nn.forwardProp ([0, 1]));
//        console.log (nn.forwardProp ([1, 0]));
//        console.log (nn.forwardProp ([1, 1]));
//    }) ();
};

}
