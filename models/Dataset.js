var Dataset = (function () {

/**
 * Model for dataset and dataset meta data
 */
function Dataset (params) {
    this.dataset = params.dataset;
    this.mu = params.mu; // mean of training example parameters
    this.sigma = params.sigma; // std of training example parameters
    this.reducedU = params.reducedU; 
};

Dataset.prototype.toJSON = function () {
    return JSON.stringify ({
        dataset: this.dataset,
        mu: this.mu,
        sigma: this.sigma,
        reducedU: this.reducedU,
    });
};

return Dataset;

}) ();

module.exports = Dataset;

