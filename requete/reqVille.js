import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

//Route GET pour récupérer l'ID de ville par rapport au nom de la ville
router.get('/:nom', async (req, res) => {
    const { nom } = req.params;

    if (!nom) {
        return res.status(400).json({ error: 'Le nom de la ville est requis.' });
    }

    try {
        const ville = await prisma.ville.findFirst({
            where: { nom }
        });

        if (!ville) {
            return res.status(404).json({ error: `Ville '${nom}' non trouvée.` });
        }

        res.status(200).json({ id: ville.idville });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération de la ville.' });
    }
});

export default router;
