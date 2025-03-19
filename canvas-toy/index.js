const fs = require('fs')
const { createCanvas, loadImage } = require('canvas')

const width = 2048
const height = 2048

const canvas = createCanvas(width, height)
const context = canvas.getContext('2d')

context.fillStyle = '#000'
context.fillRect(0, 0, width, height)

async function createImage() {
    let sun = await loadImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0171.jpg');
    let mask = await loadImage("../original/aia171-4k-mask.png");

    context.drawImage(sun, 0, 0, width, height)
    context.drawImage(mask, 0, 0, width, height)

    //Add date

    const buffer = canvas.toBuffer('image/png')
    fs.writeFileSync('./test.png', buffer)
}

createImage();

/*
loadImage('https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0171.jpg').then(image => {
    context.drawImage(image, 0, 0, width, height)

    context.font = 'bold 70pt'
    context.textAlign = 'center'
    context.textBaseline = 'top'
    context.fillStyle = '#3574d4'

    const text = 'Hello, World!'

    const textWidth = context.measureText(text).width
    context.fillRect(600 - textWidth / 2 - 10, 170 - 5, textWidth + 20, 120)
    context.fillStyle = '#fff'
    context.fillText(text, 600, 170)

    context.fillStyle = '#fff'
    context.font = 'bold 30pt Menlo'
    context.fillText('flaviocopes.com', 600, 530)


    const buffer = canvas.toBuffer('image/png')
    fs.writeFileSync('./test.png', buffer)
})
    */