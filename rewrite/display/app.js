const canvas = document.getElementById('sun-canvas');
const ctx = canvas.getContext('2d');
const dateText = document.getElementById('date-text');

const defaultWavelength = 'aia171';
const pathToRetriever = '/image-retriever/';

const imageToSkip = 5; // Number of images to skip when using keyboard, does nothing with mousemove
const imageUpdateDelay = 10 * 60 * 1000; // Delay between updating json, 600000 is 10 minutes in ms 
const resetDisplayDelay = 30 * 1000; // Delay before setting current image to latest, 180000 is 3 minutes in ms
const idleImageRange = 400;

let imgFilePaths = {};
let imageIndex = 0;
let currentWavelength = defaultWavelength;
let resetDisplayIntervalId = null;

let mouseLocked = false;
let idle = false;
let loopId;

function padLoop() {
    const gamepads = navigator.getGamepads();
    if (!gamepads) {
        return;
    }

    const gp = gamepads[0];
    for (let b = 0; b < gp.buttons.length; b++) {
        if (gp.buttons[b].pressed) {
            handleKeyDown('', b);
        }
    }

    loopId = requestAnimationFrame(padLoop);
}

window.addEventListener("gamepadconnected", (e) => {
    console.log(
        "Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index,
        e.gamepad.id,
        e.gamepad.buttons.length,
        e.gamepad.axes.length,
    );
    loopId = requestAnimationFrame(padLoop);
});

window.addEventListener("gamepaddisconnected", (e) => {
    console.log(
        "Gamepad disconnected from index %d: %s",
        e.gamepad.index,
        e.gamepad.id,
    );
    cancelAnimationFrame(loopId);
});

async function main() {
    await getFilePaths();
    resetDisplay();
    changeImage();

    setInterval(idleLoop, 16);

    // Change throttle time to make it more smooth but if you go too low it will start glitching
    document.addEventListener('keydown', throttle(handleKeyDown, 100)); // If we dont throttle this as well you can break the program if you spam switch the wavelength
    document.addEventListener('mousemove', throttle(handleMouseMove, 8)); // 8ms = 125fps

    document.addEventListener('keypress', () => { canvas.requestPointerLock() }); // Lock cursor on keypress
    document.addEventListener("pointerlockchange", lockChangeAlert);
};

function lockChangeAlert() {
    document.pointerLockElement === canvas ? mouseLocked = true : mouseLocked = false;
};

let lastbutton = -1;

function handleKeyDown(event, button) {
    resetDisplay(); // Reset idle timeout

    let b;

    if (event === '') {
        b = (button + 1).toString();
    }
    else {
        b = event.key;
    }

    switch (b) {
        case '1':
            changeWavelength('aia171');
            break;
        case '2':
            changeWavelength('aia211');
            break;
        case '3':
            changeWavelength('aia304');
            break;
        case '4':
            changeWavelength('aia193');
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
};

function handleMouseMove(event) {
    resetDisplay(); // Reset idle timeout

    if (!mouseLocked) {
        let norm = (event.clientX / window.innerWidth);
        norm = 1 - norm;
        norm *= imgFilePaths[currentWavelength].length - 1;
        imageIndex = Math.floor(norm);
        changeImage();
    }
    else {
        if ((imageIndex - event.movementX) > imgFilePaths[currentWavelength].length) {
            imageIndex = imgFilePaths[currentWavelength].length - 1;
        }
        else if ((imageIndex - event.movementX) < 0) {
            imageIndex = 0;
        }
        else {
            imageIndex -= event.movementX;
        }

        changeImage();
    }
};

// I have found that this is needed, the awaits stack up and things jump around a lot without throttling the mousemove event
function throttle(func, limit) {
    let inThrottle;
    return function (event) {
        if (!inThrottle) {
            func.apply(this, arguments);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

var drawThrottle = false;
const sunImage = document.createElement("img");

async function updateCanvasImage(imagePath) {
    if (drawThrottle) return;
    try {
        drawThrottle = true;

        sunImage.onload = () => {

            const maxCanvasWidth = window.innerWidth;
            const maxCanvasHeight = window.innerHeight;
            const scale = Math.min(maxCanvasWidth / sunImage.width, maxCanvasHeight / sunImage.height);

            canvas.width = sunImage.width * scale;
            canvas.height = sunImage.height * scale;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(sunImage, 0, 0, canvas.width, canvas.height);

            drawThrottle = false;

        }
        sunImage.src = pathToRetriever + imagePath;

    } catch (err) {
        console.error(err);
    }
};

function changeImage() {
    const imagePath = imgFilePaths[currentWavelength][imageIndex];
    if (imagePath) {
        updateCanvasImage(imagePath);
        formatDate(imagePath);
    }
};

function changeWavelength(wavelength) {
    if (imgFilePaths[wavelength] && imgFilePaths[wavelength][imageIndex]) {
        currentWavelength = wavelength;
    } else if (imgFilePaths[wavelength]) {
        currentWavelength = wavelength;
        imageIndex = imgFilePaths[wavelength].length - 1;
    }
    changeImage();
};

function moveBackImage(multiplier) {
    imageIndex = Math.min(imageIndex + imageToSkip * multiplier, imgFilePaths[currentWavelength].length - 1);
    changeImage();
};

function moveForwardImage(multiplier) {
    imageIndex = Math.max(imageIndex - imageToSkip * multiplier, 0);
    changeImage();
};

function resetDisplay() {
    if (resetDisplayIntervalId) {
        idle = false;
        clearInterval(resetDisplayIntervalId);
    }
    resetDisplayIntervalId = setInterval(() => {
        if (!idle) imageIndex = 0;
        idle = true;
        changeImage();
    }, resetDisplayDelay);
};

let hitRange = false;

function idleLoop() {

    if (!idle) return;

    if (imageIndex >= idleImageRange) {
        hitRange = true;
    }
    else if (imageIndex <= 0) {
        hitRange = false;
    }

    if (hitRange) {
        imageIndex--;
    }
    else {
        imageIndex++;
    }

    changeImage();
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
};

function formatDate(inputString) {
    const dateString = inputString.substring(23, 42);
    const year = dateString.substring(0, 4);
    const month = dateString.substring(5, 7);
    const day = dateString.substring(8, 10);
    const hour = dateString.substring(11, 13);
    const minute = dateString.substring(14, 16)

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    /*
    Calculates time.
    const timeString = `${hour}:00:00`;
    const timeString12hr = new Date('1970-01-01T' + timeString + 'Z')
        .toLocaleTimeString('en-US',
            { timeZone: 'EST', hour12: true, hour: '2-digit' }
        );
    */

    const formattedDate = `${monthNames[Number(month - 1)]} ${day}, ${year}`;
    dateText.innerHTML = formattedDate;
};

setInterval(getFilePaths, imageUpdateDelay);

main();