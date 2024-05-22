
/*
  Warnings:

  - Added the required column `placesDisponibles` to the `Trajet` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Trajet" ADD COLUMN     "placesDisponibles" INTEGER NOT NULL;
