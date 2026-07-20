import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { sitesService } from '../services';

const SiteContext = createContext();

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
};

export const SiteProvider = ({ children }) => {
  const [selectedSite, setSelectedSite] = useState(() => {
    const saved = localStorage.getItem('selectedSite');
    return saved ? JSON.parse(saved) : 'all';
  });
  
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false); // Anti-loop flag

  // Fonction pour charger/recharger les sites
  const fetchSites = async () => {
    setLoading(true);
    try {
      const response = await sitesService.getSites({ is_active: true });
      const sitesList = response?.results || response || [];
      setSites(sitesList);
      
      const savedSite = localStorage.getItem('selectedSite');
      const currentSite = savedSite ? JSON.parse(savedSite) : 'all';
      if (currentSite !== 'all' && sitesList.length > 0 && !sitesList.find(s => s.id === currentSite)) {
        setSelectedSite('all');
        localStorage.setItem('selectedSite', JSON.stringify('all'));
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les sites au démarrage - UNE SEULE FOIS
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchSites();
  }, []);

  // Fonction pour rafraîchir manuellement la liste des sites
  const refreshSites = () => {
    fetchSites();
  };

  // Sauvegarder le site sélectionné dans localStorage
  const selectSite = (siteId) => {
    setSelectedSite(siteId);
    localStorage.setItem('selectedSite', JSON.stringify(siteId));
  };

  // Obtenir le nom du site sélectionné
  const getSelectedSiteName = () => {
    if (selectedSite === 'all') return 'Tous les sites';
    const site = sites.find(s => s.id === selectedSite);
    return site ? site.name : 'Tous les sites';
  };

  // Filtrer les données par site
  const filterBySite = (items) => {
    if (selectedSite === 'all') return items;
    return items.filter(item => {
      // Support différents noms de champs pour le site
      return item.site === selectedSite || 
             item.site_id === selectedSite || 
             item.siteId === selectedSite;
    });
  };

  const value = {
    selectedSite,
    selectSite,
    sites,
    loading,
    getSelectedSiteName,
    filterBySite,
    refreshSites,
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
};
