const postitService = require('../services/postit.service');
const realtimeService = require('../services/realtime.service');

function sanitizeContent(value) {
  return String(value || '').trim().slice(0, 300);
}

function normalizeCoordinate(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.round(parsed));
}

function canEditOrDelete(user, postit) {
  if (!user) {
    return false;
  }

  return user.permissions.isAdmin || user.id === postit.authorId;
}

function getCurrentPermissions(req, res) {
  return req.session.user?.permissions || res.locals.permissions || {
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    isAdmin: false
  };
}

async function list(req, res, next) {
  try {
    const boardSlug = req.params.boardSlug || req.query.board || 'main';
    const boardData = await postitService.listPostits(boardSlug);

    return res.json({
      board: boardData.board,
      postits: boardData.postits,
      user: req.session.user || null,
      permissions: res.locals.permissions
    });
  } catch (error) {
    return next(error);
  }
}

async function add(req, res, next) {
  try {
    const currentUser = req.session.user || null;
    const permissions = getCurrentPermissions(req, res);

    if (!permissions.canCreate) {
      return res.status(403).json({ error: 'Vous ne pouvez pas creer de post-it.' });
    }

    if (!currentUser) {
      return res.status(403).json({ error: 'Vous devez etre connecte pour creer un post-it.' });
    }

    const boardSlug = req.body.boardSlug || 'main';
    const content = sanitizeContent(req.body.content);
    const x = normalizeCoordinate(req.body.x);
    const y = normalizeCoordinate(req.body.y);

    if (!content) {
      return res.status(400).json({ error: 'Le contenu est obligatoire.' });
    }

    const created = await postitService.createPostit({
      boardSlug,
      authorId: currentUser.id,
      content,
      x,
      y
    });

    realtimeService.publish(created.boardSlug, 'postit-created', { postit: created });

    return res.status(201).json({ ok: true, postit: created });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const currentUser = req.session.user || null;
    const permissions = getCurrentPermissions(req, res);
    const postitId = Number(req.body.id);

    if (!Number.isInteger(postitId)) {
      return res.status(400).json({ error: 'Identifiant invalide.' });
    }

    const existing = await postitService.getPostitById(postitId);

    if (!existing) {
      return res.status(404).json({ error: 'Post-it introuvable.' });
    }

    if (!currentUser) {
      return res.status(403).json({ error: 'Vous devez etre connecte pour supprimer un post-it.' });
    }

    if (!canEditOrDelete(currentUser, existing) || !permissions.canDelete) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer ce post-it.' });
    }

    await postitService.deletePostit(postitId);
    realtimeService.publish(existing.boardSlug, 'postit-deleted', { id: postitId });

    return res.json({ ok: true, id: postitId });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const currentUser = req.session.user || null;
    const permissions = getCurrentPermissions(req, res);
    const postitId = Number(req.body.id);
    const content = sanitizeContent(req.body.content);

    if (!Number.isInteger(postitId)) {
      return res.status(400).json({ error: 'Identifiant invalide.' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Le contenu est obligatoire.' });
    }

    const existing = await postitService.getPostitById(postitId);

    if (!existing) {
      return res.status(404).json({ error: 'Post-it introuvable.' });
    }

    if (!currentUser) {
      return res.status(403).json({ error: 'Vous devez etre connecte pour modifier un post-it.' });
    }

    if (!canEditOrDelete(currentUser, existing) || !permissions.canUpdate) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier ce post-it.' });
    }

    const updated = await postitService.updatePostit({
      postitId,
      content,
      bringToFront: true
    });

    realtimeService.publish(updated.boardSlug, 'postit-updated', { postit: updated });

    return res.json({ ok: true, postit: updated });
  } catch (error) {
    return next(error);
  }
}

async function move(req, res, next) {
  try {
    const currentUser = req.session.user || null;
    const permissions = getCurrentPermissions(req, res);
    const postitId = Number(req.body.id);

    if (!Number.isInteger(postitId)) {
      return res.status(400).json({ error: 'Identifiant invalide.' });
    }

    const existing = await postitService.getPostitById(postitId);

    if (!existing) {
      return res.status(404).json({ error: 'Post-it introuvable.' });
    }

    if (!currentUser) {
      return res.status(403).json({ error: 'Vous devez etre connecte pour deplacer un post-it.' });
    }

    if (!canEditOrDelete(currentUser, existing) || !permissions.canUpdate) {
      return res.status(403).json({ error: 'Vous ne pouvez pas deplacer ce post-it.' });
    }

    const updated = await postitService.updatePostit({
      postitId,
      x: normalizeCoordinate(req.body.x),
      y: normalizeCoordinate(req.body.y),
      bringToFront: true
    });

    realtimeService.publish(updated.boardSlug, 'postit-moved', { postit: updated });

    return res.json({ ok: true, postit: updated });
  } catch (error) {
    return next(error);
  }
}

async function events(req, res, next) {
  try {
    const boardSlug = req.params.boardSlug || req.query.board || 'main';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write('event: connected\ndata: {"ok":true}\n\n');

    const unsubscribe = realtimeService.subscribe(boardSlug, res);

    const ping = setInterval(() => {
      res.write('event: ping\ndata: {}\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(ping);
      unsubscribe();
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  events,
  list,
  add,
  move,
  remove,
  update
};