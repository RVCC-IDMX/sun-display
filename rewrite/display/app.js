const canvas = document.getElementById('sun-canvas');
const ctx = canvas.getContext('2d');
const dateText = document.getElementById('date-text');

const defaultWavelength = 'aia171';
const pathToRetriever = '../image-retriever/';

const imageToSkip = 5; // How many images giving an input will skip

let imgFilePaths = {};
let imageIndex = 0;

let currentWavelength = defaultWavelength;

main();

async function main() {
    await getFilePaths();

    updateCanvasImage(imgFilePaths[currentWavelength][imageIndex]);
    formatDate(imgFilePaths[currentWavelength][imageIndex]);

    document.addEventListener('keydown', (event) => {
        if (event.key === '1') changeWavelength('aia171');
        if (event.key === '2') changeWavelength('aia193');
        if (event.key === '3') changeWavelength('aia211');
        if (event.key === '4') changeWavelength('aia304');
        if (event.key === 'ArrowLeft') moveBackImage(1);
        if (event.key === 'ArrowRight') moveForwardImage(1);
        if (event.key === 'a') moveBackImage(2);
        if (event.key === 'd') moveForwardImage(2);
    });
}

function updateCanvasImage(imagePath) {
    const img = new Image();
    img.src = pathToRetriever + imagePath;

    img.onload = () => {
        const maxCanvasWidth = window.innerWidth * 1;
        const maxCanvasHeight = window.innerHeight * 1;

        let scale = Math.min(maxCanvasWidth / img.width, maxCanvasHeight / img.height);

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
}

function changeWavelength(wavelength) {
    if (imgFilePaths[wavelength][imageIndex]) {
        currentWavelength = wavelength;
        updateCanvasImage(imgFilePaths[currentWavelength][imageIndex]);
        formatDate(imgFilePaths[currentWavelength][imageIndex]);
    } else {
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
    updateCanvasImage(imgFilePaths[currentWavelength][imageIndex]);
    formatDate(imgFilePaths[currentWavelength][imageIndex]);
}

function moveForwardImage(multiplier) {
    if (imageIndex - (imageToSkip * multiplier) >= 0) {
        imageIndex -= (imageToSkip * multiplier);
    } else {
        imageIndex = 0;
    }
    updateCanvasImage(imgFilePaths[currentWavelength][imageIndex]);
    formatDate(imgFilePaths[currentWavelength][imageIndex]);
}

async function getFilePaths() {
    const url = "../image-retriever/wavelengths.json";
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        imgFilePaths = await response.json();
    } catch (error) {
        console.error(error.message);
    }
}

function formatDate(inputString) {
    const dateString = inputString.split('-')[1] + '-' + inputString.split('-')[2] + '-' + inputString.split('-')[3].split('T')[0];
    const date = new Date(dateString + 'T00:00:00Z');

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const formattedDate = `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
    
    dateText.innerHTML = formattedDate;
}