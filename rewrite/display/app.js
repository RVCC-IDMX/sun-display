const canvas = document.getElementById('sun-canvas');
const ctx = canvas.getContext('2d');
const dateText = document.getElementById('date-text');

const defaultWavelength = 'aia171';
const pathToRetriever = '../image-retriever/';

const imageToSkip = 5; // Number of images to skip when using keyboard, does nothing with mousemove
const imageUpdateDelay = 600000; // Delay between updating json, 600000 is 10 minutes in ms 
const resetDisplayDelay = 180000; // Delay before setting current image to latest, 180000 is 3 minutes in ms 

let imgFilePaths = {};
let imageIndex = 0;
let currentWavelength = defaultWavelength;
let resetDisplayIntervalId = null;

async function main() {
    await getFilePaths();
    resetDisplay();
    changeImage();

    // Change throttle time to make it more smooth but if you go too low it will start glitching
    document.addEventListener('keydown', throttle(handleKeyDown, 100)); // If we dont throttle this as well you can break the program if you spam switch the wavelength
    document.addEventListener('mousemove', handleMouseMove);//throttle(handleMouseMove, 25));
}

function handleKeyDown(event) {
    resetDisplay(); // Reset idle timeout

    switch (event.key) {
        case '1':
            changeWavelength('aia171');
            break;
        case '2':
            changeWavelength('aia193');
            break;
        case '3':
            changeWavelength('aia211');
            break;
        case '4':
            changeWavelength('aia304');
            break;
        case 'ArrowLeft':
            moveBackImage(1);
            break;
        case 'ArrowRight':
            moveForwardImage(1);
            break;
        case 'a':
            moveBackImage(2);
            break;
        case 'd':
            moveForwardImage(2);
            break;
    }
}

function handleMouseMove(event) {
    resetDisplay(); // Reset idle timeout

    let norm = (event.clientX / window.innerWidth);
    norm = 1 - norm;
    norm *= imgFilePaths[currentWavelength].length - 1;
    imageIndex = Math.floor(norm);
    changeImage();
}

// I have found that this is needed, the awaits stack up and things jump around a lot without throttling the mousemove event
function throttle(func, limit) {
    let inThrottle;
    return function () {
        if (!inThrottle) {
            func.apply(this, arguments);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

var drawThrottle = false;
const imgBitmap = document.createElement("img");

async function updateCanvasImage(imagePath) {
    if (drawThrottle) return;
    try {
        drawThrottle = true;
        
        //const response = await fetch(pathToRetriever + imagePath);
        //if (!response.ok) {
        //    throw new Error(`Error fetching image: ${response.status}`);
        //}

        // Using blobs with imageBitmap seems to speed things up
        //const blob = await response.blob();
        //const imgBitmap = await createImageBitmap(blob);

        imgBitmap.onload = () => {

            const maxCanvasWidth = window.innerWidth;
            const maxCanvasHeight = window.innerHeight;
            const scale = Math.min(maxCanvasWidth / imgBitmap.width, maxCanvasHeight / imgBitmap.height);

            canvas.width = imgBitmap.width * scale;
            canvas.height = imgBitmap.height * scale;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);
            
            drawThrottle = false;

        }
        imgBitmap.src = pathToRetriever + imagePath;

    } catch (err) {
        console.error(err);
    }
}

function changeImage() {
    const imagePath = imgFilePaths[currentWavelength][imageIndex];
    if (imagePath) {
        updateCanvasImage(imagePath);
        formatDate(imagePath);
    }
}

function changeWavelength(wavelength) {
    if (imgFilePaths[wavelength] && imgFilePaths[wavelength][imageIndex]) {
        currentWavelength = wavelength;
    } else if (imgFilePaths[wavelength]) {
        currentWavelength = wavelength;
        imageIndex = imgFilePaths[wavelength].length - 1;
    }
    changeImage();
}

function moveBackImage(multiplier) {
    imageIndex = Math.min(imageIndex + imageToSkip * multiplier, imgFilePaths[currentWavelength].length - 1);
    changeImage();
}

function moveForwardImage(multiplier) {
    imageIndex = Math.max(imageIndex - imageToSkip * multiplier, 0);
    changeImage();
}

function resetDisplay() {
    if (resetDisplayIntervalId) {
        clearInterval(resetDisplayIntervalId);
    }
    resetDisplayIntervalId = setInterval(() => {
        imageIndex = 0;
        changeImage();
        console.log('Display reset to current image');
    }, resetDisplayDelay);
}

async function getFilePaths() {
    try {
        const response = await fetch("../image-retriever/wavelengths.json");
        if (!response.ok) {
            throw new Error(`Failed to fetch file paths: ${response.status}`);
        }
        imgFilePaths = await response.json();
        console.log('Updated Image Paths');
    } catch (error) {
        console.error(error.message);
    }
}

function formatDate(inputString) {
    const parts = inputString.split('-');
    const dateString = `${parts[1]}-${parts[2]}-${parts[3].split('T')[0]}`;
    const date = new Date(dateString + 'T00:00:00Z');
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const formattedDate = `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
    dateText.innerHTML = formattedDate;
}

setInterval(getFilePaths, imageUpdateDelay);

main();