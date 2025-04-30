const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

//app.use(express.static(__dirname));

/*
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'display/index.html'));
});
*/

app.use(express.static(path.join(__dirname,'display')));
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});