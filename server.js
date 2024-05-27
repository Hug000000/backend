import 'dotenv/config';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import reqUtilisateurs from './requete/reqUtilisateurs.js';
import reqVoiture from './requete/reqVoiture.js';
import reqAvis from './requete/reqAvis.js';
import reqTrajet from './requete/reqTrajet.js';
import reqVille from './requete/reqVille.js';
import cors from 'cors';
import 'dotenv/config';

// Configurer CORS
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

const rateLimit = require('express-rate-limit');

// Créer une instance de middleware de limitation de taux
const limiter = rateLimit({
  windowMs: 3 * 1000,
  max: 5, // Limite chaque IP à 100 requêtes par fenêtre de 15 minutes
  standardHeaders: true, // Retourne les informations de taux de limite dans les entêtes `RateLimit-*`
  legacyHeaders: false, // Désactive les entêtes `X-RateLimit-*`
});

app.use(limiter);

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Middleware CORS
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

// Attache io aux requetes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Met en place les routes
app.use('/utilisateurs', reqUtilisateurs);
app.use('/voiture', reqVoiture);
app.use('/avis', reqAvis);
app.use('/trajets', reqTrajet);
app.use('/ville', reqVille);

// Le serveur HTTP écoute sur le port PORT
const port = process.env.PORT;
server.listen(port, () => {
  //console.log(`Serveur lancé sur l'adresse http://localhost:${port}`);
});

// Le serveur WebSocket écoute sur le port WS_PORT
const wsPort = process.env.WS_PORT;
const wsServer = http.createServer();
wsServer.listen(wsPort, () => {
  //console.log(`WebSocket lancé à l'adresse http://localhost:${wsPort}`);
});

io.attach(wsServer);

io.on('connection', (socket) => {
  //console.log('Un utilisateur est connecté');

  socket.on('disconnect', () => {
    //console.log('Un utilisateur est déconnecté');
  });
});