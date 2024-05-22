-- CreateTable
CREATE TABLE "Utilisateur" (
    "idutilisateur" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "numtel" TEXT NOT NULL,
    "photoprofil" INTEGER,
    "estadmin" BOOLEAN NOT NULL,
    "motdepasse" TEXT NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("idutilisateur")
);

-- CreateTable
CREATE TABLE "Photo" (
    "idphoto" SERIAL NOT NULL,
    "image" TEXT NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("idphoto")
);

-- CreateTable
CREATE TABLE "Ville" (
    "idville" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Ville_pkey" PRIMARY KEY ("idville")
);

-- CreateTable
CREATE TABLE "Voiture" (
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "couleur" TEXT NOT NULL,
    "plaqueimat" TEXT NOT NULL,
    "idProprietaire" INTEGER NOT NULL,

    CONSTRAINT "Voiture_pkey" PRIMARY KEY ("plaqueimat")
);

-- CreateTable
CREATE TABLE "Avis" (
    "idavis" SERIAL NOT NULL,
    "note" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "texte" TEXT NOT NULL,
    "idemetteur" INTEGER NOT NULL,
    "iddestinataire" INTEGER NOT NULL,

    CONSTRAINT "Avis_pkey" PRIMARY KEY ("idavis")
);

-- CreateTable
CREATE TABLE "Message" (
    "idmessage" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "texte" TEXT NOT NULL,
    "idemetteur" INTEGER NOT NULL,
    "iddestinataire" INTEGER NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("idmessage")
);

-- CreateTable
CREATE TABLE "Trajet" (
    "idtrajet" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "idvilledepart" INTEGER NOT NULL,
    "idvillearrivee" INTEGER NOT NULL,
    "heuredepart" TIMESTAMP(3) NOT NULL,
    "heurearrivee" TIMESTAMP(3) NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL,
    "idConducteur" INTEGER NOT NULL,
    "plaqueimatVoiture" TEXT NOT NULL,

    CONSTRAINT "Trajet_pkey" PRIMARY KEY ("idtrajet")
);

-- CreateTable
CREATE TABLE "EstPassager" (
    "idestpassager" SERIAL NOT NULL,
    "idTrajet" INTEGER NOT NULL,
    "idPassager" INTEGER NOT NULL,

    CONSTRAINT "EstPassager_pkey" PRIMARY KEY ("idestpassager")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_photoprofil_key" ON "Utilisateur"("photoprofil");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_photoprofil_fkey" FOREIGN KEY ("photoprofil") REFERENCES "Photo"("idphoto") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voiture" ADD CONSTRAINT "Voiture_idProprietaire_fkey" FOREIGN KEY ("idProprietaire") REFERENCES "Utilisateur"("idutilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_idemetteur_fkey" FOREIGN KEY ("idemetteur") REFERENCES "Utilisateur"("idutilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_iddestinataire_fkey" FOREIGN KEY ("iddestinataire") REFERENCES "Utilisateur"("idutilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_idemetteur_fkey" FOREIGN KEY ("idemetteur") REFERENCES "Utilisateur"("idutilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_iddestinataire_fkey" FOREIGN KEY ("iddestinataire") REFERENCES "Utilisateur"("idutilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trajet" ADD CONSTRAINT "Trajet_idvilledepart_fkey" FOREIGN KEY ("idvilledepart") REFERENCES "Ville"("idville") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trajet" ADD CONSTRAINT "Trajet_idvillearrivee_fkey" FOREIGN KEY ("idvillearrivee") REFERENCES "Ville"("idville") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trajet" ADD CONSTRAINT "Trajet_idConducteur_fkey" FOREIGN KEY ("idConducteur") REFERENCES "Utilisateur"("idutilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trajet" ADD CONSTRAINT "Trajet_plaqueimatVoiture_fkey" FOREIGN KEY ("plaqueimatVoiture") REFERENCES "Voiture"("plaqueimat") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstPassager" ADD CONSTRAINT "EstPassager_idTrajet_fkey" FOREIGN KEY ("idTrajet") REFERENCES "Trajet"("idtrajet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstPassager" ADD CONSTRAINT "EstPassager_idPassager_fkey" FOREIGN KEY ("idPassager") REFERENCES "Utilisateur"("idutilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;
