const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const sharp = require('sharp');

const fetchTimeoutTimer = 30000; // ms before fetch timesout, servers seem to be too iffy for the defaut 10 seconds.
const maxImages = 0; // Number of images kept before oldest is deleted, set to 0 to keep all images.
const imageInterval = 15 // Minutes between creating new images
const compressImages = true;

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
    };
};

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
        };
    });
};

ensureDirs().then(() => {
    console.log('Starting chron.');

    createImages();

    cron.schedule(`*/${imageInterval} * * * *`, () => {
        createImages();
    });
});

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
    for (let wavelength in wavelengths) {
        wavelengths[wavelength].length = 0; // Clear arrays so they dont add duplicate file paths

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
    };

    for (let wavelength in wavelengths) {
        if (maxImages !== 0) {
            while (wavelengths[wavelength].length > maxImages) {
                console.log(`Image count exceeded max images, deleting ${wavelengths[wavelength][wavelengths[wavelength].length - 1]}`);
                fs.unlinkSync(path.join(__dirname, wavelengths[wavelength][wavelengths[wavelength].length - 1]));
                let removedArray = wavelengths[wavelength].pop();
                console.log(`Removed ${removedArray} from array`);
            }
        }
    };

    // Write to JSON so it can be refrenced in display
    const jsonFilePath = './wavelengths.json';
    fs.writeFileSync(jsonFilePath, JSON.stringify(wavelengths, null, 2));
    console.log('Updated wavelengths.json');
};

// Sometimes connection will timeout, retrying seems to help some times
async function fetchImage(url, wavelength, retries = 5, delay = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout( fetchTimeoutTimer ) });

            if (!response.ok) {
                throw new Error(`Failed to fetch image, status: ${response.status}`);
            }

            const formattedDate = getConvertedDate(response.headers.get('last-modified'));
            const convertedSize = getConvertedSize(response.headers.get('content-length'));

            let validSize = false;

            // Don't download images that probably have large artifacts, values are in KB
            switch (wavelength) {
                case 'aia171':
                    (convertedSize > 680 && convertedSize < 2000) ? validSize = true : console.log(`${wavelength}-${formattedDate} does not have a valid size, skipping download.`);
                    break;
                case 'aia193':
                    (convertedSize > 435 && convertedSize < 2000) ? validSize = true : console.log(`${wavelength}-${formattedDate} does not have a valid size, skipping download.`);
                    break;
                case 'aia211':
                    (convertedSize > 480 && convertedSize < 2000) ? validSize = true : console.log(`${wavelength}-${formattedDate} does not have a valid size, skipping download.`);
                    break;
                case 'aia304':
                    (convertedSize > 820 && convertedSize < 2000) ? validSize = true : console.log(`${wavelength}-${formattedDate} does not have a valid size, skipping download.`);
                    break;
                default:
                    console.error(`${wavelength} is not a valid wavelength.`)
            };

            if (validSize) {
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer, 'binary');

                if (compressImages) {
                    const compressedBuffer = await sharp(buffer)
                        .resize({ width: 1080, height: 1080 })
                        .jpeg({ quality: 80 })
                        .toBuffer();

                    const filePath = `./download/${wavelength}/${wavelength}-${formattedDate}.jpg`;
                    fs.writeFileSync(filePath, compressedBuffer);

                    console.log(`Successfully downloaded ${wavelength}-${formattedDate}.jpg`);
                }
                else {
                    const filePath = `./download/${wavelength}/${wavelength}-${formattedDate}.jpg`;
                    fs.writeFileSync(filePath, buffer);

                    console.log(`Successfully downloaded ${wavelength}-${formattedDate}.jpg`);
                }

            };

            return;
        } catch (err) {
            console.error(`Attempt ${i + 1} failed for ${url}:`, err);
            if (i < retries - 1) {
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(res => setTimeout(res, delay));
            };
        };
    };

    console.error(`Failed to fetch image after ${retries} attempts.`);
};

function getConvertedSize(sizeString) {
    return (sizeString / 1024).toFixed(2);
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
};