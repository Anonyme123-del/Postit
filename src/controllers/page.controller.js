const postitService = require('../services/postit.service');

async function renderBoard(req, res, boardSlug) {
  const boardData = await postitService.listPostits(boardSlug);

  res.render('home', {
    title: 'Secure Post-it',
    postits: boardData.postits,
    board: boardData.board
  });
}

async function home(req, res) {
  await renderBoard(req, res, 'main');
}

async function board(req, res) {
  await renderBoard(req, res, req.params.boardSlug);
}

function health(req, res) {
  res.json({ ok: true });
}

module.exports = {
  board,
  home,
  health
};