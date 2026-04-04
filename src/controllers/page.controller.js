const postitService = require('../services/postit.service');

async function renderBoard(req, res, next, boardSlug) {
  try {
    const boardData = await postitService.listPostits(boardSlug);

    return res.render('home', {
      title: 'Secure Post-it',
      postits: boardData.postits,
      board: boardData.board
    });
  } catch (error) {
    return next(error);
  }
}

async function home(req, res, next) {
  return renderBoard(req, res, next, 'main');
}

async function board(req, res, next) {
  return renderBoard(req, res, next, req.params.boardSlug);
}

function health(req, res) {
  return res.json({ ok: true });
}

module.exports = {
  board,
  home,
  health
};