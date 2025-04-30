const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const sharp = require('sharp');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');


const fetchTimeoutTimer = 30000; // ms before fetch timesout, servers seem to be too iffy for the defaut 10 seconds.
const maxImages = 500000; // 500000 should be around 250gb and 10 years of images. Number of images kept before oldest is deleted, set to 0 to keep all images.
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

ensureDirs().then(async () => {
    saveWavelengths();

    await checkDate();

    downloadImages();

    cron.schedule(`*/${imageInterval} * * * *`, () => {
        console.log('Starting chron.');
        downloadImages();
    });
});

// Checks last image to see if it is out of date
async function checkDate() {
    const latestImage = wavelengths.aia171[0];

    if (!latestImage) return;

    const latestDate = new Date(latestImage.substring(23, 33));
    const currentDate = new Date();

    if (currentDate.getUTCDate() === latestDate.getUTCDate()) return;

    latestDate.getFullYear()

    const baseURL = `https://sdo.gsfc.nasa.gov/assets/img/browse/`;
    const year = latestImage.substring(23, 33).substring(0, 4);
    const month = latestImage.substring(23, 33).substring(5, 7);
    const day = latestImage.substring(23, 33).substring(8, 10);

    console.log(latestImage)

    startScraping(baseURL, year, currentDate.getFullYear(), month, day);
}

// Await might not be nessecary but I dont want to pull 4 images from the servers at once
async function downloadImages() {
    await fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0171.jpg', 'aia171')
    await fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0193.jpg', 'aia193');
    await fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0211.jpg', 'aia211');
    await fetchImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0304.jpg', 'aia304');
    saveWavelengths();
}

// Sometimes connection will timeout, retrying seems to help some times
async function fetchImage(url, wavelength, archive = false) {
    const retries = 5;
    const delay = 5000;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(fetchTimeoutTimer) });

            if (!response.ok) {
                throw new Error(`Failed to fetch image, status: ${response.status}`);
            }

            const formattedDate = getConvertedDate(response.headers.get('last-modified'));
            const convertedSize = getConvertedSize(response.headers.get('content-length'));

            let validSize = false;

            // Don't download images that probably have large artifacts, values are in KB
            switch (wavelength) {
                case 'aia171':
                    (convertedSize > 670 && convertedSize < 2000) ? validSize = true : console.log(`${wavelength}: ${url} has an invalid file size of ${convertedSize}, skipping download.`);
                    break;
                case 'aia193':
                    (convertedSize > 435 && convertedSize < 2000) ? validSize = true : console.log(`${wavelength}: ${url} has an invalid file size of ${convertedSize}, skipping download.`);
                    break;
                case 'aia211':
                    (convertedSize > 480 && convertedSize < 2000) ? validSize = true : console.log(`${wavelength}: ${url} has an invalid file size of ${convertedSize}, skipping download.`);
                    break;
                case 'aia304':
                    (convertedSize > 820 && convertedSize < 2000) ? validSize = true : console.log(`${wavelength}: ${url} has an invalid file size of ${convertedSize}, skipping download.`);
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

                    if (!archive) {
                        console.log(`Successfully downloaded ${wavelength}-${formattedDate}.jpg`);
                    }
                }
                else {
                    const filePath = `./download/${wavelength}/${wavelength}-${formattedDate}.jpg`;
                    fs.writeFileSync(filePath, buffer);

                    if (!archive) {
                        console.log(`Successfully downloaded ${wavelength}-${formattedDate}.jpg`);
                    }
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

function saveWavelengths() {
    for (let wavelength in wavelengths) {
        wavelengths[wavelength].length = 0; // Clear arrays so they dont add duplicate file paths

        // Sort files by file name to make sure most recent is on top
        fs.readdirSync(`./download/${wavelength}/`)
            .map(fileName => {
                const filePath = path.join(`./download/${wavelength}/`, fileName);
                return { fileName };
            })
            .sort()
            .reverse()
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

async function startScraping(baseURL, startYear, endYear, startMonth, startDay) {
    for (let year = Number(startYear); year <= Number(endYear); year++) {
        for (let month = (year === Number(startYear) ? Number(startMonth) : 1); month <= 12; month++) {
            for (let day = (year === Number(startYear) && month === Number(startMonth) ? Number(startDay) : 1); day <= 31; day++) {
                const monthStr = month.toString().padStart(2, '0');
                const dayStr = day.toString().padStart(2, '0');
                const folderUrl = `${baseURL}${year}/${monthStr}/${dayStr}/`;

                try {
                    await axios.get(folderUrl);
                    console.log(`Scraping: ${folderUrl}`);
                    await scrapeFolder(folderUrl);
                } catch {
                    console.log(`Skipping ${folderUrl} (does not exist)`);
                }
            }
        }
    }
}

async function scrapeFolder(folderUrl) {
    const validPatterns = ['0171', '0193', '0211', '0304'];

    try {
        const { data } = await axios.get(folderUrl);
        const $ = cheerio.load(data);
        const links = $('a');

        for (let i = 0; i < links.length; i++) {
            const fileName = $(links[i]).attr('href');
            if (!fileName || !fileName.endsWith('.jpg') || !fileName.includes('_2048_') || fileName.includes('pfss')) {
                continue;
            }

            for (const pattern of validPatterns) {
                if (fileName.includes(`_2048_${pattern}`)) {
                    const fileUrl = new URL(fileName, folderUrl).href;

                    for (const wavelength in wavelengths) {
                        if (fileUrl.includes('_0' + wavelength.substring(3, 6))) {
                            fetchImage(fileUrl, wavelength, true);
                            await new Promise(res => setTimeout(res, 20));
                        }
                    }

                    break;
                }
            }
        }

    } catch (error) {
        console.error(`Failed to retrieve ${folderUrl}:`, error.message);
    }
}

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