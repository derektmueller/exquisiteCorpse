var Dataset = (function () {

function Dataset (params) {
    this.dataset = params.dataset;
    this.mu = params.mu;
    this.sigma = params.sigma;
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

