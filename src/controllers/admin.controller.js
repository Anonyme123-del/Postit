const authService = require('../services/auth.service');
const postitService = require('../services/postit.service');

async function dashboard(req, res) {
  const [users, boards] = await Promise.all([
    authService.listUsersWithPermissions(),
    postitService.listBoards()
  ]);

  res.render('admin', {
    title: 'Administration',
    users,
    boards
  });
}

async function updatePermissions(req, res) {
  const userId = Number(req.body.userId);

  if (!Number.isInteger(userId)) {
    req.session.notice = 'Utilisateur invalide.';
    res.redirect('/admin');
    return;
  }

  const permissions = {
    canCreate: req.body.canCreate === 'on',
    canUpdate: req.body.canUpdate === 'on',
    canDelete: req.body.canDelete === 'on',
    isAdmin: req.body.isAdmin === 'on'
  };

  await authService.updatePermissions(userId, permissions);

  if (req.session.user?.id === userId) {
    const freshSessionUser = await authService.getSessionUser(userId);
    req.session.user = freshSessionUser;
  }

  req.session.notice = 'Permissions mises a jour.';
  res.redirect('/admin');
}

async function createUser(req, res) {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      req.session.notice = 'Nom d utilisateur et mot de passe obligatoires.';
      res.redirect('/admin');
      return;
    }

    await authService.createUser(username, password);
    req.session.notice = `Utilisateur ${username} cree.`;
    res.redirect('/admin');
  } catch (error) {
    req.session.notice = error.message;
    res.redirect('/admin');
  }
}

async function deleteUser(req, res) {
  const userId = Number(req.body.userId);

  if (!Number.isInteger(userId)) {
    req.session.notice = 'Utilisateur invalide.';
    res.redirect('/admin');
    return;
  }

  const users = await authService.listUsersWithPermissions();
  const targetUser = users.find((user) => user.id === userId);

  if (!targetUser) {
    req.session.notice = 'Utilisateur introuvable.';
    res.redirect('/admin');
    return;
  }

  if (targetUser.username === 'guest') {
    req.session.notice = 'Le compte guest est protege.';
    res.redirect('/admin');
    return;
  }

  if (req.session.user?.id === userId) {
    req.session.notice = 'Tu ne peux pas supprimer ton propre compte.';
    res.redirect('/admin');
    return;
  }

  await authService.deleteUserById(userId);
  req.session.notice = `Utilisateur ${targetUser.username} supprime.`;
  res.redirect('/admin');
}

async function createBoard(req, res) {
  try {
    const slug = String(req.body.slug || '').trim().toLowerCase();
    const title = String(req.body.title || '').trim();

    await postitService.createBoard(slug, title);
    req.session.notice = `Tableau ${slug} cree.`;
    res.redirect('/admin');
  } catch (error) {
    req.session.notice = error.message;
    res.redirect('/admin');
  }
}

async function deleteBoard(req, res) {
  const boardId = Number(req.body.boardId);
  if (!Number.isInteger(boardId)) {
    req.session.notice = 'Tableau invalide.';
    res.redirect('/admin');
    return;
  }

  const boards = await postitService.listBoards();
  const targetBoard = boards.find((board) => board.id === boardId);
  if (!targetBoard) {
    req.session.notice = 'Tableau introuvable.';
    res.redirect('/admin');
    return;
  }

  if (targetBoard.slug === 'main') {
    req.session.notice = 'Le tableau principal ne peut pas etre supprime.';
    res.redirect('/admin');
    return;
  }

  await postitService.deleteBoardById(boardId);
  req.session.notice = `Tableau ${targetBoard.slug} supprime.`;
  res.redirect('/admin');
}

module.exports = {
  dashboard,
  createBoard,
  createUser,
  deleteBoard,
  deleteUser,
  updatePermissions
};