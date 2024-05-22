import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './reqUtilisateurs.js';
const prisma = new PrismaClient();
const router = express.Router();

// Routeur GET pour récupérer des avis basés sur l'émetteur
router.get('/emetteur/', authenticateToken, async (req, res) => {
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    try {
        const avis = await prisma.avis.findMany({
            where: {
                emetteur: {
                    idutilisateur: parseInt(userId)
                }
            }
        });
        res.status(200).json(avis);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des avis');
    }
});

// Routeur GET pour récupérer des avis basés sur le destinataire connecté
router.get('/destinataire/', authenticateToken, async (req, res) => {
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    try {
        const avis = await prisma.avis.findMany({
            where: {
                destinataire: {
                    idutilisateur: parseInt(userId)
                }
            }
        });
        res.status(200).json(avis);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des avis');
    }
});

// Routeur GET pour récupérer des avis basés sur un destinataire spécifique
router.get('/destinataire/:destinataire', authenticateToken, async (req, res) => {
    const { destinataire } = req.params;
    try {
        const avis = await prisma.avis.findMany({
            where: {
                destinataire: {
                    idutilisateur: parseInt(destinataire)
                }
            }
        });
        res.status(200).json(avis);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des avis');
    }
});

// Routeur GET pour obtenir la moyenne des notes reçues par un utilisateur spécifique
router.get('/moyenne/:destinataire', authenticateToken, async (req, res) => {
    const destinataireId = parseInt(req.params.destinataire, 10);
    if (isNaN(destinataireId)) {
        return res.status(400).send('L\'ID du destinataire doit être un nombre entier valide');
    }

    try {
        // Vérifier d'abord si l'utilisateur existe
        const userExists = await prisma.utilisateur.findUnique({
            where: {
                idutilisateur: destinataireId
            }
        });

        if (!userExists) {
            return res.status(404).send('Utilisateur non trouvé');
        }

        // Calculer la moyenne des notes
        const moyenne = await prisma.avis.aggregate({
            where: {
                iddestinataire: destinataireId
            },
            _avg: {
                note: true
            }
        });

        if (moyenne._avg.note === null) {
            // L'utilisateur existe mais n'a pas de notes
            res.status(200).json({
                utilisateur: destinataireId,
                moyenne: -1 // Aucune note trouvée
            });
        } else {
            // L'utilisateur existe et a une moyenne de notes
            const moyenneNote = parseFloat(moyenne._avg.note).toFixed(2);
            res.status(200).json({
                utilisateur: destinataireId,
                moyenne: moyenneNote
            });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération de la moyenne des notes');
    }
});

// Routeur GET pour vérifier si l'utilisateur connecté a déjà noté un conducteur spécifique
router.get('/hasRated/:conducteurId', authenticateToken, async (req, res) => {
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    const { conducteurId } = req.params;

    try {
        // Recherche d'un avis où l'utilisateur connecté est l'émetteur et le conducteur est le destinataire
        const existingAvis = await prisma.avis.findFirst({
            where: {
                idemetteur: parseInt(userId),
                iddestinataire: parseInt(conducteurId)
            }
        });

        // Si un avis existe, renvoyer true, sinon false
        const hasRated = !!existingAvis;
        res.status(200).json({ hasRated });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la vérification si l\'utilisateur a noté le conducteur');
    }
});


// Routeur POST pour ajouter un nouvel avis
router.post('/', authenticateToken, async (req, res) => {
    const { note, date, texte, destinataire } = req.body;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT

    try {
        // Vérification que l'émetteur et le destinataire ne sont pas les mêmes
        if (parseInt(userId) === parseInt(destinataire)) {
            return res.status(400).json({ error: "L'émetteur et le destinataire ne peuvent pas être les mêmes." });
        }

        // Vérification de l'existence d'un avis pour ce couple emetteur/destinataire
        const existingAvis = await prisma.avis.findFirst({
            where: {
                emetteur: { idutilisateur: parseInt(userId) },
                destinataire: { idutilisateur: parseInt(destinataire) }
            }
        });

        if (existingAvis) {
            return res.status(400).json({ error: "Un avis existe déjà pour ce destinataire et cet utilisateur." });
        }

        const nouvelAvis = await prisma.avis.create({
            data: {
                note,
                date,
                texte,
                emetteur: { connect: { idutilisateur: parseInt(userId) } },
                destinataire: { connect: { idutilisateur: parseInt(destinataire) } }
            }
        });

        req.io.emit('nouvel_avis', nouvelAvis); // Émettre l'événement WebSocket

        res.status(201).json(nouvelAvis);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de l\'ajout de l\'avis');
    }
});

// Routeur DELETE pour supprimer un avis en fonction de son ID
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    try {
        const avis = await prisma.avis.findUnique({
            where: { idavis: parseInt(id) }
        });

        if (!avis) {
            return res.status(404).send('Aucun avis trouvé avec cet ID');
        }

        if (avis.idemetteur !== userId) {
            return res.status(403).send('Accès non autorisé');
        }

        await prisma.avis.delete({
            where: { idavis: parseInt(id) }
        });

        req.io.emit('supprimer_avis', { idavis: parseInt(id) }); // Émettre l'événement WebSocket

        res.status(200).send('Avis supprimé avec succès');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la suppression de l\'avis');
    }
});

export default router;