const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { createCanvas, loadImage } = require('canvas');

const maxImages = 300 // Temp number

const imageInterval = 15 // Minutes between creating new images

const dateRemoveMask = './masks/date-remove-mask.png'; // Used for every image other than wavelength 171
const aia171Mask = './masks/aia171-mask.png'; // Used for just wavelength 171 images

const imageSize = 2048; //Change if downloading higher or lower res image

const wavelengths = {
    aia171: [],
    aia193: [],
    aia211: [],
    aia304: []
};

const canvas = createCanvas(imageSize, imageSize);
const context = canvas.getContext('2d');

context.fillStyle = '#000';
context.fillRect(0, 0, imageSize, imageSize);

async function ensureDirs() {
    try {
        // Make sure main dir exists before making sub dir
        await createDir('download');

        await Promise.all([
            createDir('download/aia171'),
            createDir('download/aia193'),
            createDir('download/aia211'),
            createDir('download/aia304')
        ]);

        console.log('All directories created.');
    } catch (err) {
        console.error("Error while creating directories:", err);
    }
}

// Making this async avoids the highly unlikley error of chron running before directory exists
async function createDir(name) {
    const dirPath = path.join(__dirname, name);
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(dirPath)) {
            fs.mkdir(dirPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Created images directory at: ${dirPath}`);
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

ensureDirs().then(() => {
    console.log('Starting chron.');

    createImages();

    cron.schedule(`*/${imageInterval} * * * *`, () => {
        createImages();
    });
});

// Sometimes connection will just close, retrying seems to help some times
async function fetchWithRetry(url, retries = 3, delay = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch image, status: ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return await loadImage(buffer);
        } catch (err) {
            console.error(`Attempt ${i + 1} failed for ${url}:`, err);
            if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
        }
    }
    return null;
}

// Await might not be nessecary but I dont want to pull 4 images from the servers at once
async function createImages() {
    await createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0171.jpg', aia171Mask, 'aia171');
    await createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0193.jpg', dateRemoveMask, 'aia193');
    await createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0211.jpg', dateRemoveMask, 'aia211');
    await createImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0304.jpg', dateRemoveMask, 'aia304');
    saveWavelengths();
}

async function createImage(imageUrl, maskUrl, wavelength) {
    let sun = await fetchWithRetry(imageUrl);
    let mask = await loadImage(maskUrl);

    if (sun && mask) {
        context.drawImage(sun, 0, 0, imageSize, imageSize);
        context.drawImage(mask, 0, 0, imageSize, imageSize);

        //Add date
        let date = new Date();
        const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        let dateTimeFileName = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}T${date.getUTCHours()}.${date.getUTCMinutes()}.${date.getUTCSeconds()}`;

        context.fillStyle = '#fff';
        context.font = 'bold 60pt Arial'
        context.textAlign = 'center';
        context.fillText(`${month[date.getMonth()]} ${date.getUTCDate()}, ${date.getFullYear()}`, 1024, 2033);

        const buffer = canvas.toBuffer('image/png');
        const filePath = `./download/${wavelength}/${wavelength}-${dateTimeFileName}.jpg`;
        fs.writeFileSync(filePath, buffer);
        console.log(`Created new image for ${wavelength} at ${dateTimeFileName}`);

        wavelengths[wavelength].unshift(filePath);
    }
    else {
        return;
    }
};

// This sucks, I need to rewrite it so it is accurate as to what is actually in the downloads folder...
function saveWavelengths() {
    for (let wavelength in wavelengths) {
        while (wavelengths[wavelength].length > maxImages) {
            wavelengths[wavelength].pop();
        }
    }

    const jsonFilePath = './wavelengths.json';
    fs.writeFileSync(jsonFilePath, JSON.stringify(wavelengths, null, 2));
    console.log('Updated wavelengths.json');
}

/*
async function fetchImage(url, path) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer, 'binary');
    fs.writeFileSync(path + '/latest.jpg', buffer);
}
*/