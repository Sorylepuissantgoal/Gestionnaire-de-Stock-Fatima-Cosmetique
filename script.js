import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAgdjI0_0mmSfKXAS0PtJI9CTRko777qTw",
  authDomain: "gestionnaire-de-stock-fatima.firebaseapp.com",
  projectId: "gestionnaire-de-stock-fatima",
  storageBucket: "gestionnaire-de-stock-fatima.firebasestorage.app",
  messagingSenderId: "707260453829",
  appId: "1:707260453829:web:233c7d79471252b68cf1ac"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let adminConnecte = false;

const ADMIN_USERNAME = "Sarifou";
const ADMIN_PASSWORD = "Mouctar";

let produits = [];
let ventes = JSON.parse(localStorage.getItem("ventes")) || [];
let beneficeRetire = Number(localStorage.getItem("beneficeRetire")) || 0;
let ventesRetirees = Number(localStorage.getItem("ventesRetirees")) || 0;

onSnapshot(collection(db, "produits"), (snapshot) => {
  produits = [];

  snapshot.forEach((docItem) => {
    produits.push({
      firestoreId: docItem.id,
      ...docItem.data()
    });
  });

  afficherBoutique();
  afficherAdmin();
  afficherVentes();
  afficherAlertes();
  afficherStats();
});

function afficherPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  document.getElementById(pageId).classList.add("active");

  afficherBoutique();
  afficherAdmin();
  afficherVentes();
  afficherAlertes();
  afficherStats();
}

function formatPrix(prix) {
  return Number(prix || 0).toLocaleString("fr-FR") + " GNF";
}

async function ajouterProduit() {
  let nom = document.getElementById("nomProduit").value.trim();
  let categorie = document.getElementById("categorieProduit").value.trim();
  let stock = Number(document.getElementById("stockProduit").value);
  let prix = Number(document.getElementById("prixProduit").value);
  let prixAchat = Number(document.getElementById("prixAchatProduit").value);
  let seuil = Number(document.getElementById("seuilProduit").value);
  let photo = document.getElementById("photoProduit").value.trim();

  if (nom === "" || stock <= 0 || prix <= 0) {
    alert("Remplis le nom, le stock et le prix.");
    return;
  }

  let nouveauProduit = {
    id: Date.now(),
    nom: nom,
    categorie: categorie || "Autre",
    stock: stock,
    prixAchat: prixAchat || 0,
    prix: prix,
    seuil: seuil || 5,
    photo: photo || ""
  };

  await addDoc(collection(db, "produits"), nouveauProduit);

  document.getElementById("nomProduit").value = "";
  document.getElementById("categorieProduit").value = "";
  document.getElementById("stockProduit").value = "";
  document.getElementById("prixAchatProduit").value = "";
  document.getElementById("prixProduit").value = "";
  document.getElementById("seuilProduit").value = "";
  document.getElementById("photoProduit").value = "";

  alert("Produit ajouté avec succès.");
}

function afficherBoutique() {
  let zone = document.getElementById("listeBoutique");
  if (!zone) return;

  zone.innerHTML = "";

  if (produits.length === 0) {
    zone.innerHTML = "<p>Aucun produit disponible.</p>";
    return;
  }

  produits.forEach(produit => {
    let stockTexte = produit.stock > 0 ? "Disponible" : "Rupture de stock";

    zone.innerHTML += `
      <div class="carte-produit">
        <img src="${produit.photo || 'https://via.placeholder.com/300x200?text=Produit'}" alt="${produit.nom}">
        <h3>${produit.nom}</h3>
        <p>${produit.categorie}</p>
        <p><strong>${formatPrix(produit.prix)}</strong></p>
        <p>Stock : ${stockTexte}</p>
        <button class="btn-acheter" onclick="vendreProduit(${produit.id})">
          Acheter
        </button>
      </div>
    `;
  });
}

function afficherAdmin() {
  let zone = document.getElementById("listeAdmin");
  if (!zone) return;

  zone.innerHTML = "";

  if (produits.length === 0) {
    zone.innerHTML = "<p>Aucun produit enregistré.</p>";
    return;
  }

  produits.forEach(produit => {
    zone.innerHTML += `
      <div class="produit-admin">
        <div class="produit-info">
          <strong>${produit.nom}</strong><br>
          Catégorie : ${produit.categorie}<br>
          Stock : ${produit.stock}<br>
          Prix : ${formatPrix(produit.prix)}<br><br>

          <button class="btn-small btn-vendre" onclick="vendreProduit(${produit.id})">Vendre</button>
          <button class="btn-small" onclick="ajouterStock(${produit.id})">+ Stock</button>
          <button class="btn-small btn-delete" onclick="supprimerProduit(${produit.id})">Supprimer</button>
        </div>

        <img src="${produit.photo || 'https://via.placeholder.com/100'}" alt="${produit.nom}">
      </div>
    `;
  });
}

async function vendreProduit(id) {
  let produit = produits.find(p => p.id === id);

  if (!produit) {
    alert("Produit introuvable.");
    return;
  }

  if (produit.stock <= 0) {
    alert("Ce produit est en rupture de stock.");
    return;
  }

  await updateDoc(doc(db, "produits", produit.firestoreId), {
    stock: Number(produit.stock) - 1
  });

  let vente = {
    id: Date.now(),
    produit: produit.nom,
    prix: Number(produit.prix || 0),
    prixAchat: Number(produit.prixAchat || 0),
    benefice: Number(produit.prix || 0) - Number(produit.prixAchat || 0),
    date: new Date().toLocaleString("fr-FR"),
    jour: new Date().toLocaleDateString("fr-FR")
  };

  ventes.unshift(vente);
  sauvegarderVentes();

  afficherVentes();
  afficherStats();

  alert("Vente enregistrée.");
}

async function ajouterStock(id) {
  let produit = produits.find(p => p.id === id);

  if (!produit) {
    alert("Produit introuvable.");
    return;
  }

  let quantite = Number(prompt("Quantité à ajouter :", "1"));

  if (!quantite || quantite <= 0) {
    alert("Quantité incorrecte.");
    return;
  }

  await updateDoc(doc(db, "produits", produit.firestoreId), {
    stock: Number(produit.stock) + quantite
  });

  alert("Stock ajouté.");
}

async function supprimerProduit(id) {
  let produit = produits.find(p => p.id === id);

  if (!produit) {
    alert("Produit introuvable.");
    return;
  }

  let confirmation = confirm("Voulez-vous supprimer ce produit ?");

  if (!confirmation) return;

  await deleteDoc(doc(db, "produits", produit.firestoreId));

  alert("Produit supprimé.");
}

function sauvegarderVentes() {
  localStorage.setItem("ventes", JSON.stringify(ventes));
}

function calculerVentesTotal() {
  return ventes.reduce((total, vente) => {
    return total + Number(vente.prix || 0);
  }, 0);
}

function calculerBeneficeTotal() {
  return ventes.reduce((total, vente) => {
    return total + Number(vente.benefice || 0);
  }, 0);
}

function afficherStats() {
  let totalProduits = produits.length;

  let valeurStock = produits.reduce((total, produit) => {
    return total + Number(produit.stock || 0) * Number(produit.prix || 0);
  }, 0);

  let ventesTotal = calculerVentesTotal() - ventesRetirees;
  let beneficeTotal = calculerBeneficeTotal() - beneficeRetire;

  if (ventesTotal < 0) ventesTotal = 0;
  if (beneficeTotal < 0) beneficeTotal = 0;

  if (document.getElementById("totalProduits")) {
    document.getElementById("totalProduits").textContent = totalProduits;
  }

  if (document.getElementById("valeurStock")) {
    document.getElementById("valeurStock").textContent = formatPrix(valeurStock);
  }

  if (document.getElementById("totalVentes")) {
    document.getElementById("totalVentes").textContent = formatPrix(ventesTotal);
  }

  if (document.getElementById("beneficeTotal")) {
    document.getElementById("beneficeTotal").textContent = formatPrix(beneficeTotal);
  }
}

function retirerBenefice() {
  let beneficeActuel = calculerBeneficeTotal() - beneficeRetire;

  if (beneficeActuel <= 0) {
    alert("Aucun bénéfice à retirer.");
    return;
  }

  let confirmation = confirm("Retirer le bénéfice actuel ?");

  if (!confirmation) return;

  beneficeRetire += beneficeActuel;
  localStorage.setItem("beneficeRetire", beneficeRetire);

  afficherStats();
}

function resetBenefice() {
  let confirmation = confirm("Remettre le bénéfice total à zéro ?");

  if (!confirmation) return;

  beneficeRetire = calculerBeneficeTotal();
  localStorage.setItem("beneficeRetire", beneficeRetire);

  afficherStats();
}

function retirerVentes() {
  let ventesActuelles = calculerVentesTotal() - ventesRetirees;

  if (ventesActuelles <= 0) {
    alert("Aucune vente à retirer.");
    return;
  }

  let confirmation = confirm("Retirer le total des ventes actuel ?");

  if (!confirmation) return;

  ventesRetirees += ventesActuelles;
  localStorage.setItem("ventesRetirees", ventesRetirees);

  afficherStats();
}

function resetVentes() {
  let confirmation = confirm("Remettre le total des ventes à zéro ?");

  if (!confirmation) return;

  ventesRetirees = calculerVentesTotal();
  localStorage.setItem("ventesRetirees", ventesRetirees);

  afficherStats();
}

function afficherVentes() {
  let zone = document.getElementById("listeVentes");
  if (!zone) return;

  zone.innerHTML = "";

  if (ventes.length === 0) {
    zone.innerHTML = "<p>Aucune vente pour le moment.</p>";
    return;
  }

  ventes.forEach(vente => {
    zone.innerHTML += `
      <div class="vente-item">
        <strong>${vente.produit}</strong><br>
        Prix : ${formatPrix(vente.prix)}<br>
        Bénéfice : ${formatPrix(vente.benefice)}<br>
        Date : ${vente.date}
      </div>
    `;
  });
}

function afficherAlertes() {
  let zone = document.getElementById("listeAlertes");
  if (!zone) return;

  zone.innerHTML = "";

  let produitsStockBas = produits.filter(produit => {
    return Number(produit.stock || 0) <= Number(produit.seuil || 5);
  });

  if (produitsStockBas.length === 0) {
    zone.innerHTML = "<p>Aucune alerte stock.</p>";
  } else {
    produitsStockBas.forEach(produit => {
      zone.innerHTML += `
        <div class="alerte-item">
          <strong>${produit.nom}</strong><br>
          Stock restant : ${produit.stock}
        </div>
      `;
    });
  }

  if (document.getElementById("stockBas")) {
    document.getElementById("stockBas").textContent = produitsStockBas.length;
  }
}

function connexionAdmin() {
  let username = prompt("Nom d'utilisateur admin :");
  let password = prompt("Mot de passe admin :");

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    adminConnecte = true;
    afficherPage("admin");
  } else {
    alert("Identifiants incorrects.");
  }
}

window.ajouterProduit = ajouterProduit;
window.vendreProduit = vendreProduit;
window.ajouterStock = ajouterStock;
window.supprimerProduit = supprimerProduit;
window.afficherPage = afficherPage;
window.connexionAdmin = connexionAdmin;

window.retirerBenefice = retirerBenefice;
window.resetBenefice = resetBenefice;
window.retirerVentes = retirerVentes;
window.resetVentes = resetVentes;
