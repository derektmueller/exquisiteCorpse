
var ExquisiteCorpseBase = (function () {

function ExquisiteCorpseBase () {
    
};

/**
 * Categorize pixels (white or not white)
 */
ExquisiteCorpseBase.prototype.categorizePixels = function (data) {
    var values = [];
    for (var i = 0; i < data.length; i += 4) {
        values.push (
            data[i] + data[i + 1] + data[i + 2] == (255 * 3) ? 0 : 1
        ); 
    }
    return values;
};

//ExquisiteCorpse.prototype.vectorizePixelData = function (pixelData) {
//    return pixelData;
//};

/**
 * Capture information only about the contours of the drawing. For each black pixel, add that 
 * pixel's index to the input vector. Fill remaining parameters with zeroes.
 */
ExquisiteCorpseBase.prototype.vectorizePixelData = function (pixelData) {
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

return ExquisiteCorpseBase;

}) ();


if (typeof module !== 'undefined') module.exports = ExquisiteCorpseBase;


