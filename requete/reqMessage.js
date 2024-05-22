import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './reqUtilisateurs.js';
import { verifyTokenAndGetAdminStatus } from './reqUtilisateurs.js';
const prisma = new PrismaClient();
const router = express.Router();

// Routeur GET général pour récupérer tous les messages
router.get('/', authenticateToken, async (req, res) => {
    try {
        const messages = await prisma.message.findMany();
        res.status(200).json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des messages');
    }
});

// Routeur GET pour récupérer des messages basés sur le destinataire
router.get('/receveur/:receveur', authenticateToken, async (req, res) => {
    const { receveur } = req.params;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    if (parseInt(receveur) !== userId) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        const messages = await prisma.message.findMany({
            where: { receveur }
        });
        if (messages.length > 0) {
            res.status(200).json(messages);
        } else {
            res.status(404).send('Aucun message trouvé pour ce destinataire');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des messages');
    }
});

// Routeur GET pour récupérer des messages basés sur l'émetteur
router.get('/envoyeur/:envoyeur', authenticateToken, async (req, res) => {
    const { envoyeur } = req.params;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    if (parseInt(envoyeur) !== userId) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        const messages = await prisma.message.findMany({
            where: { envoyeur }
        });
        if (messages.length > 0) {
            res.status(200).json(messages);
        } else {
            res.status(404).send('Aucun message trouvé pour cet émetteur');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des messages');
    }
});

// Routeur POST pour ajouter un nouveau message
router.post('/', authenticateToken, async (req, res) => {
    const { date, texte, envoyeur, receveur } = req.body;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    if (parseInt(envoyeur) !== userId) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        const newMessage = await prisma.message.create({
            data: {
                date,
                texte,
                envoyeur,
                receveur
            }
        });
        res.status(201).json(newMessage);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de l\'ajout du message');
    }
});

// Routeur DELETE pour supprimer un message
router.delete('/:id',verifyTokenAndGetAdminStatus, authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    if (parseInt(envoyeur) !== userId && !req.userIsAdmin) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        const deleteResult = await prisma.message.delete({
            where: { idmessage: parseInt(id) }
        });
        res.status(200).send('Message supprimé avec succès');
    } catch (err) {
        if (err.code === 'P2025') {
            res.status(404).send('Aucun message trouvé avec cet ID');
        } else {
            console.error(err.message);
            res.status(500).send('Erreur lors de la suppression du message');
        }
    }
});

export default router;
