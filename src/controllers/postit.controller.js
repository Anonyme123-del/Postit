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

async function list(req, res) {
  const boardSlug = req.params.boardSlug || req.query.board || 'main';
  const boardData = await postitService.listPostits(boardSlug);

  res.json({
    board: boardData.board,
    postits: boardData.postits,
    user: req.session.user || null,
    permissions: res.locals.permissions
  });
}

async function add(req, res) {
  const currentUser = req.session.user;
  if (!currentUser.permissions.canCreate) {
    res.status(403).json({ error: 'Vous ne pouvez pas creer de post-it.' });
    return;
  }

  const boardSlug = req.body.boardSlug || 'main';
  const content = sanitizeContent(req.body.content);
  const x = normalizeCoordinate(req.body.x);
  const y = normalizeCoordinate(req.body.y);

  if (!content) {
    res.status(400).json({ error: 'Le contenu est obligatoire.' });
    return;
  }

  const created = await postitService.createPostit({
    boardSlug,
    authorId: currentUser.id,
    content,
    x,
    y
  });

  realtimeService.publish(created.boardSlug, 'postit-created', { postit: created });
  res.status(201).json({ ok: true, postit: created });
}

async function remove(req, res) {
  const postitId = Number(req.body.id);
  if (!Number.isInteger(postitId)) {
    res.status(400).json({ error: 'Identifiant invalide.' });
    return;
  }

  const existing = await postitService.getPostitById(postitId);
  if (!existing) {
    res.status(404).json({ error: 'Post-it introuvable.' });
    return;
  }

  if (!canEditOrDelete(req.session.user, existing) || !req.session.user.permissions.canDelete) {
    res.status(403).json({ error: 'Vous ne pouvez pas supprimer ce post-it.' });
    return;
  }

  await postitService.deletePostit(postitId);
  realtimeService.publish(existing.boardSlug, 'postit-deleted', { id: postitId });
  res.json({ ok: true, id: postitId });
}

async function update(req, res) {
  const postitId = Number(req.body.id);
  const content = sanitizeContent(req.body.content);

  if (!Number.isInteger(postitId)) {
    res.status(400).json({ error: 'Identifiant invalide.' });
    return;
  }

  if (!content) {
    res.status(400).json({ error: 'Le contenu est obligatoire.' });
    return;
  }

  const existing = await postitService.getPostitById(postitId);
  if (!existing) {
    res.status(404).json({ error: 'Post-it introuvable.' });
    return;
  }

  if (!canEditOrDelete(req.session.user, existing) || !req.session.user.permissions.canUpdate) {
    res.status(403).json({ error: 'Vous ne pouvez pas modifier ce post-it.' });
    return;
  }

  const updated = await postitService.updatePostit({
    postitId,
    content,
    bringToFront: true
  });

  realtimeService.publish(updated.boardSlug, 'postit-updated', { postit: updated });
  res.json({ ok: true, postit: updated });
}

async function move(req, res) {
  const postitId = Number(req.body.id);
  if (!Number.isInteger(postitId)) {
    res.status(400).json({ error: 'Identifiant invalide.' });
    return;
  }

  const existing = await postitService.getPostitById(postitId);
  if (!existing) {
    res.status(404).json({ error: 'Post-it introuvable.' });
    return;
  }

  if (!canEditOrDelete(req.session.user, existing) || !req.session.user.permissions.canUpdate) {
    res.status(403).json({ error: 'Vous ne pouvez pas deplacer ce post-it.' });
    return;
  }

  const updated = await postitService.updatePostit({
    postitId,
    x: normalizeCoordinate(req.body.x),
    y: normalizeCoordinate(req.body.y),
    bringToFront: true
  });

  realtimeService.publish(updated.boardSlug, 'postit-moved', { postit: updated });
  res.json({ ok: true, postit: updated });
}

async function events(req, res) {
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
}

module.exports = {
  events,
  list,
  add,
  move,
  remove,
  update
};