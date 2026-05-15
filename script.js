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

const ADMIN_USERNAME = "Sarifou";
const ADMIN_PASSWORD = "Mouctar";

let produits = [];

let ventes = JSON.parse(localStorage.getItem("ventes")) || [];

function formatPrix(prix) {
  return Number(prix || 0).toLocaleString("fr-FR") + " GNF";
}

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

}

function connexionAdmin() {

  let username = prompt("Nom d'utilisateur admin :");
  let password = prompt("Mot de passe admin :");

  if (
    username === ADMIN_USERNAME &&
    password === ADMIN_PASSWORD
  ) {

    afficherPage("admin");

  } else {

    alert("Identifiants incorrects.");

  }

}

async function ajouterProduit() {

  let nom = document.getElementById("nomProduit").value.trim();
  let categorie = document.getElementById("categorieProduit").value.trim();
  let stock = Number(document.getElementById("stockProduit").value);
  let prixAchat = Number(document.getElementById("prixAchatProduit").value);
  let prix = Number(document.getElementById("prixProduit").value);
  let seuil = Number(document.getElementById("seuilProduit").value);
  let photo = document.getElementById("photoProduit").value.trim();

  if (
    nom === "" ||
    stock <= 0 ||
    prix <= 0
  ) {

    alert("Remplis correctement les champs.");
    return;

  }

  let produit = {

    id: Date.now(),
    nom,
    categorie: categorie || "Autre",
    stock,
    prixAchat: prixAchat || 0,
    prix,
    seuil: seuil || 5,
    photo

  };

  await addDoc(collection(db, "produits"), produit);

  document.getElementById("nomProduit").value = "";
  document.getElementById("categorieProduit").value = "";
  document.getElementById("stockProduit").value = "";
  document.getElementById("prixAchatProduit").value = "";
  document.getElementById("prixProduit").value = "";
  document.getElementById("seuilProduit").value = "";
  document.getElementById("photoProduit").value = "";

  alert("Produit ajouté.");

}

function afficherBoutique() {

  let zone = document.getElementById("listeBoutique");

  if (!zone) return;

  zone.innerHTML = "";

  if (produits.length === 0) {

    zone.innerHTML = "<p>Aucun produit.</p>";
    return;

  }

  produits.forEach(produit => {

    zone.innerHTML += `
    
      <div class="carte-produit">

        <img 
          src="${produit.photo || 'https://via.placeholder.com/300x200'}"
          alt="${produit.nom}"
        >

        <h3>${produit.nom}</h3>

        <p>${produit.categorie}</p>

        <p>
          <strong>${formatPrix(produit.prix)}</strong>
        </p>

        <p>
          Stock : ${produit.stock}
        </p>

        <button
          class="btn-acheter"
          onclick="vendreProduit(${produit.id})"
        >
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

  produits.forEach(produit => {

    zone.innerHTML += `

      <div class="produit-admin">

        <div>

          <strong>${produit.nom}</strong><br>

          Catégorie : ${produit.categorie}<br>

          Stock : ${produit.stock}<br>

          Prix : ${formatPrix(produit.prix)}<br><br>

          <button
            class="btn-small btn-vendre"
            onclick="vendreProduit(${produit.id})"
          >
            Vendre
          </button>

          <button
            class="btn-small"
            onclick="ajouterStock(${produit.id})"
          >
            + Stock
          </button>

          <button
            class="btn-small btn-delete"
            onclick="supprimerProduit(${produit.id})"
          >
            Supprimer
          </button>

        </div>

        <img
          src="${produit.photo || 'https://via.placeholder.com/100'}"
        >

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
    alert("Stock épuisé.");
    return;
  }

  await updateDoc(
    doc(db, "produits", produit.firestoreId),
    {
      stock: produit.stock - 1
    }
  );

  let vente = {

    id: Date.now(),

    produit: produit.nom,

    prix: Number(produit.prix),

    prixAchat: Number(produit.prixAchat || 0),

    benefice:
      Number(produit.prix) -
      Number(produit.prixAchat || 0),

    date: new Date().toLocaleString("fr-FR")

  };

  ventes.unshift(vente);

  localStorage.setItem(
    "ventes",
    JSON.stringify(ventes)
  );

  afficherVentes();
  afficherStats();

  alert("Vente enregistrée.");

}

async function ajouterStock(id) {

  let produit = produits.find(p => p.id === id);

  if (!produit) return;

  let quantite = Number(
    prompt("Quantité à ajouter :", "1")
  );

  if (!quantite || quantite <= 0) {
    alert("Quantité invalide.");
    return;
  }

  await updateDoc(
    doc(db, "produits", produit.firestoreId),
    {
      stock: produit.stock + quantite
    }
  );

}

async function supprimerProduit(id) {

  let produit = produits.find(p => p.id === id);

  if (!produit) return;

  let confirmation = confirm(
    "Supprimer ce produit ?"
  );

  if (!confirmation) return;

  await deleteDoc(
    doc(db, "produits", produit.firestoreId)
  );

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

    return (
      total +
      Number(produit.stock || 0) *
      Number(produit.prix || 0)
    );

  }, 0);

  let ventesTotal = calculerVentesTotal();

  let beneficeTotal = calculerBeneficeTotal();

  beneficeTotal = Math.max(0, beneficeTotal);

  document.getElementById("totalProduits").textContent =
    totalProduits;

  document.getElementById("valeurStock").textContent =
    formatPrix(valeurStock);

  document.getElementById("totalVentes").textContent =
    formatPrix(ventesTotal);

  document.getElementById("beneficeTotal").textContent =
    formatPrix(beneficeTotal);

}

function resetBenefice() {

  let confirmation = confirm(
    "Remettre le bénéfice à zéro ?"
  );

  if (!confirmation) return;

  ventes = ventes.map(vente => ({
    ...vente,
    benefice: 0
  }));

  localStorage.setItem(
    "ventes",
    JSON.stringify(ventes)
  );

  afficherStats();

}

function resetVentes() {

  let confirmation = confirm(
    "Remettre les ventes à zéro ?"
  );

  if (!confirmation) return;

  ventes = [];

  localStorage.removeItem("ventes");

  afficherVentes();
  afficherStats();

}

function afficherVentes() {

  let zone = document.getElementById("listeVentes");

  if (!zone) return;

  zone.innerHTML = "";

  if (ventes.length === 0) {

    zone.innerHTML =
      "<p>Aucune vente enregistrée.</p>";

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

  let alertes = produits.filter(produit => {

    return produit.stock <= produit.seuil;

  });

  document.getElementById("stockBas").textContent =
    alertes.length;

  if (alertes.length === 0) {

    zone.innerHTML =
      "<p>Aucune alerte.</p>";

    return;

  }

  alertes.forEach(produit => {

    zone.innerHTML += `

      <div class="alerte-item">

        <strong>${produit.nom}</strong><br>

        Stock restant : ${produit.stock}

      </div>

    `;

  });

}

window.afficherPage = afficherPage;
window.connexionAdmin = connexionAdmin;

window.ajouterProduit = ajouterProduit;
window.vendreProduit = vendreProduit;
window.ajouterStock = ajouterStock;
window.supprimerProduit = supprimerProduit;

window.resetBenefice = resetBenefice;
window.resetVentes = resetVentes;
