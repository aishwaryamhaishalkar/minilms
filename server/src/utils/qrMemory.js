const activeTokens = new Map();

export function rememberToken(sessionId, token) {
  activeTokens.set(sessionId.toString(), token);
}

export function readToken(sessionId) {
  return activeTokens.get(sessionId.toString());
}

export function forgetToken(sessionId) {
  activeTokens.delete(sessionId.toString());
}
