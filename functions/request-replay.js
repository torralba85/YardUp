const { PassThrough, Readable } = require("stream");
const { NodeNextRequest } = require("next/dist/server/base-http/node");

function bodyBufferForReplay(req) {
  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) {
    return req.rawBody;
  }

  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.length > 0) {
    return Buffer.from(req.body);
  }

  if (
    req.body &&
    typeof req.body === "object" &&
    Object.keys(req.body).length > 0
  ) {
    return Buffer.from(JSON.stringify(req.body));
  }

  return null;
}

function requestForNext(req) {
  if (req.method === "GET" || req.method === "HEAD") return req;

  const body = bodyBufferForReplay(req);
  if (!body) return req;

  const replay = new PassThrough();
  process.nextTick(() => {
    replay.end(body);
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
  replay.rawBody = body;

  const nextRequest = new NodeNextRequest(replay);
  nextRequest.body = Readable.toWeb(Readable.from([body]));

  return nextRequest;
}

module.exports = { requestForNext };
