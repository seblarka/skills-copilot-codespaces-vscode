const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const { default: axios } = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

// Get all comments by post id
app.get('/posts/:id/comments', (req, res) => {
    const postId = req.params.id;
    res.status(200).send(commentsByPostId[postId] || []);
});

// Create new comment by post id
app.post('/posts/:id/comments', async (req, res) => {
    const postId = req.params.id;
    const commentId = randomBytes(4).toString('hex');
    const { content } = req.body;
    const comments = commentsByPostId[postId] || [];
    comments.push({ id: commentId, content, status: 'pending' });
    commentsByPostId[postId] = comments;

    // Emit event to event bus
    await axios.post('http://localhost:4005/events', {
        type: 'CommentCreated',
        data: { id: commentId, content, postId, status: 'pending' }
    });

    res.status(201).send(commentsByPostId[postId]);
});

// Receive event from event bus
app.post('/events', async (req, res) => {
    const { type, data } = req.body;
    console.log('Event Received: ', type);

    if (type === 'CommentModerated') {
        const { postId, id, status, content } = data;
        const comments = commentsByPostId[postId];
        const comment = comments.find(comment => comment.id === id);
        comment.status = status;

        // Emit event to event bus
        await axios.post('http://localhost:4005/events', {
            type: 'CommentUpdated',
            data: { id, status, postId, content }
        });
    }

    res.send({});
});

app.listen(4001, () => {
    console.log('Listening on port 4001');
});