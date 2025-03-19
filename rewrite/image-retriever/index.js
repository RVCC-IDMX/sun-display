const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { createCanvas, loadImage } = require('canvas');

const dateRemoveMask = './masks/date-remove-mask.png'; // Used for every image other than wavelength 171
const aia171Mask = './masks/aia171-mask.png'; // Used for just wavelength 171 images

createDir('download');
createDir('download/aia171');
createDir('download/aia193');
createDir('download/aia211');
createDir('download/aia304');

/*
cron.schedule('1 * * * * *', () => {
    createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0171.jpg', aia171Mask, 'aia171');
    createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0193.jpg', dateRemoveMask, 'aia193');
    createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0211.jpg', dateRemoveMask, 'aia211');
    createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0304.jpg', dateRemoveMask, 'aia304');
});
*/

createImages();

function createDir(name) {
    if (!fs.existsSync(path.join(__dirname, name))) {
        fs.mkdir(path.join(__dirname, name), (err) => {
            if (err) {
                return console.error(err);
            }
            console.log(`Created images directory at: ${path.join(__dirname, name)}`);
        });
    }
}

function createImages() {
    createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0171.jpg', aia171Mask, 'aia171');
    createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0193.jpg', dateRemoveMask, 'aia193');
    createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0211.jpg', dateRemoveMask, 'aia211');
    createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0304.jpg', dateRemoveMask, 'aia304');
}

const imageSize = 2048; //Change if downloading higher or lower res image

const canvas = createCanvas(imageSize, imageSize);
const context = canvas.getContext('2d');

context.fillStyle = '#000';
context.fillRect(0, 0, imageSize, imageSize);

async function createImage(imageUrl, maskUrl, wavelength) {
    let sun = await loadImage(imageUrl);
    let mask = await loadImage(maskUrl);

    context.drawImage(sun, 0, 0, imageSize, imageSize);
    context.drawImage(mask, 0, 0, imageSize, imageSize);

    //Add date
    let date = new Date();
    const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let dateTimeFileName = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}T${date.getUTCHours()}.${date.getUTCMinutes()}.${date.getUTCSeconds()}`;

    context.fillStyle = '#fff'
    context.font = 'bold 60pt Arial'
    context.textAlign = 'center';
    context.fillText(`${month[date.getMonth()]} ${date.getUTCDate()}, ${date.getFullYear()}`, 1024, 2033)

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`./download/${wavelength}/${wavelength}-${dateTimeFileName}.jpg`, buffer);
    console.log(`Created new image for ${wavelength} at ${dateTimeFileName}`);
}

/*
async function fetchImage(url, path) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer, 'binary');
    fs.writeFileSync(path + '/latest.jpg', buffer);
}
*/