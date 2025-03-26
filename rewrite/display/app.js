const canvas = document.getElementById('sun-canvas');
const ctx = canvas.getContext('2d');
const dateText = document.getElementById('date-text');

const defaultWavelength = 'aia171';
const pathToRetriever = '../image-retriever/';

const imageToSkip = 5; // How many images giving an input will skip

const imageUpdateDelay = 600000; // 600000 ms = 10 minutes (Time between grabbing new image paths)
const resetDisplayDelay = 180000; // 180000 ms = 3 minutes (Time between reseting the display to most recent image)

let imgFilePaths = {};
let imageIndex = 0;

const img = new Image();

let currentWavelength = defaultWavelength;

let resetDisplayIntervalId;

main();

async function main() {
    await getFilePaths();

    resetDisplay();

    updateCanvasImage(imgFilePaths[currentWavelength][imageIndex]);
    formatDate(imgFilePaths[currentWavelength][imageIndex]);

    document.addEventListener('keydown', (event) => {
        resetDisplay(); // Resets reset countdown
        if (event.key === '1') changeWavelength('aia171');
        if (event.key === '2') changeWavelength('aia193');
        if (event.key === '3') changeWavelength('aia211');
        if (event.key === '4') changeWavelength('aia304');
        if (event.key === 'ArrowLeft') moveBackImage(1);
        if (event.key === 'ArrowRight') moveForwardImage(1);
        if (event.key === 'a') moveBackImage(2);
        if (event.key === 'd') moveForwardImage(2);
    });

    document.addEventListener('mousemove', (event => {
        let norm = (event.clientX / window.innerWidth);
            norm = 1 - norm;
            norm *= imgFilePaths[currentWavelength].length-1;
        imageIndex = Math.floor(norm);
        changeImage();
        console.log(imageIndex, imgFilePaths[currentWavelength].length, norm);
        console.log(imgFilePaths[currentWavelength][imageIndex])
    }))
}

async function updateCanvasImage(imagePath) {
    img.src = pathToRetriever + imagePath;

    img.onload = () => {
        drawCanvasImage();
    };
}

async function drawCanvasImage() {
    let imgBitmap = await createImageBitmap(img);

    const maxCanvasWidth = window.innerWidth * 1;
    const maxCanvasHeight = window.innerHeight * 1;

    let scale = Math.min(maxCanvasWidth / img.width, maxCanvasHeight / img.height);

    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);
}

function changeImage() {
    updateCanvasImage(imgFilePaths[currentWavelength][imageIndex]);
    formatDate(imgFilePaths[currentWavelength][imageIndex]);
}

function changeWavelength(wavelength) {
    if (imgFilePaths[wavelength][imageIndex]) {
        currentWavelength = wavelength;
        changeImage();
    } else {
        // Go to the last available image if current image doesn't exist
        currentWavelength = wavelength;
        updateCanvasImage(imgFilePaths[currentWavelength][imgFilePaths[currentWavelength].length - 1]);
        formatDate(imgFilePaths[currentWavelength][imgFilePaths[currentWavelength].length - 1]);
    }
}

function moveBackImage(multiplier) {
    if (imageIndex + (imageToSkip * multiplier) <= imgFilePaths[currentWavelength].length - 1) {
        imageIndex += (imageToSkip * multiplier);
    } else {
        imageIndex = imgFilePaths[currentWavelength].length - 1;
    }
    changeImage();
}

function moveForwardImage(multiplier) {
    if (imageIndex - (imageToSkip * multiplier) >= 0) {
        imageIndex -= (imageToSkip * multiplier);
    } else {
        imageIndex = 0;
    }
    changeImage();
}

setInterval(getFilePaths, imageUpdateDelay);

function resetDisplay() {
    if (resetDisplayIntervalId) {
        clearInterval(resetDisplayIntervalId);
    }

    resetDisplayIntervalId = setInterval(() => {
        imageIndex = 0;
        changeImage();
        console.log('Display Current image reset');
    }, resetDisplayDelay);
}


async function getFilePaths() {
    const url = "../image-retriever/wavelengths.json";
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        imgFilePaths = await response.json();
        console.log('Updated Image Paths');
    } catch (error) {
        console.error(error.message);
    }
}

function formatDate(inputString) {

    if (inputString == undefined) console.log("WHOOPS");

    const dateString = inputString.split('-')[1] + '-' + inputString.split('-')[2] + '-' + inputString.split('-')[3].split('T')[0];
    const date = new Date(dateString + 'T00:00:00Z');

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const formattedDate = `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;

    dateText.innerHTML = formattedDate;
}