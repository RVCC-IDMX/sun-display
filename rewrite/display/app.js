const sunImg = document.getElementById('sun-photo');
const dateText = document.getElementById('date-text');

const defaultWavelength = 'aia171';
const pathToRetriever = '../image-retriever/'

const imageToSkip = 10; // How many images giving an input will skip

let imgFilePaths = {};
let imageIndex = 0;

let currentWavelength = defaultWavelength;

main();

async function main() {
    await getFilePaths();

    sunImg.src = pathToRetriever + imgFilePaths[currentWavelength][imageIndex];
    formatDate(imgFilePaths[currentWavelength][imageIndex])

    document.addEventListener('keydown', (event) => {
        if (event.key === '1') {
            changeWavelength(1);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === '2') {
            changeWavelength(2);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === '3') {
            changeWavelength(3);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === '4') {
            changeWavelength(4);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            moveBackImage();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
            moveForwardImage();
        }
    });
};

function changeWavelength(index) {
    switch (index) {
        case 1:
            currentWavelength = 'aia171';
            sunImg.src = pathToRetriever + imgFilePaths[currentWavelength][imageIndex];
            formatDate(imgFilePaths[currentWavelength][imageIndex])
            break;
        case 2:
            currentWavelength = 'aia193';
            sunImg.src = pathToRetriever + imgFilePaths[currentWavelength][imageIndex];
            formatDate(imgFilePaths[currentWavelength][imageIndex])
            break;
        case 3:
            currentWavelength = 'aia211';
            sunImg.src = pathToRetriever + imgFilePaths[currentWavelength][imageIndex];
            formatDate(imgFilePaths[currentWavelength][imageIndex])
            break;
        case 4:
            currentWavelength = 'aia304';
            sunImg.src = pathToRetriever + imgFilePaths[currentWavelength][imageIndex];
            formatDate(imgFilePaths[currentWavelength][imageIndex])
            break;
    }
};

function moveBackImage() {
    if (imageIndex < imgFilePaths.aia171.length - 1)
        imageIndex += imageToSkip;
    sunImg.src = pathToRetriever + imgFilePaths[currentWavelength][imageIndex];
    formatDate(imgFilePaths[currentWavelength][imageIndex])
};

function moveForwardImage() {
    if (imageIndex > 0) {
        imageIndex -= imageToSkip;
    }
    sunImg.src = pathToRetriever + imgFilePaths[currentWavelength][imageIndex];
    formatDate(imgFilePaths[currentWavelength][imageIndex])
};

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
};

function formatDate(inputString) {
    const dateString = inputString.split('-')[1] + '-' + inputString.split('-')[2] + '-' + inputString.split('-')[3].split('T')[0];
    const date = new Date(dateString + 'T00:00:00Z');

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const formattedDate = `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
    
    dateText.innerHTML = formattedDate;
};