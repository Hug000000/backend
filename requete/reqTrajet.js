import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, verifyTokenAndGetAdminStatus } from './reqUtilisateurs.js';

const prisma = new PrismaClient();
const router = express.Router();

// Routeur GET pour récupérer tous les trajets
router.get('/', verifyTokenAndGetAdminStatus, async (req, res) => {
    if (!req.userIsAdmin) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        const trajets = await prisma.trajet.findMany();
        res.status(200).json(trajets);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des trajets');
    }
});

// Routeur GET pour récupérer les trajets où l'utilisateur est conducteur
router.get('/conducteur/', authenticateToken, async (req, res) => {
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    if (!userId) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        const trajets = await prisma.trajet.findMany({
            where: { idConducteur: parseInt(userId) },
            include: {
                villedepart: {
                    select: {
                        nom: true
                    }
                },
                villearrivee: {
                    select: {
                        nom: true
                    }
                }
            }
        });
        res.status(200).json(trajets.map(trajet => ({
            ...trajet,
            villedepart: trajet.villedepart.nom,
            villearrivee: trajet.villearrivee.nom
        })));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des trajets');
    }
});

// Routeur GET pour récupérer les trajets où l'utilisateur est passager
router.get('/passager', authenticateToken, async (req, res) => {
    const { userId } = req.decoded;
    if (!userId) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        const trajets = await prisma.trajet.findMany({
            where: {
                passagers: {
                    some: { idPassager: parseInt(userId) }
                }
            },
            include: {
                villedepart: {
                    select: {
                        nom: true
                    }
                },
                villearrivee: {
                    select: {
                        nom: true
                    }
                }
            }
        });
        res.status(200).json(trajets.map(trajet => ({
            ...trajet,
            villedepart: trajet.villedepart.nom,
            villearrivee: trajet.villearrivee.nom
        })));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des trajets');
    }
});

// Routeur GET pour récupérer les détails d'un trajet recherché
router.get('/search', async (req, res) => {
    const { villeDepart, villeArrivee, dateDepart } = req.query;

    try {
        // Construire les conditions de recherche basées sur les paramètres fournis
        const whereClause = {};
        if (villeDepart) {
            whereClause.idvilledepart = parseInt(villeDepart);
        }
        if (villeArrivee) {
            whereClause.idvillearrivee = parseInt(villeArrivee);
        }
        if (dateDepart) {
            const date = new Date(dateDepart);
            whereClause.heuredepart = {
                gte: date,
                lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) // La date suivante
            };
        } else {
            const now = new Date();
            whereClause.heuredepart = {
                gte: now
            };
        }

        const trajets = await prisma.trajet.findMany({
            where: whereClause,
            include: {
                villedepart: true,
                villearrivee: true,
                voiture: true,
                conducteur: {
                    include: {
                        photo: true
                    }
                }
            }
        });

        res.status(200).json(trajets);
    } catch (error) {
        console.error('Erreur lors de la recherche des trajets:', error);
        res.status(500).send('Erreur serveur lors de la recherche des trajets');
    }
});

// Routeur GET pour récupérer les détails d'un trajet spécifique
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const trajet = await prisma.trajet.findUnique({
            where: { idtrajet: parseInt(id) },
            include: {
                villedepart: true,
                villearrivee: true,
                voiture: {
                    include: {
                        proprietaire: true
                    }
                },
                conducteur: true,
                passagers: {
                    include: {
                        passager: true 
                    }
                }            
            }
        });
        if (!trajet) {
            return res.status(404).send('Trajet non trouvé');
        }
        const nombrePassagers = trajet.passagers.length;
        res.json({
            ...trajet,
            nombrePassagers,
            placesDisponibles: trajet.placesDisponibles
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur lors de la récupération des détails du trajet');
    }
});


// Routeur POST pour ajouter un nouveau trajet
router.post('/', authenticateToken, async (req, res) => {
    const { description, idvilledepart, idvillearrivee, dateDepart, heureDepart, dateArrivee, heureArrivee, prix, plaqueimatVoiture, placesDisponibles } = req.body;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    if (!userId) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        const heuredepart = new Date(`${dateDepart}T${heureDepart}`);
        const heurearrivee = new Date(`${dateArrivee}T${heureArrivee}`);
        const nouveauTrajet = await prisma.trajet.create({
            data: {
                description,
                idvilledepart: parseInt(idvilledepart),
                idvillearrivee: parseInt(idvillearrivee),
                heuredepart,
                heurearrivee,
                prix: parseFloat(prix),
                idConducteur: parseInt(userId),
                plaqueimatVoiture,
                placesDisponibles: parseInt(placesDisponibles)
            }
        });
        res.status(201).json(nouveauTrajet);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de l\'ajout du trajet');
    }
});

// Routeur PUT pour mettre à jour un trajet en fonction de son identifiant
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { description, idvilledepart, idvillearrivee, dateDepart, heureDepart, dateArrivee, heureArrivee, prix, plaqueimatVoiture, placesDisponibles } = req.body;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    try {
        const trajet = await prisma.trajet.findUnique({
            where: { idtrajet: parseInt(id) },
            select: { idConducteur: true }
        });

        if (trajet.idConducteur !== userId && !req.userIsAdmin) {
            return res.status(403).send('Accès non autorisé');
        }

        const heuredepart = new Date(`${dateDepart}T${heureDepart}`);
        const heurearrivee = new Date(`${dateArrivee}T${heureArrivee}`);
        const trajetUpdated = await prisma.trajet.update({
            where: { idtrajet: parseInt(id) },
            data: {
                description,
                idvilledepart: parseInt(idvilledepart),
                idvillearrivee: parseInt(idvillearrivee),
                heuredepart,
                heurearrivee,
                prix: parseFloat(prix),
                plaqueimatVoiture,
                placesDisponibles: parseInt(placesDisponibles) 
            }
        });
        res.status(200).json(trajetUpdated);
    } catch (err) {
        if (err.code === 'P2025') {
            res.status(404).send('Aucun trajet trouvé avec cet identifiant');
        } else {
            console.error(err.message);
            res.status(500).send('Erreur lors de la mise à jour du trajet');
        }
    }
});

// Routeur DELETE pour supprimer un trajet en fonction de son identifiant
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;  // Identifiant du trajet
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT

    try {
        // Récupérer le trajet pour vérifier l'identité du conducteur
        const trajet = await prisma.trajet.findUnique({
            where: { idtrajet: parseInt(id) },
            select: { idConducteur: true }
        });

        if (!trajet) {
            return res.status(404).send('Trajet non trouvé');
        }

        // Vérifier si l'utilisateur est le conducteur ou un admin
        if (trajet.idConducteur !== userId && !req.userIsAdmin) {
            return res.status(403).send('Accès non autorisé');
        }

        // Supprimer les enregistrements de passagers associés au trajet
        await prisma.estPassager.deleteMany({
            where: { idTrajet: parseInt(id) }
        });

        // Supprimer le trajet
        await prisma.trajet.delete({
            where: { idtrajet: parseInt(id) }
        });
        
        res.status(200).send('Trajet supprimé avec succès');
    } catch (err) {
        console.error(err.message);
        if (err.code === 'P2025') {
            res.status(404).send('Aucun trajet trouvé avec cet identifiant');
        } else {
            res.status(500).send('Erreur lors de la suppression du trajet');
        }
    }
});

// Routeur POST pour ajouter un passager à un trajet
router.post('/join/:id', authenticateToken, async (req, res) => {
    const { id } = req.params; // Identifiant du trajet
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    
    try {
        // Vérifier si l'utilisateur est déjà passager
        const existingPassager = await prisma.estPassager.findFirst({
            where: { idTrajet: parseInt(id), idPassager: parseInt(userId) }
        });

        if (existingPassager) {
            return res.status(409).send('Le passager est déjà inscrit sur ce trajet');
        }

        // Ajouter un passager à un trajet spécifique
        const nouveauPassager = await prisma.estPassager.create({
            data: {
                idTrajet: parseInt(id),
                idPassager: parseInt(userId)
            }
        });

        res.status(201).json(nouveauPassager);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de l\'ajout du passager au trajet');
    }
});

// Routeur POST pour supprimer un passager d'un trajet
router.post('/leave/:id', authenticateToken, async (req, res) => {
    const { id } = req.params; // Identifiant du trajet
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT

    try {
        // Supprimer le passager du trajet
        const deletedPassager = await prisma.estPassager.deleteMany({
            where: {
                idTrajet: parseInt(id),
                idPassager: parseInt(userId)
            }
        });

        if (deletedPassager.count === 0) {
            return res.status(404).send('Le passager n\'est pas trouvé dans ce trajet');
        }

        res.status(200).json({ message: 'Passager supprimé du trajet avec succès' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la suppression du passager du trajet');
    }
});

export default router;