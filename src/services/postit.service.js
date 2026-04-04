const { all, get, run } = require('../db/sqlite');

function mapPostitRow(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    boardSlug: row.board_slug,
    authorId: row.author_id,
    authorUsername: row.author_username,
    content: row.content,
    x: row.pos_x,
    y: row.pos_y,
    zIndex: row.z_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeBoardSlug(slug) {
  const safeSlug = String(slug || 'main').trim().toLowerCase();

  if (!safeSlug) {
    return 'main';
  }

  return safeSlug;
}

function isValidBoardSlug(slug) {
  return /^[a-z0-9_-]+$/.test(slug);
}

function normalizeCoordinate(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.round(parsed));
}

async function getBoardBySlug(slug) {
  const safeSlug = normalizeBoardSlug(slug);

  return get(
    'SELECT id, slug, title, created_at FROM boards WHERE slug = ?',
    [safeSlug]
  );
}

async function getBoardById(boardId) {
  const numericBoardId = Number(boardId);

  if (!Number.isInteger(numericBoardId)) {
    return null;
  }

  return get(
    'SELECT id, slug, title, created_at FROM boards WHERE id = ?',
    [numericBoardId]
  );
}

async function getOrCreateBoard(slug) {
  const safeSlug = normalizeBoardSlug(slug);

  if (!isValidBoardSlug(safeSlug)) {
    throw new Error('Slug de tableau invalide.');
  }

  let board = await getBoardBySlug(safeSlug);

  if (!board) {
    const title = safeSlug === 'main' ? 'Tableau principal' : `Tableau ${safeSlug}`;
    const created = await run(
      'INSERT INTO boards (slug, title) VALUES (?, ?)',
      [safeSlug, title]
    );

    board = {
      id: created.lastID,
      slug: safeSlug,
      title,
      created_at: null
    };
  }

  return board;
}

async function listBoards() {
  return all(
    `SELECT b.id, b.slug, b.title, b.created_at,
            COUNT(p.id) AS postit_count
     FROM boards b
     LEFT JOIN postits p ON p.board_id = b.id
     GROUP BY b.id, b.slug, b.title, b.created_at
     ORDER BY b.slug ASC`
  );
}

async function createBoard(slug, title) {
  const safeSlug = normalizeBoardSlug(slug);

  if (!safeSlug || !isValidBoardSlug(safeSlug)) {
    throw new Error('Slug invalide. Utilise seulement lettres, chiffres, _ ou -.');
  }

  const existing = await getBoardBySlug(safeSlug);

  if (existing) {
    throw new Error('Ce tableau existe deja.');
  }

  const cleanTitle = String(title || '').trim() || `Tableau ${safeSlug}`;

  const inserted = await run(
    'INSERT INTO boards (slug, title) VALUES (?, ?)',
    [safeSlug, cleanTitle]
  );

  return get(
    'SELECT id, slug, title, created_at FROM boards WHERE id = ?',
    [inserted.lastID]
  );
}

async function deleteBoardById(boardId) {
  const numericBoardId = Number(boardId);

  if (!Number.isInteger(numericBoardId)) {
    throw new Error('Identifiant de tableau invalide.');
  }

  const existing = await getBoardById(numericBoardId);

  if (!existing) {
    throw new Error('Tableau introuvable.');
  }

  return run('DELETE FROM boards WHERE id = ?', [numericBoardId]);
}

async function listPostits(boardSlug) {
  const board = await getOrCreateBoard(boardSlug);

  const rows = await all(
    `SELECT p.id, p.board_id, b.slug AS board_slug, p.author_id, u.username AS author_username,
            p.content, p.pos_x, p.pos_y, p.z_index, p.created_at, p.updated_at
     FROM postits p
     JOIN users u ON u.id = p.author_id
     JOIN boards b ON b.id = p.board_id
     WHERE p.board_id = ?
     ORDER BY p.z_index ASC, p.created_at ASC`,
    [board.id]
  );

  return {
    board,
    postits: rows.map(mapPostitRow)
  };
}

async function getPostitById(postitId) {
  const numericPostitId = Number(postitId);

  if (!Number.isInteger(numericPostitId)) {
    return null;
  }

  const row = await get(
    `SELECT p.id, p.board_id, b.slug AS board_slug, p.author_id, u.username AS author_username,
            p.content, p.pos_x, p.pos_y, p.z_index, p.created_at, p.updated_at
     FROM postits p
     JOIN users u ON u.id = p.author_id
     JOIN boards b ON b.id = p.board_id
     WHERE p.id = ?`,
    [numericPostitId]
  );

  return row ? mapPostitRow(row) : null;
}

async function getNextZIndex(boardId) {
  const numericBoardId = Number(boardId);

  if (!Number.isInteger(numericBoardId)) {
    throw new Error('Identifiant de tableau invalide.');
  }

  const row = await get(
    'SELECT COALESCE(MAX(z_index), 0) AS max_z FROM postits WHERE board_id = ?',
    [numericBoardId]
  );

  return Number(row?.max_z || 0) + 1;
}

async function createPostit({ boardSlug, authorId, content, x, y }) {
  const numericAuthorId = Number(authorId);

  if (!Number.isInteger(numericAuthorId)) {
    throw new Error('Auteur invalide.');
  }

  const cleanContent = String(content || '').trim();

  if (!cleanContent) {
    throw new Error('Le contenu du post-it est obligatoire.');
  }

  const board = await getOrCreateBoard(boardSlug);
  const zIndex = await getNextZIndex(board.id);

  const inserted = await run(
    `INSERT INTO postits (board_id, author_id, content, pos_x, pos_y, z_index)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      board.id,
      numericAuthorId,
      cleanContent,
      normalizeCoordinate(x),
      normalizeCoordinate(y),
      zIndex
    ]
  );

  return getPostitById(inserted.lastID);
}

async function updatePostit({ postitId, content, x, y, bringToFront }) {
  const postit = await getPostitById(postitId);

  if (!postit) {
    return null;
  }

  const newContent =
    content === undefined ? postit.content : String(content || '').trim();

  const newX =
    x === undefined ? postit.x : normalizeCoordinate(x);

  const newY =
    y === undefined ? postit.y : normalizeCoordinate(y);

  let newZ = postit.zIndex;

  if (bringToFront) {
    newZ = await getNextZIndex(postit.boardId);
  }

  await run(
    `UPDATE postits
     SET content = ?, pos_x = ?, pos_y = ?, z_index = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [newContent, newX, newY, newZ, postit.id]
  );

  return getPostitById(postit.id);
}

async function deletePostit(postitId) {
  const numericPostitId = Number(postitId);

  if (!Number.isInteger(numericPostitId)) {
    throw new Error('Identifiant de post-it invalide.');
  }

  const existing = await getPostitById(numericPostitId);

  if (!existing) {
    throw new Error('Post-it introuvable.');
  }

  return run('DELETE FROM postits WHERE id = ?', [numericPostitId]);
}

module.exports = {
  createBoard,
  createPostit,
  deleteBoardById,
  deletePostit,
  getBoardById,
  getBoardBySlug,
  getOrCreateBoard,
  getPostitById,
  listBoards,
  listPostits,
  updatePostit
};