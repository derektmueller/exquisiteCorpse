
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

return ExquisiteCorpseBase;

}) ();


if (typeof module !== 'undefined') module.exports = ExquisiteCorpseBase;


