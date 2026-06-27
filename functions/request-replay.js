const { PassThrough } = require("stream");

function shouldReplayRawBody(req) {
  return (
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    Buffer.isBuffer(req.rawBody) &&
    req.rawBody.length > 0
  );
}

function requestForNext(req) {
  if (!shouldReplayRawBody(req)) return req;

  const rawBody = req.rawBody;
  const replay = new PassThrough();
  process.nextTick(() => {
    replay.end(rawBody);
  });

  replay.method = req.method;
  replay.url = req.url;
  replay.originalUrl = req.originalUrl;
  replay.headers = req.headers;
  replay.rawHeaders = req.rawHeaders;
  replay.httpVersion = req.httpVersion;
  replay.httpVersionMajor = req.httpVersionMajor;
  replay.httpVersionMinor = req.httpVersionMinor;
  replay.socket = req.socket;
  replay.connection = req.connection;
  replay.rawBody = rawBody;

  return replay;
}

module.exports = { requestForNext };
