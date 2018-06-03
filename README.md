
# Automatic Exquisite Corpse

An AI drawing completion app that uses a neural network trained on line drawings of facial expressions. As the user draws the top half of a face, the bottom half is automatically completed using the pretrained neural network.

The training set is built from pixel data extracted from the line drawing images. Each image is converted to black and white and split into a feature vector (the top half of the image) and a label (the bottom half of the image). The feature vector is compressed by selecting only location information from the first ~500 black pixels, which isolates just the contours of the line drawing. Further compression is achieved through principal component analysis.

![Alt Text](https://github.com/parenparen/exquisiteCorpse/raw/master/demo.gif)

## Demo

www.derekmueller.info/exquisiteCorpse

## Installation

```shell
npm install
```

## Usage

Training neural network parameters:
```shell
./exquisiteCorpse.js --filename=theta.json
```

Prepocessing image data:
```shell
./exquisiteCorpse.js --buildOnly --filename=dataset.json
```

Training neural network parameters with preprocessed image data:
```shell
./exquisiteCorpse.js --infile=dataset.json --filename=theta.json
```


## Resources

* Line drawings of facial expressions: http://commons.wikimedia.org/wiki/Category:Line_drawings_of_facial_expressions


