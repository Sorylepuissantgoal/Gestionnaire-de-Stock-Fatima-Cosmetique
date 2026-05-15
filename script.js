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
    stock: produit.stock - 1
  });

  let vente = {
    id: Date.now(),
    produit: produit.nom,
    prix: Number(produit.prix),
    prixAchat: Number(produit.prixAchat || 0),
    benefice: Number(produit.prix) - Number(produit.prixAchat || 0),
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
    stock: produit.stock + quantite
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

  let alertes = produits.filter(p => Number(p.stock) <= Number(p.seuil));

  if (alertes.length === 0) {
    zone.innerHTML = "<p>Aucune alerte stock.</p>";
    return;
  }

  alertes.forEach(produit => {
    zone.innerHTML += `
      <div class="alert-item">
        <strong>${produit.nom}</strong><br>
        Stock actuel : ${produit.stock}<br>
        Seuil minimum : ${produit.seuil}<br>
        Pensez à réapprovisionner.
      </div>
    `;
  });
}

function afficherStats() {
  if (!document.getElementById("totalProduits")) return;

  let totalProduits = produits.length;
  let valeurStock = produits.reduce((total, p) => total + Number(p.stock || 0) * Number(p.prix || 0), 0);

  let totalVentesBrut = ventes.reduce((total, v) => total + Number(v.prix || 0), 0);
  let totalVentes = totalVentesBrut - ventesRetirees;

  let totalAlertes = produits.filter(p => Number(p.stock) <= Number(p.seuil)).length;

  let beneficeTotalBrut = ventes.reduce((total, v) => total + Number(v.benefice || 0), 0);
  let beneficeTotal = beneficeTotalBrut - beneficeRetire;

  document.getElementById("totalProduits").textContent = totalProduits;
  document.getElementById("valeurStock").textContent = formatPrix(valeurStock);
  document.getElementById("totalVentes").textContent = formatPrix(totalVentes);
  document.getElementById("totalAlertes").textContent = totalAlertes;
  document.getElementById("beneficeTotal").textContent = formatPrix(beneficeTotal);
}

function ouvrirConnexionAdmin() {
  if (adminConnecte) {
    afficherPage("admin");
  } else {
    afficherPage("connexionAdmin");
  }
}

function connecterAdmin() {
  let user = document.getElementById("adminUser").value;
  let password = document.getElementById("adminPassword").value;
  let message = document.getElementById("messageLogin");

  if (user === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    adminConnecte = true;
    message.textContent = "";
    afficherPage("admin");
  } else {
    message.textContent = "Nom d'utilisateur ou mot de passe incorrect.";
  }
}

function retirerBenefice() {
  let montant = Number(prompt("Montant à retirer :"));

  if (!montant || montant <= 0) {
    alert("Montant invalide");
    return;
  }

  beneficeRetire += montant;
  localStorage.setItem("beneficeRetire", beneficeRetire);

  afficherStats();
}

function resetBenefice() {
  let confirmation = confirm("Remettre le bénéfice à zéro ?");

  if (confirmation) {
    beneficeRetire = 0;
    localStorage.setItem("beneficeRetire", 0);
    afficherStats();
  }
}

function retirerVentes() {
  let montant = Number(prompt("Montant à retirer des ventes :"));

  if (!montant || montant <= 0) {
    alert("Montant invalide");
    return;
  }

  ventesRetirees += montant;
  localStorage.setItem("ventesRetirees", ventesRetirees);

  afficherStats();
}

function resetVentes() {
  let confirmation = confirm("Remettre le total ventes à zéro ?");

  if (confirmation) {
    ventesRetirees = ventes.reduce((total, v) => total + Number(v.prix || 0), 0);
    localStorage.setItem("ventesRetirees", ventesRetirees);
    afficherStats();
  }
}

window.afficherPage = afficherPage;
window.ouvrirConnexionAdmin = ouvrirConnexionAdmin;
window.connecterAdmin = connecterAdmin;
window.ajouterProduit = ajouterProduit;
window.vendreProduit = vendreProduit;
window.ajouterStock = ajouterStock;
window.supprimerProduit = supprimerProduit;
window.retirerBenefice = retirerBenefice;
window.resetBenefice = resetBenefice;
window.retirerVentes = retirerVentes;
window.resetVentes = resetVentes;

afficherBoutique();
afficherAdmin();
afficherVentes();
afficherAlertes();
afficherStats();
