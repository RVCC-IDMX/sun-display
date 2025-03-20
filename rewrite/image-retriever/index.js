const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { Console } = require('console');

const maxImages = 300 // Temp number

const imageInterval = 15 // Minutes between creating new images

const wavelengths = {
    aia171: [],
    aia193: [],
    aia211: [],
    aia304: []
};

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

/*
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
*/

// Await might not be nessecary but I dont want to pull 4 images from the servers at once
async function createImages() {
    await fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0171.jpg', 'aia171')
    await fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0193.jpg', 'aia193');
    await fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0211.jpg', 'aia211');
    await fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0304.jpg', 'aia304');
    saveWavelengths();
}


// Probably too slow with thousands of images, who knows
function saveWavelengths() {
    // Clear arrays so they dont add duplicate file paths
    for (let wavelength in wavelengths) {
        wavelengths[wavelength].length = 0;
    }

    for (let wavelength in wavelengths) {
        // Sort files by modification time to make sure most recent is on top
        fs.readdirSync(`./download/${wavelength}/`)
            .map(fileName => {
                const filePath = path.join(`./download/${wavelength}/`, fileName);
                const stats = fs.statSync(filePath);
                return { fileName, mtime: stats.mtime };
            })
            .sort((a, b) => b.mtime - a.mtime)
            .map(file => {
                wavelengths[wavelength].push(path.posix.join(`./download/${wavelength}/`, file.fileName));
            });
    }

    // Write to JSON so it can be refrenced in display
    const jsonFilePath = './wavelengths.json';
    fs.writeFileSync(jsonFilePath, JSON.stringify(wavelengths, null, 2));
    console.log('Updated wavelengths.json');
};

async function fetchImage(url, wavelength) {
    const response = await fetch(url);
    const formattedDate = getConvertedDate(response.headers.get('last-modified'));

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer, 'binary');
    fs.writeFileSync(`./download/${wavelength}/` + `${wavelength}-${formattedDate}.jpg`, buffer);
    console.log(`Successfully downloaded ${wavelength}-${formattedDate}.jpg`)
}

function getConvertedDate(dateString) {

    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}.${minutes}.${seconds}`;
}