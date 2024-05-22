import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './reqUtilisateurs.js';
import { verifyTokenAndGetAdminStatus } from './reqUtilisateurs.js';
const prisma = new PrismaClient();
const router = express.Router();

// Route GET pour récupérer toutes les voitures
router.get('/', verifyTokenAndGetAdminStatus, async (req, res) => {
    if (!req.userIsAdmin) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        const voitures = await prisma.voiture.findMany();
        res.status(200).json(voitures);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des voitures');
    }
});

// Route GET récupérer toutes les voitures de l'utilisateur
router.get('/par-proprietaire', authenticateToken, async (req, res) => {
    const { userId } = req.decoded;
  
    if (!userId) {
      return res.status(403).send('Accès non autorisé.');
    }
  
    try {
      // Récupérer toutes les voitures en filtrant par `idProprietaire`
      const voitures = await prisma.voiture.findMany({
        where: { idProprietaire: userId },
      });
  
      // Retourner toujours un tableau, même vide
      res.status(200).json(voitures);
    } catch (err) {
      console.error('Erreur lors de la récupération des voitures du propriétaire:', err.message);
      res.status(500).send('Erreur lors de la récupération des voitures du propriétaire.');
    }
  });  

// Route GET pour récupérer une voiture spécifique par la plaque d'immatriculation
router.get('/:plaque', authenticateToken, async (req, res) => {
    const { plaque } = req.params;
    try {
        const voiture = await prisma.voiture.findUnique({
            where: { plaqueimat: plaque }
        });
        if (voiture) {
            res.status(200).json(voiture);
        } else {
            res.status(404).send('Voiture non trouvée');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération de la voiture');
    }
});

// Route POST pour ajouter une nouvelle voiture
router.post('/', authenticateToken, async (req, res) => {
    const { marque, modele, couleur, plaqueimat } = req.body;
    const { userId } = req.decoded;
    if (!userId) {
      return res.status(403).send('Accès non autorisé.');
    }
    try {
      // Créer la nouvelle voiture dans la base de données
      const nouvelleVoiture = await prisma.voiture.create({
        data: {
          marque,
          modele,
          couleur,
          plaqueimat,
          proprietaire: {
            connect: { idutilisateur: userId } // Relie l'utilisateur en utilisant `connect`
          }
        }
      });
      res.status(201).json(nouvelleVoiture);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Erreur lors de l'ajout de la voiture.");
    }
  });
  
  

// Route PUT pour mettre à jour une voiture en fonction de sa plaque d'immatriculation
router.put('/:plaque', authenticateToken, async (req, res) => {
    const { marque, modele, couleur } = req.body;
    const { plaque } = req.params;
    const { userId } = req.decoded;
  
    try {
      // Vérifiez que la voiture appartient à l'utilisateur connecté
      const voiture = await prisma.voiture.findUnique({
        where: { plaqueimat: plaque },
      });
  
      if (!voiture || voiture.idProprietaire !== userId) {
        return res.status(403).send('Accès non autorisé.');
      }
  
      // Mettez à jour la voiture
      const voitureUpdated = await prisma.voiture.update({
        where: { plaqueimat: plaque },
        data: {
          marque,
          modele,
          couleur,
        },
      });
  
      res.status(200).json(voitureUpdated);
    } catch (err) {
      if (err.code === 'P2025') {
        res.status(404).send('Aucune voiture trouvée avec cette plaque d\'immatriculation.');
      } else {
        console.error(err.message);
        res.status(500).send('Erreur lors de la mise à jour de la voiture.');
      }
    }
});
  
// Route DELETE pour supprimer une voiture en fonction de sa plaque d'immatriculation
router.delete('/:plaque', authenticateToken, async (req, res) => {
    const { plaque } = req.params;
    const { userId } = req.decoded;
  
    try {
      // Vérifiez que la voiture appartient à l'utilisateur connecté
      const voiture = await prisma.voiture.findUnique({
        where: { plaqueimat: plaque },
      });
  
      if (!voiture || voiture.idProprietaire !== userId) {
        return res.status(403).send('Accès non autorisé.');
      }
  
      // Supprimez la voiture
      await prisma.voiture.delete({
        where: { plaqueimat: plaque },
      });
  
      res.status(200).send('Voiture supprimée avec succès.');
    } catch (err) {
      if (err.code === 'P2025') {
        res.status(404).send('Aucune voiture trouvée avec cette plaque d\'immatriculation.');
      } else {
        console.error(err.message);
        res.status(500).send('Erreur lors de la suppression de la voiture.');
      }
    }
});  

export default router;
