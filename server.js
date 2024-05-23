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

// Utiliser des cookies sécurisés
app.use((req, res, next) => {
  res.cookie('myCookie', 'value', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
  });
  next();
});

// Middleware CORS personnalisé pour toutes les routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONT_URL);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

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

// Le serveur HTTP écoute sur le port PORT
const port = process.env.PORT;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Le serveur WebSocket écoute sur le port WS_PORT
const wsPort = process.env.WS_PORT;
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