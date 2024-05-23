import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const saltRounds = 10; // Coût de traitement de hachage

// Définir __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Ajout des villes
  const villes = [
    { nom: "Paris" },
    { nom: "Marseille" },
    { nom: "Lyon" },
    { nom: "Toulouse" },
    { nom: "Nice" },
    { nom: "Nantes" },
    { nom: "Strasbourg" },
    { nom: "Montpellier" },
    { nom: "Bordeaux" },
    { nom: "Lille" },
    { nom: "Rennes" },
    { nom: "Reims" },
    { nom: "Le Havre" },
    { nom: "Saint-Étienne" },
    { nom: "Toulon" },
    { nom: "Angers" },
    { nom: "Grenoble" },
    { nom: "Dijon" },
    { nom: "Nîmes" },
    { nom: "Aix-en-Provence" },
    { nom: "Saint-Quentin" },
    { nom: "Le Mans" },
    { nom: "Clermont-Ferrand" },
    { nom: "Brest" },
    { nom: "Limoges" },
    { nom: "Tours" },
    { nom: "Amiens" },
    { nom: "Metz" },
    { nom: "Perpignan" },
    { nom: "Besançon" },
    { nom: "Orléans" },
    { nom: "Rouen" },
    { nom: "Mulhouse" },
    { nom: "Caen" },
    { nom: "Nancy" },
    { nom: "Saint-Denis" },
    { nom: "Argenteuil" },
    { nom: "Montreuil" },
    { nom: "Roubaix" },
    { nom: "Tourcoing" },
    { nom: "Nanterre" },
    { nom: "Vitry-sur-Seine" },
    { nom: "Créteil" },
    { nom: "Dunkerque" },
    { nom: "Avignon" },
    { nom: "Poitiers" },
    { nom: "Asnières-sur-Seine" },
    { nom: "Versailles" },
    { nom: "Colombes" },
    { nom: "Aulnay-sous-Bois" },
    { nom: "La Rochelle" },
    { nom: "Rueil-Malmaison" },
    { nom: "Antibes" },
    { nom: "Saint-Maur-des-Fossés" },
    { nom: "Calais" },
    { nom: "Beziers" },
    { nom: "Levallois-Perret" },
    { nom: "Drancy" },
    { nom: "Noisy-le-Grand" },
    { nom: "Villejuif" },
    { nom: "Troyes" },
    { nom: "Issy-les-Moulineaux" },
    { nom: "Boulogne-Billancourt" },
    { nom: "Pau" },
    { nom: "Évry-Courcouronnes" },
    { nom: "Clichy" },
    { nom: "Villeneuve-d'Ascq" },
    { nom: "Valence" },
    { nom: "Cherbourg-en-Cotentin" },
    { nom: "Quimper" },
    { nom: "La Seyne-sur-Mer" },
    { nom: "Antony" },
    { nom: "Lorient" },
    { nom: "Chambéry" },
    { nom: "Niort" },
    { nom: "Sartrouville" },
    { nom: "Villeurbanne" },
    { nom: "Les Abymes" },
    { nom: "Mérignac" },
    { nom: "Vénissieux" },
    { nom: "Hyères" },
    { nom: "Saint-Pierre" },
    { nom: "Bayonne" },
    { nom: "Le Blanc-Mesnil" },
    { nom: "Maisons-Alfort" },
    { nom: "Meaux" },
    { nom: "Cannes" },
    { nom: "Chalon-sur-Saône" },
    { nom: "Pantin" },
    { nom: "Neuilly-sur-Seine" },
    { nom: "Ivry-sur-Seine" },
    { nom: "Lorraine" },
    { nom: "Pessac" },
    { nom: "Annecy" },
    { nom: "Fréjus" },
    { nom: "Colmar" },
    { nom: "Vannes" },
    { nom: "Saint-Jean-de-Braye" },
    { nom: "Sarreguemines" }
  ];

  for (const ville of villes) {
    await prisma.ville.create({ data: ville });
  }

  // Lire et encoder l'image en base64
  const imagePath = path.resolve(__dirname, 'pdp.jpg');

  let imageBase64;
  try {
    const imageBuffer = await fs.readFile(imagePath);
    imageBase64 = imageBuffer.toString('base64');
  } catch (error) {
    console.error(`Erreur lors de la lecture de l'image: ${error.message}`);
    return;
  }

  // Ajout des utilisateurs
  const users = [
    {
      nom: 'Test1',
      prenom: 'User',
      age: 30,
      username: 'testuser1',
      numtel: '1234567890',
      motdepasse: 'test',
      estadmin: false
    },
    {
      nom: 'Test2',
      prenom: 'User',
      age: 30,
      username: 'testuser2',
      numtel: '1234567890',
      motdepasse: 'test',
      estadmin: false
    },
    {
      nom: 'Test3',
      prenom: 'User',
      age: 30,
      username: 'testuser3',
      numtel: '1234567890',
      motdepasse: 'test',
      estadmin: false
    },
    {
      nom: 'Admin',
      prenom: 'User',
      age: 40,
      username: 'adminuser',
      numtel: '0987654321',
      motdepasse: 'test',
      estadmin: true
    }
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.motdepasse, saltRounds);

    // Créer la photo associée à l'utilisateur
    const createdPhoto = await prisma.photo.create({
      data: {
        image: `data:image/jpeg;base64,${imageBase64}`
      }
    });

    await prisma.utilisateur.create({
      data: {
        nom: user.nom,
        prenom: user.prenom,
        age: user.age,
        username: user.username,
        numtel: user.numtel,
        motdepasse: hashedPassword,
        estadmin: user.estadmin,
        photoprofil: createdPhoto.idphoto
      }
    });
  }

  //console.log("Villes et utilisateurs ajoutés avec succès!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
