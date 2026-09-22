/**
 * Middleware factory : autorise uniquement les admins dont le rôle figure dans la liste.
 * Doit être utilisé après authMiddleware (qui renseigne req.admin).
 */
const requireRole = (...rolesAutorises) => (req, res, next) => {
  if (!req.admin || !rolesAutorises.includes(req.admin.role)) {
    return res.status(403).json({ message: 'Accès refusé : permissions insuffisantes pour cette action.' });
  }
  next();
};

/**
 * Middleware : calcule le filtre MongoDB à appliquer selon le rôle de l'admin connecté,
 * et le place dans req.filtreRole. Permet de restreindre automatiquement la liste des
 * inscriptions visibles/modifiables pour les admins "Clients" et "Personnel".
 */
const restreindreInscriptionsParRole = (req, res, next) => {
  if (req.admin?.role === 'admin_clients') {
    req.filtreRole = { typeInscrit: 'client' };
  } else if (req.admin?.role === 'admin_personnel') {
    req.filtreRole = { typeInscrit: 'personnel' };
  } else {
    req.filtreRole = {};
  }
  next();
};

module.exports = { requireRole, restreindreInscriptionsParRole };
