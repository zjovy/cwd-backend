// Requires authMiddleware to have run first
const requireApprovalMiddleware = (req, res, next) => {
  if (!req.user?.isApproved) {
    return res.status(403).json({ error: 'User not approved yet' });
  }
  next();
};

export default requireApprovalMiddleware;
