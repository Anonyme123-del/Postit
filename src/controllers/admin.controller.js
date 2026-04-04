const authService = require('../services/auth.service');
const postitService = require('../services/postit.service');

async function dashboard(req, res, next) {
  try {
    const [users, boards] = await Promise.all([
      authService.listUsersWithPermissions(),
      postitService.listBoards()
    ]);

    return res.render('admin', {
      title: 'Administration',
      users,
      boards
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePermissions(req, res, next) {
  try {
    const userId = Number(req.body.userId);

    if (!Number.isInteger(userId)) {
      req.session.notice = 'Utilisateur invalide.';
      return res.redirect('/admin');
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
    return res.redirect('/admin');
  } catch (error) {
    return next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      req.session.notice = 'Nom d utilisateur et mot de passe obligatoires.';
      return res.redirect('/admin');
    }

    await authService.createUser(username, password);

    req.session.notice = `Utilisateur ${username} cree.`;
    return res.redirect('/admin');
  } catch (error) {
    if (error.name === 'ValidationError') {
      req.session.notice = Array.isArray(error.messages)
        ? error.messages.join(' ')
        : error.message;
      return res.redirect('/admin');
    }

    req.session.notice = error.message || 'Erreur lors de la creation de l utilisateur.';
    return res.redirect('/admin');
  }
}

async function deleteUser(req, res, next) {
  try {
    const userId = Number(req.body.userId);

    if (!Number.isInteger(userId)) {
      req.session.notice = 'Utilisateur invalide.';
      return res.redirect('/admin');
    }

    const users = await authService.listUsersWithPermissions();
    const targetUser = users.find((user) => user.id === userId);

    if (!targetUser) {
      req.session.notice = 'Utilisateur introuvable.';
      return res.redirect('/admin');
    }

    if (targetUser.username === 'guest') {
      req.session.notice = 'Le compte guest est protege.';
      return res.redirect('/admin');
    }

    if (req.session.user?.id === userId) {
      req.session.notice = 'Tu ne peux pas supprimer ton propre compte.';
      return res.redirect('/admin');
    }

    await authService.deleteUserById(userId);

    req.session.notice = `Utilisateur ${targetUser.username} supprime.`;
    return res.redirect('/admin');
  } catch (error) {
    return next(error);
  }
}

async function createBoard(req, res, next) {
  try {
    const slug = String(req.body.slug || '').trim().toLowerCase();
    const title = String(req.body.title || '').trim();

    await postitService.createBoard(slug, title);

    req.session.notice = `Tableau ${slug} cree.`;
    return res.redirect('/admin');
  } catch (error) {
    req.session.notice = error.message || 'Erreur lors de la creation du tableau.';
    return res.redirect('/admin');
  }
}

async function deleteBoard(req, res, next) {
  try {
    const boardId = Number(req.body.boardId);

    if (!Number.isInteger(boardId)) {
      req.session.notice = 'Tableau invalide.';
      return res.redirect('/admin');
    }

    const boards = await postitService.listBoards();
    const targetBoard = boards.find((board) => board.id === boardId);

    if (!targetBoard) {
      req.session.notice = 'Tableau introuvable.';
      return res.redirect('/admin');
    }

    if (targetBoard.slug === 'main') {
      req.session.notice = 'Le tableau principal ne peut pas etre supprime.';
      return res.redirect('/admin');
    }

    await postitService.deleteBoardById(boardId);

    req.session.notice = `Tableau ${targetBoard.slug} supprime.`;
    return res.redirect('/admin');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  dashboard,
  createBoard,
  createUser,
  deleteBoard,
  deleteUser,
  updatePermissions
};