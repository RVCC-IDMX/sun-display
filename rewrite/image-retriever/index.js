const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

createDir('download');
createDir('download/aia171');
createDir('download/aia193');
createDir('download/aia211');
createDir('download/aia304');

cron.schedule('* 30 * * * *', () => {
    
});

fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0171.jpg', 'download/aia171')
fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0193.jpg', 'download/aia193')
fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0211.jpg', 'download/aia211')
fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0304.jpg', 'download/aia304')

const offscreen = new OffscreenCanvas(256, 256);

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

async function fetchImage(url, path) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer, 'binary');
    fs.writeFileSync(path + "/latest.jpg", buffer);
}