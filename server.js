import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import reqUtilisateurs from './requete/reqUtilisateurs.js';
import reqVoiture from './requete/reqVoiture.js';
import reqAvis from './requete/reqAvis.js';
import reqMessage from './requete/reqMessage.js';
import reqTrajet from './requete/reqTrajet.js';
import reqVille from './requete/reqVille.js';
import cors from 'cors';
import 'dotenv/config';

// Configurer CORS avec des options personnalisées
const corsOptions = {
  origin: process.env.FRONT_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Attach io to the request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/utilisateurs', reqUtilisateurs);
app.use('/voiture', reqVoiture);
app.use('/avis', reqAvis);
app.use('/message', reqMessage);
app.use('/trajets', reqTrajet);
app.use('/ville', reqVille);

// Le serveur HTTP écoute sur le port 3000
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Le serveur WebSocket écoute sur le port 3001
const wsPort = process.env.WS_PORT || 3001;
const wsServer = http.createServer();
wsServer.listen(wsPort, () => {
  console.log(`WebSocket Server running on http://localhost:${wsPort}`);
});

io.attach(wsServer);

io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté');

  socket.on('disconnect', () => {
    console.log('Un utilisateur est déconnecté');
  });
});