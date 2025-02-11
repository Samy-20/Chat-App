const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const io = require('socket.io')(8080, {
    cors: {
        origin: 'http://localhost:3000',
    }
});

// Connect DB
require('./db/connection');

// Import Models
const Users = require('./models/Users');
const Conversations = require('./models/Conversation');
const Messages = require('./models/Messages');

// Initialize Express App
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from frontend
}));

const port = process.env.PORT || 8000;

// Socket.io
let users = [];
io.on('connection', socket => {
    console.log('User  connected', socket.id);
    
    socket.on('addUser ', userId => {
        const isUserExist = users.find(user => user.userId === userId);
        if (!isUserExist) {
            const user = { userId, socketId: socket.id };
            users.push(user);
            io.emit('getUsers', users);
        }
    });

    socket.on('sendMessage', async ({ senderId, receiverId, message, conversationId }) => {
        const receiver = users.find(user => user.userId === receiverId);
        const sender = users.find(user => user.userId === senderId);
        const user = await Users.findById(senderId);
        
        if (receiver) {
            io.to(receiver.socketId).to(sender.socketId).emit('getMessage', {
                senderId,
                message,
                conversationId,
                receiverId,
                user: { id: user._id, fullName: user.fullName, email: user.email }
            });
        } else {
            io.to(sender.socketId).emit('getMessage', {
                senderId,
                message,
                conversationId,
                receiverId,
                user: { id: user._id, fullName: user.fullName, email: user.email }
            });
        }
    });

    socket.on('disconnect', () => {
        users = users.filter(user => user.socketId !== socket.id);
        io.emit('getUsers', users);
    });
});

// Routes
app.get('/', (req, res) => {
    res.send('Welcome');
});

app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).send('Please fill all required fields');
        }

        const isAlreadyExist = await Users.findOne({ email });
        if (isAlreadyExist) {
            return res.status(400).send('User  already exists');
        }

        const newUser  = new Users({ fullName, email });
        const hashedPassword = await bcryptjs.hash(password, 10);
        newUser .set('password', hashedPassword);
        await newUser .save();

        return res.status(200).send('User  registered successfully');
    } catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).send('Internal Server Error');
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send('Please fill all required fields');
        }

        const user = await Users.findOne({ email });
        if (!user) {
            return res.status(400).send('User  email or password is incorrect');
        }

        const validateUser  = await bcryptjs.compare(password, user.password);
        if (!validateUser ) {
            return res.status(400).send('User  email or password is incorrect');
        }

        const payload = {
            userId: user._id,
            email: user.email
        };
        const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'THIS_IS_A_JWT_SECRET_KEY';

        jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: 84600 }, async (err, token) => {
            if (err) {
                console.error('Error signing token:', err);
                return res.status(500).send('Internal Server Error');
            }
            await Users.updateOne({ _id: user._id }, { $set: { token } });
            return res.status(200).json({ user: { id: user._id, email: user.email, fullName: user.fullName }, token });
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).send('Internal Server Error');
    }
});

app.post('/api/conversation', async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        const newConversation = new Conversations({ members: [senderId, receiverId] });
        await newConversation.save();
        res.status(200).send('Conversation created successfully');
    } catch (error) {
        console.error('Error creating conversation:', error);
        return res.status(500).send('Internal Server Error');
    }
});

app.get('/api/conversations/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const conversations = await Conversations.find({ members: { $in: [userId] } });
        const conversationUserData = await Promise.all(conversations.map(async (conversation) => {
            const receiverId = conversation.members.find((member) => member !== userId);
            const user = await Users.findById(receiverId);
            return { user: { receiverId: user._id, email: user.email, fullName: user.fullName }, conversationId: conversation._id };
        }));
        res.status(200).json(conversationUserData);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return res.status(500).send('Internal Server Error');
    }
});

app.post('/api/message', async (req, res) => {
    try {
        const { conversationId, senderId, message, receiverId = '' } = req.body;
        if (!senderId || !message) return res.status(400).send('Please fill all required fields');

        if (conversationId === 'new' && receiverId) {
            const newConversation = new Conversations({ members: [senderId, receiverId] });
            await newConversation.save();
            const newMessage = new Messages({ conversationId: newConversation._id, senderId, message });
            await newMessage.save();
            return res.status(200).send('Message sent successfully');
        } else if (!conversationId && !receiverId) {
            return res.status(400).send('Please fill all required fields');
        }

        const newMessage = new Messages({ conversationId, senderId, message });
        await newMessage.save();
        res.status(200).send('Message sent successfully');
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).send('Internal Server Error');
    }
});

app.get('/api/message/:conversationId', async (req, res) => {
    try {
        const conversationId = req.params.conversationId;
        const messages = await Messages.find({ conversationId });
        const messageUserData = await Promise.all(messages.map(async (message) => {
            const user = await Users.findById(message.senderId);
            return { user: { id: user._id, email: user.email, fullName: user.fullName }, message: message.message };
        }));
        res.status(200).json(messageUserData);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).send('Internal Server Error');
    }
});

app.get('/api/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const users = await Users.find({ _id: { $ne: userId } });
        const usersData = await Promise.all(users.map(async (user) => {
            return { user: { email: user.email, fullName: user.fullName, receiverId: user._id } };
        }));
        res.status(200).json(usersData);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).send('Internal Server Error');
    }
});

// Start the server
app.listen(port, () => {
    console.log('Listening on port ' + port);
});