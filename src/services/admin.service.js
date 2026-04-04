const userModel = require('../models/userModel');

function normalizePermissions(row) {
  return {
    canCreate: Boolean(row?.can_create),
    canUpdate: Boolean(row?.can_update),
    canDelete: Boolean(row?.can_delete),
    isAdmin: Boolean(row?.is_admin)
  };
}

async function listUsersWithPermissions() {
  const users = await userModel.findAllUsersWithPermissions();

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    createdAt: user.created_at,
    permissions: normalizePermissions(user)
  }));
}

async function updateUserPermissions(targetUserId, actingUserId, body) {
  const targetId = Number(targetUserId);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    throw new Error('Utilisateur cible invalide.');
  }

  const targetUser = await userModel.findUserWithPermissionsById(targetId);
  if (!targetUser) {
    throw new Error('Utilisateur introuvable.');
  }

  const permissions = {
    canCreate: body.can_create === 'on',
    canUpdate: body.can_update === 'on',
    canDelete: body.can_delete === 'on',
    isAdmin: body.is_admin === 'on'
  };

  if (targetId === actingUserId && !permissions.isAdmin) {
    throw new Error("Vous ne pouvez pas retirer votre propre droit d'administration.");
  }

  await userModel.updatePermissions(targetId, permissions);

  return {
    id: targetUser.id,
    username: targetUser.username,
    permissions
  };
}

module.exports = {
  listUsersWithPermissions,
  updateUserPermissions
};