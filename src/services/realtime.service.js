const channels = new Map();

function getChannel(boardSlug) {
  const slug = String(boardSlug || 'main').toLowerCase();
  if (!channels.has(slug)) {
    channels.set(slug, new Set());
  }

  return channels.get(slug);
}

function subscribe(boardSlug, response) {
  const channel = getChannel(boardSlug);
  channel.add(response);

  return () => {
    channel.delete(response);
  };
}

function publish(boardSlug, eventName, payload) {
  const channel = getChannel(boardSlug);
  const body = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;

  channel.forEach((response) => {
    response.write(body);
  });
}

module.exports = {
  publish,
  subscribe
};