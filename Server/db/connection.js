const mongoose = require('mongoose');

const url = 'mongodb+srv://sahilzagade3:Sony1234@cluster0.5t5fv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(url, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
    .then(() => console.log('Connected to database'))
    .catch(err => console.error('Error connecting to database:', err));