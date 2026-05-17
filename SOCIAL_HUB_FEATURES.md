# 🌐 Social Hub — Réseau Social Simplifié

## Vue d'ensemble

Le **Social Hub** est un système de réseau social centralisé et toujours accessible qui remplace l'ancienne sidebar dispersée. Il offre un accès rapide à toutes les fonctionnalités sociales via un bouton flottant (FAB) présent sur tous les écrans.

---

## ✨ Fonctionnalités principales

### 1. **Bouton Flottant (FAB)**
- **Position** : Coin inférieur droit (configurable)
- **Toujours visible** : Sur tous les écrans du jeu (home, lobby, partie)
- **Badge de notifications** : Affiche le nombre total de notifications non lues
  - Demandes d'amis
  - Invitations de jeu
  - Messages non lus
- **Animation pulsante** : Attire l'attention quand il y a des notifications
- **Rotation fluide** : Icône Users → X lors de l'ouverture

### 2. **Panneau Latéral Complet**
Un panneau slide-in depuis la droite avec 4 onglets :

#### 📋 **Onglet "Amis"**
- Liste de tous vos amis avec statut en temps réel
- Indicateur visuel : vert (en ligne), gris (hors ligne)
- Badge "En partie" si l'ami est dans un lobby
- **Actions rapides par ami** :
  - 💬 **Message** : Ouvre la conversation (badge si messages non lus)
  - ▶️ **Rejoindre** : Si l'ami est en partie (visible uniquement si applicable)
  - 📤 **Inviter** : Si vous êtes en lobby et l'ami est en ligne
- **Ajouter un ami** : Champ de saisie + bouton d'envoi intégré en haut

#### 💬 **Onglet "Messages"**
- Liste de toutes les conversations avec vos amis
- Badge de messages non lus par conversation
- Clic sur une conversation → Ouvre le dialogue de messagerie
- Vide si aucun ami

#### 👥 **Onglet "Demandes"**
- Demandes d'amis en attente (reçues)
- Avatar + nom du demandeur
- Boutons **Accepter** (vert) / **Refuser** (rouge)
- Badge sur l'onglet si demandes en attente

#### 📧 **Onglet "Invitations"**
- Invitations de jeu reçues
- Nom de l'expéditeur + "vous invite à jouer"
- Boutons **Accepter** (rejoint automatiquement) / **Refuser**
- Badge sur l'onglet si invitations en attente

### 3. **Code Ami Toujours Visible**
- Affiché en haut de tous les onglets
- **Copie en un clic** : Cliquez sur le code pour le copier
- Feedback visuel : Icône Check verte + toast de confirmation
- Police monospace, tracking large, style premium

### 4. **Messagerie Directe**
- Dialogue modal élégant (déjà existant, réutilisé)
- Historique des messages
- Envoi en temps réel
- Marque automatiquement les messages comme lus à l'ouverture

---

## 🎨 Design & UX

### Principes de design
- **Toujours accessible** : FAB visible partout, jamais caché
- **Notifications claires** : Badges numériques sur le FAB et les onglets
- **Actions contextuelles** : Boutons adaptés au statut de l'ami (en ligne, en partie, etc.)
- **Feedback immédiat** : Sons, animations, toasts pour chaque action
- **Style Ink cohérent** : Noir/rouge, police Caveat, bordures primary

### Animations
- **FAB** : Pulse quand notifications, rotation à l'ouverture
- **Panneau** : Slide-in depuis la droite (spring animation)
- **Onglets** : Indicateur animé sous l'onglet actif (layoutId)
- **Listes** : Hover → décalage horizontal (whileHover x: 3)
- **Boutons** : Scale 1.1 au hover, 0.9 au tap

### Sons
- `brushTap` : Clic sur onglet, bouton secondaire
- `inkSuccess` : Acceptation, copie de code, envoi réussi
- `inkClick` : Refus, fermeture

---

## 🔧 Intégration technique

### Composants créés
1. **`SocialHub.tsx`** : FAB + logique d'ouverture/fermeture
2. **`SocialHubPanel.tsx`** : Panneau latéral avec onglets et contenu

### Hooks utilisés
- `useAuth()` : User, profile, friendCode
- `useFriends()` : Liste amis, demandes, actions (accept/reject)
- `useOnlinePresence()` : Statut en ligne + lobby des amis
- `useGameInvitations()` : Invitations de jeu
- `useUnreadCounts()` : Compteur de messages non lus par ami
- `useDirectMessages()` : Messagerie (dans le dialogue)

### Props du SocialHub
```tsx
interface SocialHubProps {
  currentLobbyCode?: string;      // Code du lobby actuel (pour inviter)
  onJoinFriend?: (lobbyCode: string) => void;  // Callback pour rejoindre un ami
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}
```

### Intégration dans Index.tsx
```tsx
<SocialHub
  currentLobbyCode={lobby?.code}
  onJoinFriend={(lobbyCode) => {
    const storedName = localStorage.getItem('playerName') || profile?.display_name || `Joueur${Math.floor(Math.random() * 1000)}`;
    handleJoinGame(storedName, lobbyCode);
  }}
/>
```

---

## 📊 Avantages vs ancienne sidebar

| Ancienne sidebar | Nouveau Social Hub |
|------------------|-------------------|
| Visible uniquement sur home | **Toujours accessible** |
| Pas de badge de notifications | **Badge total sur FAB** |
| Pas d'onglets, tout mélangé | **4 onglets organisés** |
| Actions dispersées | **Actions contextuelles groupées** |
| Pas de vue "Messages" dédiée | **Onglet Messages avec badges** |
| Code ami en bas | **Code ami toujours en haut** |
| Scroll difficile sur petits écrans | **Panneau pleine hauteur optimisé** |

---

## 🚀 Utilisation

### Pour l'utilisateur
1. **Cliquez sur le bouton flottant** (icône Users) en bas à droite
2. **Naviguez entre les onglets** pour voir amis, messages, demandes, invitations
3. **Copiez votre code ami** en cliquant dessus (en haut du panneau)
4. **Ajoutez un ami** en entrant son code dans l'onglet "Amis"
5. **Envoyez un message** en cliquant sur l'icône 💬 d'un ami
6. **Rejoignez un ami** en cliquant sur ▶️ s'il est en partie
7. **Invitez un ami** en cliquant sur 📤 si vous êtes en lobby

### Pour le développeur
- Le SocialHub est monté dans `Index.tsx` au niveau racine
- Il est visible sur tous les écrans (home, lobby, partie)
- Les notifications sont calculées automatiquement via les hooks
- Le panneau se ferme automatiquement après avoir rejoint un ami

---

## 🎯 Prochaines améliorations possibles

- [ ] Recherche d'amis par nom
- [ ] Groupes d'amis / favoris
- [ ] Historique des parties jouées ensemble
- [ ] Statistiques par ami (victoires, défaites)
- [ ] Émojis / réactions dans les messages
- [ ] Notifications push (si PWA)
- [ ] Bloquer / débloquer un ami
- [ ] Statut personnalisé ("Absent", "Ne pas déranger")

---

## 📝 Notes techniques

### Z-index
- FAB : `z-[60]`
- Backdrop : `z-[55]`
- Panneau : `z-[56]`

### Responsive
- Panneau : `max-w-md` (adapté mobile)
- Labels onglets : cachés sur petits écrans (`hidden sm:inline`)
- ScrollArea : hauteur max 200px pour la liste d'amis

### Performance
- Composants mémorisés avec `memo()`
- Hooks optimisés avec `useCallback()`
- Realtime Supabase pour les mises à jour instantanées

---

**Créé le** : 17 mai 2026  
**Version** : 1.3.0  
**Auteur** : Kiro AI Assistant
