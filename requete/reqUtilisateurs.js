import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const secretKey = process.env.SECRET_KEY;
const router = express.Router();
const saltRounds = 10; // Coût de traitement de hachage

// Routeur POST pour se connecter à un utilisateur
router.post('/login', async (req, res) => {
    const { username, motdepasse } = req.body;
    if (!username || !motdepasse) {
        return res.status(400).send('Nom d\'utilisateur et mot de passe requis');
    }
    try {
        // Vérifie que l'utilisateur existe
        const user = await prisma.utilisateur.findFirst({
            where: { username }
        });
        if (!user) {
            return res.status(401).send('Nom d\'utilisateur ou mot de passe incorrect');
        }

        // Vérifie que le mot de passe est correct
        const motdepasseMatch = await bcrypt.compare(motdepasse, user.motdepasse);
        if (!motdepasseMatch) {
            return res.status(401).send('Nom d\'utilisateur ou mot de passe incorrect');
        }

        // Crée le token et le cookie
        const token = jwt.sign({ userId: user.idutilisateur }, secretKey, { expiresIn: '1h' });
        const cookieOptions = {
            httpOnly: true,
            sameSite: 'Lax',
            secure: false,
        };

        res.cookie('token', token, cookieOptions);
        res.status(200).send('Connexion réussie et token stocké dans un cookie');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la tentative de connexion');
    }
});

// Route GET pour vérifier le cookie d'authentification
router.get('/cookie', (req, res) => {
    const token = req.cookies.token;
    // Vérifie que le token existe et vérifie qu'il est valide
    if (!token) {
        return res.status(401).send('Aucun cookie d\'authentification trouvé');
    }
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).send('Échec de la vérification du cookie');
        }
        res.send({ valid: true});
    });
});

// Route POST pour supprimer le cookie d'authentification
router.post('/logout', (req, res) => {
    // Supprime le cookie et le token par la meme occasion
    res.clearCookie('token');
    res.send('Déconnexion réussie et cookie supprimé');
});

// Fonction pour s'authentifier à un utilisateur pour avoir les droits d'agir dessus
export function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    // Vérifie que le token existe et vérifie qu'il est valide puis récupère les informations
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403);
        req.decoded = user; // Récupère les données stockés dans le token pour les analyser plus tard
        next();
    });
}

// Middleware pour extraire et vérifier le token JWT du cookie
export const verifyTokenAndGetAdminStatus = async (req, res, next) => {
    const token = req.cookies.token;
    // Vérifie que le token existe et vérifie qu'il est valide puis récupère les informations
    if (!token) {
        return res.status(401).send('Token absent, authentification requise');
    }
    try {
        const decoded = jwt.verify(token, secretKey);
        const user = await prisma.utilisateur.findUnique({
            where: { idutilisateur: decoded.userId },
            select: { estadmin: true }
        });
        if (!user) {
            return res.status(404).send('Utilisateur non trouvé');
        }
        req.userIsAdmin = user.estadmin;
        next();
    } catch (err) {
        console.error(err);
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).send('Token invalide');
        }
        res.status(500).send('Erreur serveur lors de la vérification du token');
    }
};

router.post('/', async (req, res) => {
    const { nom, prenom, age, username, numtel, motdepasse, image } = req.body;

    try {
        // Vérifier si le nom d'utilisateur existe déjà
        const existingUser = await prisma.utilisateur.findFirst({
            where: {
                username: username
            }
        });

        // Si l'utilisateur existe déjà, renvoyer une erreur
        if (existingUser) {
            return res.status(409).send('Nom d\'utilisateur déjà utilisé');
        }

        // Créer la photo associée à l'utilisateur
        const createdPhoto = await prisma.photo.create({
            data: {
                image: image
            }
        });

        const hashedPassword = await bcrypt.hash(motdepasse, saltRounds);

        // Créer l'utilisateur avec l'ID de la photo associée
        const createdUser = await prisma.utilisateur.create({
            data: {
                nom,
                prenom,
                age: parseInt(age),
                username,
                numtel,
                motdepasse: hashedPassword,
                estadmin: false, // Initialisation de estadmin à false
                photo: {
                    connect: {
                        idphoto: createdPhoto.idphoto
                    }
                }
            }
        });

        res.status(201).json(createdUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la création de l\'utilisateur et de l\'image');
    }
});

// Routeur GET pour récupérer tous les utilisateurs avec leurs photos
router.get('/', verifyTokenAndGetAdminStatus, async (req, res) => {
    // Vérifie que l'utilisateur est admin
    if (!req.userIsAdmin) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        // Récupère toutes les informations
        const usersWithPhotos = await prisma.utilisateur.findMany({
            include: {
                photo: {
                    select: {
                        image: true
                    }
                }
            }
        });
        res.status(200).json(usersWithPhotos);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des utilisateurs');
    }
});

// Route GET pour récupérer toutes les informations de l'utilisateur
router.get('/informationsWithPassword', authenticateToken, async (req, res) => {
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    // Vérifie que l'utilisateur est connecté
    if (!userId) {
        return res.status(403).send('Accès non autorisé');
    }

    try {
      // Utilisez `userIdInt` comme un entier
      const user = await prisma.utilisateur.findUnique({
        where: { idutilisateur: parseInt(userId) },
        include: {
          photo: {
            select: { image: true },
          },
        },
      });
  
      if (user) {
        res.status(200).json(user);
      } else {
        res.status(404).send('Utilisateur non trouvé.');
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des informations de l\'utilisateur:', err.message);
      res.status(500).send("Erreur lors de la récupération des informations de l'utilisateur.");
    }
});

// Routeur GET pour récupérer toutes les informations de l'utilisateur, à l'exception du mot de passe
router.get('/:id/', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Récupère toutes les informations sauf le mdp
        const user = await prisma.utilisateur.findUnique({
            where: { idutilisateur: parseInt(id) },
            select: {
                idutilisateur: true,
                nom: true,
                prenom: true,
                age: true,
                username: true,
                numtel: true,
                photo: {
                    select: { image: true }
                },
                estadmin: true
            }
        });

        if (!user) {
            return res.status(404).send('Utilisateur non trouvé');
        }
        res.status(200).json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la récupération des informations de l\'utilisateur');
    }
});

// Routeur PUT pour mettre à jour les informations générales d'un utilisateur (sans mot de passe ni image)
router.put('/informations', authenticateToken, async (req, res) => {
    const { nom, prenom, age, username, numtel } = req.body;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    // Vérifie que l'utilisateur est connecté
    if (!userId) {
        return res.status(403).send('Accès non autorisé');
    }

    try {
        // Mettre à jour les informations générales
        const updatedUser = await prisma.utilisateur.update({
            where: { idutilisateur: parseInt(userId) },
            data: {
                nom,
                prenom,
                age: parseInt(age, 10),
                username,
                numtel,
            }
        });

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la mise à jour des informations.');
    }
});

// Routeur PUT pour mettre à jour uniquement l'image de l'utilisateur authentifié
router.put('/photo', authenticateToken, async (req, res) => {
    const { image } = req.body;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    // Vérifie que l'utilisateur est connecté
    if (!userId) {
        return res.status(403).send('Accès non autorisé');
    }

    try {
        // Trouver l'utilisateur pour récupérer l'ID de la photo associée
        const user = await prisma.utilisateur.findUnique({
            where: { idutilisateur: parseInt(userId) },
            include: {
                photo: {
                    select: { idphoto: true }
                }
            }
        });

        if (!user || !user.photo) {
            return res.status(404).send('Utilisateur ou photo non trouvée.');
        }

        // Mettre à jour l'image de la photo associée à l'utilisateur
        const updatedPhoto = await prisma.photo.update({
            where: { idphoto: user.photo.idphoto },
            data: { image }
        });

        res.status(200).json(updatedPhoto);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la mise à jour de l\'image.');
    }
});

// Routeur PUT pour mettre à jour le mot de passe de l'utilisateur authentifié
router.put('/password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    // Vérifie que l'utilisateur est connecté
    if (!userId) {
        return res.status(403).send('Accès non autorisé');
    }

    try {
        // Trouver l'utilisateur
        const user = await prisma.utilisateur.findUnique({ where: { idutilisateur: userId } });

        if (!user) {
            return res.status(404).send('Utilisateur non trouvé.');
        }

        // Vérifier l'ancien mot de passe
        const validPassword = await bcrypt.compare(oldPassword, user.motdepasse);
        if (!validPassword) {
            return res.status(401).send('Ancien mot de passe incorrect.');
        }

        // Hash du nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Mettre à jour le mot de passe
        const updatedUser = await prisma.utilisateur.update({
            where: { idutilisateur: parseInt(userId) },
            data: {
                motdepasse: hashedPassword,
            }
        });

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la mise à jour du mot de passe.');
    }
});

// Routeur PUT pour mettre à jour les informations d'un utilisateur et l'image dans la table Photo
router.put('/:id',verifyTokenAndGetAdminStatus, async (req, res) => {
    const { id } = req.params;
    const { nom, prenom, age, username, numtel, motdepasse, image } = req.body;
    // Vérifie que l'utilisateur est admin
    if (!req.userIsAdmin) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        // Récupérer l'utilisateur pour obtenir l'ID de la photo associée
        const user = await prisma.utilisateur.findUnique({
            where: { idutilisateur: parseInt(id) },
            include: {
                photo: {
                    select: {
                        idphoto: true
                    }
                }
            }
        });
        if (!user) {
            return res.status(404).send('Utilisateur non trouvé');
        }
        // Récupérer l'ID de la photo associée à l'utilisateur
        const photoId = user.photo ? user.photo.idphoto : null;
        // Mettre à jour l'image de la photo associée à l'utilisateur
        const updatedPhoto = await prisma.photo.update({
            where: { idphoto: photoId },
            data: {
                image: image
            }
        });
        // Mettre à jour les informations de l'utilisateur sauf photoprofil
        const updatedUser = await prisma.utilisateur.update({
            where: { idutilisateur: parseInt(id) },
            data: {
                nom,
                prenom,
                age,
                username,
                numtel,
                motdepasse,
                estadmin: false // Initialisation de estadmin à false
            }
        });
        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la mise à jour de l\'utilisateur et de l\'image');
    }
});

// Routeur DELETE pour supprimer un utilisateur
router.delete('/', authenticateToken, async (req, res) => {
    const { userId } = req.decoded; // Identifiant d'utilisateur extrait du token JWT
    // Vérifie que l'utilisateur est connecté
    if (!userId) {
        return res.status(403).send('Accès non autorisé');
    }

    try {
        // Récupération de l'utilisateur pour obtenir l'ID de la photo associée
        const user = await prisma.utilisateur.findUnique({
            where: { idutilisateur: parseInt(userId) },
            include: {
                photo: {
                    select: {
                        idphoto: true
                    }
                },
                trajetsConduits: true
            }
        });
        if (!user) {
            return res.status(404).send('Utilisateur non trouvé');
        }

        // Supprimer les passagers des trajets conduits
        for (const trajet of user.trajetsConduits) {
            await prisma.estPassager.deleteMany({
                where: { idTrajet: trajet.idtrajet }
            });
        }

        // Supprimer les trajets conduits par l'utilisateur
        await prisma.trajet.deleteMany({
            where: { idConducteur: parseInt(userId) }
        });

        // Suppression des avis envoyés et reçus
        await prisma.avis.deleteMany({
            where: { idemetteur: parseInt(userId) }
        });
        await prisma.avis.deleteMany({
            where: { iddestinataire: parseInt(userId) }
        });

        // Suppression des messages envoyés et reçus
        await prisma.message.deleteMany({
            where: { idemetteur: parseInt(userId) }
        });
        await prisma.message.deleteMany({
            where: { iddestinataire: parseInt(userId) }
        });

        // Suppression des trajets en tant que passager
        await prisma.estPassager.deleteMany({
            where: { idPassager: parseInt(userId) }
        });

        // Suppression des voitures associées
        await prisma.voiture.deleteMany({
            where: { idProprietaire: parseInt(userId) }
        });

        // Suppression de la photo associée
        if (user.photo) {
            await prisma.photo.delete({
                where: { idphoto: user.photo.idphoto }
            });
        }

        // Suppression de l'utilisateur
        await prisma.utilisateur.delete({
            where: { idutilisateur: parseInt(userId) }
        });

        res.status(200).send('Utilisateur supprimé avec succès');
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).send('Utilisateur non trouvé');
        }
        console.error(err.message);
        res.status(500).send('Erreur lors de la suppression de l\'utilisateur');
    }
});

// Routeur DELETE pour supprimer un utilisateur
router.delete('/:id/', verifyTokenAndGetAdminStatus, async (req, res) => {
    const { id } = req.params;
    // Vérifie que l'utilisateur est admin
    if (!req.userIsAdmin) {
        return res.status(403).send('Accès non autorisé');
    }

    try {
        // Récupération de l'utilisateur pour obtenir l'ID de la photo associée
        const user = await prisma.utilisateur.findUnique({
            where: { idutilisateur: parseInt(id) },
            include: {
                photo: {
                    select: {
                        idphoto: true
                    }
                },
                trajetsConduits: true
            }
        });
        if (!user) {
            return res.status(404).send('Utilisateur non trouvé');
        }

        // Supprimer les passagers des trajets conduits
        for (const trajet of user.trajetsConduits) {
            await prisma.estPassager.deleteMany({
                where: { idTrajet: trajet.idtrajet }
            });
        }

        // Supprimer les trajets conduits par l'utilisateur
        await prisma.trajet.deleteMany({
            where: { idConducteur: parseInt(id) }
        });

        // Suppression des avis envoyés et reçus
        await prisma.avis.deleteMany({
            where: { idemetteur: parseInt(id) }
        });
        await prisma.avis.deleteMany({
            where: { iddestinataire: parseInt(id) }
        });

        // Suppression des messages envoyés et reçus
        await prisma.message.deleteMany({
            where: { idemetteur: parseInt(id) }
        });
        await prisma.message.deleteMany({
            where: { iddestinataire: parseInt(id) }
        });

        // Suppression des trajets en tant que passager
        await prisma.estPassager.deleteMany({
            where: { idPassager: parseInt(id) }
        });

        // Suppression des voitures associées
        await prisma.voiture.deleteMany({
            where: { idProprietaire: parseInt(id) }
        });

        // Suppression de la photo associée
        if (user.photo) {
            await prisma.photo.delete({
                where: { idphoto: user.photo.idphoto }
            });
        }

        // Suppression de l'utilisateur
        await prisma.utilisateur.delete({
            where: { idutilisateur: parseInt(id) }
        });

        res.status(200).send('Utilisateur supprimé avec succès');
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).send('Utilisateur non trouvé');
        }
        console.error(err.message);
        res.status(500).send('Erreur lors de la suppression de l\'utilisateur');
    }
});

// Route GET pour récupérer la valeur de estadmin en utilisant le middleware
router.get('/my-admin-status', verifyTokenAndGetAdminStatus, (req, res) => {
    res.status(200).send({ estadmin: req.userIsAdmin });
});

// Routeur PUT pour mettre à jour estadmin pour un utilisateur spécifique
router.put('/:id/estadmin', verifyTokenAndGetAdminStatus, async (req, res) => {
    const { id } = req.params;
    const { estadmin } = req.body;
    // Vérifie que l'utilisateur est admin
    if (!req.userIsAdmin) {
        return res.status(403).send('Accès non autorisé');
    }
    try {
        // Met à jour le estadmin
        const updatedUser = await prisma.utilisateur.update({
            where: { idutilisateur: parseInt(id) },
            data: {
                estadmin
            }
        });
        if (updatedUser) {
            res.status(200).json(updatedUser);
        } else {
            res.status(404).send('Utilisateur non trouvé');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la mise à jour de estadmin pour l\'utilisateur');
    }
});

export default router;