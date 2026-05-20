import { timingSafeEqual } from 'crypto';

const syncAuthMiddleware = (req, res, next) => {
  const auth = req.headers['authorization'] ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const key = process.env.SYNC_API_KEY ?? '';

  if (
    !key ||
    !token ||
    key.length !== token.length ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(key))
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default syncAuthMiddleware;
