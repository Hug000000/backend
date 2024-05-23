import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Fonction pour normaliser le texte : enlever les accents et convertir en minuscules
const normalizeText = (text) => {
    return text
        .normalize('NFD') // Normalisation en forme décomposée (NFD)
        .replace(/[\u0300-\u036f]/g, '') // Suppression des diacritiques (accents)
        .toLowerCase(); // Conversion en minuscules
};

// Routeur GET pour récupérer l'ID de la ville par rapport au nom de la ville
router.get('/:nom', async (req, res) => {
    const { nom } = req.params; // Récupération du paramètre 'nom' de l'URL

    if (!nom) {
        return res.status(400).json({ error: 'Le nom de la ville est requis.' });
    }

    // Normalisation du nom de la ville reçu en paramètre
    const normalizedNom = normalizeText(nom);

    try {
        const villes = await prisma.ville.findMany();

        // Recherche de la ville correspondant au nom normalisé
        const ville = villes.find(v => normalizeText(v.nom) === normalizedNom);

        if (!ville) {
            return res.status(404).json({ error: `Ville '${nom}' non trouvée.` });
        }

        res.status(200).json({ id: ville.idville });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération de la ville.' });
    }
});

// Routeur GET pour récupérer tous les noms de villes
router.get('/', async (req, res) => {
    try {
        const villes = await prisma.ville.findMany({
            select: { nom: true }
        });

        // Extraction des noms de villes dans un tableau
        const nomsDeVilles = villes.map(ville => ville.nom);

        res.status(200).json(nomsDeVilles);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des noms de villes.' });
    }
});

export default router;