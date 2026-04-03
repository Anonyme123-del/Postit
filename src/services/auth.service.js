const bcrypt = require('bcrypt');
const env = require('../config/env');
const userModel = require('../models/userModel');

function normalizePermissions(row) {
  return {
    canCreate: Boolean(row?.can_create),
    canUpdate: Boolean(row?.can_update),
    canDelete: Boolean(row?.can_delete),
    isAdmin: Boolean(row?.is_admin)
  };
}

function validateUsername(username) {
  const cleanUsername = String(username || '').trim().toLowerCase();

  if (!cleanUsername) {
    throw new Error("Nom d'utilisateur requis.");
  }

  if (cleanUsername.length < 3) {
    throw new Error("Le nom d'utilisateur doit contenir au moins 3 caractères.");
  }

  if (cleanUsername.length > 50) {
    throw new Error("Le nom d'utilisateur est trop long.");
  }

  if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
    throw new Error("Le nom d'utilisateur contient des caractères non autorisés.");
  }

  if (['guest', 'admin', 'root', 'system'].includes(cleanUsername)) {
    throw new Error("Ce nom d'utilisateur est réservé.");
  }

  return cleanUsername;
}

function validatePassword(password) {
  const cleanPassword = String(password || '');

  if (!cleanPassword) {
    throw new Error('Mot de passe requis.');
  }

  if (cleanPassword.length < 12) {
    throw new Error('Le mot de passe doit contenir au moins 12 caractères.');
  }

  if (cleanPassword.length > 100) {
    throw new Error('Le mot de passe est trop long.');
  }

  if (!/[a-z]/.test(cleanPassword)) {
    throw new Error('Le mot de passe doit contenir au moins une lettre minuscule.');
  }

  if (!/[A-Z]/.test(cleanPassword)) {
    throw new Error('Le mot de passe doit contenir au moins une lettre majuscule.');
  }

  if (!/[0-9]/.test(cleanPassword)) {
    throw new Error('Le mot de passe doit contenir au moins un chiffre.');
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\];\'`~]/.test(cleanPassword)) {
    throw new Error('Le mot de passe doit contenir au moins un caractère spécial.');
  }

  return cleanPassword;
}

async function registerUser(username, password) {
  const cleanUsername = validateUsername(username);
  const cleanPassword = validatePassword(password);

  const existingUser = await userModel.findByUsername(cleanUsername);
  if (existingUser) {
    throw new Error("Nom d'utilisateur déjà pris.");
  }

  const passwordHash = await bcrypt.hash(cleanPassword, env.bcryptRounds);
  const insertedUser = await userModel.createUser(cleanUsername, passwordHash);

  await userModel.createDefaultPermissions(insertedUser.lastID);

  return {
    id: insertedUser.lastID,
    username: cleanUsername,
    permissions: {
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      isAdmin: false
    }
  };
}

async function loginUser(username, password) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  console.log('LOGIN username reçu =', cleanUsername);

  if (!cleanUsername || !cleanPassword) {
    throw new Error('Identifiants invalides.');
  }

  const user = await userModel.findUserWithPermissionsByUsername(cleanUsername);
  console.log('USER trouvé =', user);

  if (!user) {
    throw new Error('Identifiants invalides.');
  }

  const passwordMatches = await bcrypt.compare(cleanPassword, user.password_hash);
  console.log('PASSWORD MATCHES =', passwordMatches);

  if (!passwordMatches) {
    throw new Error('Identifiants invalides.');
  }

  return {
    id: user.id,
    username: user.username,
    permissions: normalizePermissions(user)
  };
}

module.exports = {
  registerUser,
  loginUser
};