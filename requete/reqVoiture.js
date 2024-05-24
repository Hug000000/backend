import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './reqUtilisateurs.js';
import { verifyTokenAndGetAdminStatus } from './reqUtilisateurs.js';
const prisma = new PrismaClient();
const router = express.Router();

// Routeur GET pour récupérer toutes les voitures
router.get('/', verifyTokenAndGetAdminStatus, async (req, res) => {
    // Vérifie si l'utilisateur est admin
    if (!req.userIsAdmin) {
        return res.status(403).send('Accès non autorisé');
    }

    try {
        // Récupère toutes les voitures
        const voitures = await prisma.voiture.findMany();
        res.status(200).json(voitures);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des voitures');
    }
});

// Routeur GET récupérer toutes les voitures de l'utilisateur
router.get('/par-proprietaire', authenticateToken, async (req, res) => {
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    // Vérifie que l'utilisateur est connecté
    if (!userId) {
        return res.status(403).send('Accès non autorisé');
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

// Routeur GET pour récupérer une voiture spécifique par la plaque d'immatriculation
router.get('/:plaque', authenticateToken, async (req, res) => {
    const { plaque } = req.params;

    try {
        //Récupère la voiture 
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

// Routeur POST pour ajouter une nouvelle voiture
router.post('/', authenticateToken, async (req, res) => {
  const { marque, modele, couleur, plaqueimat } = req.body;
  const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT

  // Vérifie que l'utilisateur est connecté
  if (!userId) {
      return res.status(403).send('Accès non autorisé');
  }

  try {
    // Vérifie si une voiture avec la même plaque d'immatriculation existe déjà
    const voitureExistante = await prisma.voiture.findUnique({
      where: {
        plaqueimat: plaqueimat
      }
    });

    if (voitureExistante) {
      return res.status(409).send("Une voiture avec cette plaque d'immatriculation existe déjà.");
    }

    // Crée la nouvelle voiture dans la base de données
    const nouvelleVoiture = await prisma.voiture.create({
      data: {
        marque,
        modele,
        couleur,
        plaqueimat,
        proprietaire: {
          connect: { idutilisateur: userId }
        }
      }
    });

    res.status(201).json(nouvelleVoiture);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur lors de l'ajout de la voiture.");
  }
});

// Routeur PUT pour mettre à jour une voiture en fonction de sa plaque d'immatriculation
router.put('/:plaque', authenticateToken, async (req, res) => {
    const { marque, modele, couleur } = req.body;
    const { plaque } = req.params;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    // Vérifie que l'utilisateur est connecté
    if (!userId) {
        return res.status(403).send('Accès non autorisé');
    }
  
    try {
      // Vérifie que la voiture appartient à l'utilisateur connecté
      const voiture = await prisma.voiture.findUnique({
        where: { plaqueimat: plaque },
      });
  
      if (!voiture || voiture.idProprietaire !== userId) {
        return res.status(403).send('Accès non autorisé.');
      }
  
      // Met à jour la voiture
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
  
// Routeur DELETE pour supprimer une voiture en fonction de sa plaque d'immatriculation
router.delete('/:plaque', authenticateToken, async (req, res) => {
    const { plaque } = req.params;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    // Vérifie que l'utilisateur est connecté
    if (!userId) {
        return res.status(403).send('Accès non autorisé');
    }

    try {
      // Vérifie que la voiture appartient à l'utilisateur connecté
      const voiture = await prisma.voiture.findUnique({
        where: { plaqueimat: plaque },
      });
  
      if (!voiture || voiture.idProprietaire !== userId) {
        return res.status(403).send('Accès non autorisé.');
      }
  
      // Supprime la voiture
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
