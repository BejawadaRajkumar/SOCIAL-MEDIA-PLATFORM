const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173', // Adjust to your frontend's URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

const messageSchema = new mongoose.Schema({
  senderEmail: { type: String, required: true },
  receiverEmail: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/api/chat/send-message', authenticateToken, async (req, res) => {
  try {
    const { receiverEmail, content } = req.body;
    const senderEmail = req.user.email;

    if (!receiverEmail || !content) {
      return res.status(400).json({ message: 'Receiver email and content are required' });
    }

    const message = new Message({ senderEmail, receiverEmail, content });
    await message.save();

    // Emit the new message to both sender and receiver via WebSocket
    io.emit('newMessage', { senderEmail, receiverEmail, content, timestamp: message.timestamp });

    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

app.get('/api/chat/messages/:otherEmail', authenticateToken, async (req, res) => {
  try {
    const { otherEmail } = req.params;
    const userEmail = req.user.email;

    const messages = await Message.find({
      $or: [
        { senderEmail: userEmail, receiverEmail: otherEmail },
        { senderEmail: otherEmail, receiverEmail: userEmail },
      ],
    }).sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

const PORT = process.env.PORT || 8086;
const server = app.listen(PORT, () => {
  console.log(`Chat service running on port ${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Adjust to your frontend's URL
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});