import React, { useState, useEffect } from "react";
import MenuIcon from '@mui/icons-material/Menu';
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Link,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  //Select,
  //MenuItem,
  //FormControl,
  //InputLabel,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Snackbar,
} from "@mui/material";
import {
  Logout as LogoutIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { logout } from "../redux/slices/authSlice";
import authService, { groupService } from "../services/api";
import "./Dashboard.css";
import logo from "../assets/logo_studyBuddy.png";
import gif1 from "../assets/gif1-study.gif";
import gif2 from "../assets/gif2-study.gif";
import SubjectGroupSearch from "../components/SubjectGroupSearch.jsx";

// Tárgyak listája pelda

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [joinGroupModalOpen, setJoinGroupModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState(null);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [myGroups, setMyGroups] = useState([]);
  const [myGroupsLoading, setMyGroupsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileNav, setIsMobileNav] = useState(false);
  
  
  // URL paraméterből olvassuk a tab-ot, ha van
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "home");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(
    () => {
      // Alapértelmezetten bekapcsolva, kivéve ha korábban kikapcsolták
      const saved = localStorage.getItem("toastNotificationsEnabled");
      return saved === null ? true : saved === "true";
    }
  );

  useEffect(() => {
    // Késleltetett indítás, hogy a DOM mountolódjon
    const timeoutId = setTimeout(() => {
      const navBox = document.querySelector('.desktop-nav-box');
      if (!navBox) {
        console.log('Nav box not found!'); // Debug
        return;
      }
  
      console.log('Observer started on navBox:', navBox); // Debug
  
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        const rect = entry.contentRect;
        const lastButton = navBox.querySelector('button:last-of-type'); 
        if (lastButton && rect.width > 0) {
          const buttonRect = lastButton.getBoundingClientRect();
          const containerRect = navBox.closest('.dashboard-nav')?.getBoundingClientRect();
          if (containerRect) {
            const overflows = buttonRect.right > containerRect.right - 20;
            console.log('Overflow check:', overflows, buttonRect.right, containerRect.right); // Debug
            setIsMobileNav(overflows);
          }
        }
      });
  
      observer.observe(navBox);
      return () => observer.disconnect();
    }, 100); // 100ms várakozás
  
    return () => clearTimeout(timeoutId);
  }, []);
  

  // Ha URL-ben van tab paraméter, beállítjuk
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["home", "my", "search"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Tab váltáskor frissítjük az URL-t
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "home") {
      // Kezdőlap esetén eltávolítjuk a tab paramétert
      navigate("/dashboard", { replace: true });
    } else {
      // Egyéb tab-ok esetén beállítjuk a paramétert
      navigate(`/dashboard?tab=${tab}`, { replace: true });
    }
  };

  useEffect(() => {
    const fetchMyGroups = async () => {
      setMyGroupsLoading(true);
      try {
        const response = await groupService.myGroups();
        setMyGroups(response.groups || []);
      } catch (err) {
        console.error("Saját csoportok hiba:", err);
      } finally {
        setMyGroupsLoading(false);
      }
    };
    fetchMyGroups();
  }, []);

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const counts = await groupService.getUnreadPostCounts();

        // Összehasonlítjuk az előző értékekkel, hogy észleljük az új posztokat
        setUnreadCounts((prevCounts) => {
          if (Object.keys(prevCounts).length > 0) {
            const newPostsGroups = [];

            // Végigmegyünk az összes csoporton
            for (const groupId in counts) {
              const currentCount = counts[groupId] || 0;
              const previousCount = prevCounts[groupId] || 0;

              // Ha nőtt az olvasatlan posztok száma
              if (currentCount > previousCount) {
                const group = myGroups.find((g) => g.id === parseInt(groupId));
                if (group) {
                  const newPostsCount = currentCount - previousCount;
                  newPostsGroups.push({
                    groupName: group.name,
                    count: newPostsCount,
                  });
                }
              }
            }

            // Ha van új poszt ÉS a toast értesítések be vannak kapcsolva, toast üzenetet mutatunk
            if (newPostsGroups.length > 0 && toastNotificationsEnabled) {
              // Csak az első csoportot mutatjuk egyszerre
              const firstGroup = newPostsGroups[0];
              setToastMessage(
                `${firstGroup.count} új poszt a "${firstGroup.groupName}" csoportban`
              );
              setToastOpen(true);
            }
          }

          return counts;
        });
      } catch (err) {
        console.error("Olvasatlan posztok száma hiba:", err);
      }
    };

    fetchUnreadCounts();

    // Real-time polling: 5 másodpercenként ellenőrzi az új posztokat
    const interval = setInterval(fetchUnreadCounts, 5000);

    return () => clearInterval(interval);
  }, [activeTab, myGroups, toastNotificationsEnabled]);

  useEffect(() => {
    if (activeTab === "my") {
      const fetchMyGroups = async () => {
        setMyGroupsLoading(true);
        try {
          const response = await groupService.myGroups();
          setMyGroups(response.groups || []);
        } catch (err) {
          console.error("Saját csoportok hiba:", err);
        } finally {
          setMyGroupsLoading(false);
        }
      };
      fetchMyGroups();
    }
  }, [activeTab]);

  // Frissítjük az olvasatlan számokat, amikor a felhasználó visszatér a dashboardra
  useEffect(() => {
    const handleFocus = () => {
      const fetchUnreadCounts = async () => {
        try {
          const counts = await groupService.getUnreadPostCounts();

          // Összehasonlítjuk az előző értékekkel
          setUnreadCounts((prevCounts) => {
            if (Object.keys(prevCounts).length > 0) {
              const newPostsGroups = [];

              for (const groupId in counts) {
                const currentCount = counts[groupId] || 0;
                const previousCount = prevCounts[groupId] || 0;

                if (currentCount > previousCount) {
                  const group = myGroups.find(
                    (g) => g.id === parseInt(groupId)
                  );
                  if (group) {
                    const newPostsCount = currentCount - previousCount;
                    newPostsGroups.push({
                      groupName: group.name,
                      count: newPostsCount,
                    });
                  }
                }
              }

              // Csak akkor mutatunk toast üzenetet, ha be van kapcsolva ÉS van új poszt
              if (newPostsGroups.length > 0 && toastNotificationsEnabled) {
                // Csak az első csoportot mutatjuk egyszerre
                const firstGroup = newPostsGroups[0];
                setToastMessage(
                  `${firstGroup.count} új poszt a "${firstGroup.groupName}" csoportban`
                );
                setToastOpen(true);
              }
            }

            return counts;
          });
        } catch (err) {
          console.error("Olvasatlan posztok száma hiba:", err);
        }
      };
      fetchUnreadCounts();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [myGroups, toastNotificationsEnabled]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("authUser");

    if (!token || !user) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    dispatch(logout());
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleAddButton = () => {
    handleTabChange("search");
    //setJoinGroupModalOpen(true);
  };

  const handleCloseJoinGroupModal = () => {
    setJoinGroupModalOpen(false);
    //setSelectedSubject("");
  };

  /*const handleJoinGroup = async () => {
    if (!selectedSubject) {
      setError("Válassz ki egy tárgyat!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await groupService.searchGroups(selectedSubject);
      // A response tartalmazza a recommended_group és all_groups mezőket
      const allGroups = [];
      const seenIds = new Set();

      // Először az all_groups-ot adjuk hozzá
      if (response.all_groups && Array.isArray(response.all_groups)) {
        response.all_groups.forEach((group) => {
          if (!seenIds.has(group.id)) {
            allGroups.push(group);
            seenIds.add(group.id);
          }
        });
      }

      // Ha van recommended_group és még nincs benne, akkor hozzáadjuk
      if (
        response.recommended_group &&
        !seenIds.has(response.recommended_group.id)
      ) {
        allGroups.push(response.recommended_group);
      }

      setGroups(allGroups);
      handleCloseJoinGroupModal();
    } catch (err) {
      setError(err.message || "Hiba történt a csoportok keresése során");
    } finally {
      setLoading(false);
    }
  };*/

  const getInitials = (name) => {
    if (!name) return "U";
    const words = name.trim().split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleProfileClick = () => {
    setProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setProfileModalOpen(false);
  };

  const handleViewMembers = async (groupId, groupName) => {
    setSelectedGroupName(groupName);
    setMembersModalOpen(true);
    setSelectedGroupMembers([]);

    try {
      const members = await groupService.getGroupMembers(groupId);
      setSelectedGroupMembers(members || []);
    } catch (err) {
      console.error("Tagok hiba:", err);
      setSelectedGroupMembers([]);
    }
  };

  const handleCloseMembersModal = () => {
    setMembersModalOpen(false);
    setSelectedGroupMembers([]);
    setSelectedGroupName("");
  };

  // Toast értesítések be/kikapcsolása
  const handleToggleToastNotifications = () => {
    const newValue = !toastNotificationsEnabled;
    setToastNotificationsEnabled(newValue);
    localStorage.setItem("toastNotificationsEnabled", String(newValue));
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <img src={logo} alt="Study Buddy" className="dashboard-logo" />
        
        <div className="dashboard-nav-right">
        <IconButton 
          className="hamburger-btn"
          onClick={(e) => {
            e.stopPropagation();
            setMobileMenuOpen(!mobileMenuOpen);
          }}
          sx={{ 
            display: isMobileNav ? 'flex' : 'none',
            color: '#667eea',
            position: 'relative',
            zIndex: 10000
          }}
        >
          <MenuIcon />
        </IconButton>

        <Box 
          className="desktop-nav-box"
          sx={{ 
            display: isMobileNav ? 'none' : 'flex',
            alignItems: 'center', 
            gap: 2 
          }}
        >
            
            {/* Sorrend: Kezdőlap → Saját csoportok → Keresés → Beállítások → Kijelentkezés */}
            <Button
              onClick={() => handleTabChange("home")}
              variant={activeTab === "home" ? "contained" : "outlined"}
              sx={{
                ml: 0.5,
                mr: 0.5,
                borderRadius: "999px",
                px: 2.5,
                py: 0.75,
                fontWeight: 600,
                textTransform: "none",
                background:
                  activeTab === "home"
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "transparent",
                color: activeTab === "home" ? "#ffffff" : "#667eea",
                borderColor: activeTab === "home" ? "#667eea" : "#667eea",
                boxShadow:
                  activeTab === "home"
                    ? "0 4px 15px rgba(102, 126, 234, 0.3)"
                    : "none",
                "&:hover": {
                  background:
                    activeTab === "home"
                      ? "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)"
                      : "rgba(102, 126, 234, 0.08)",
                  boxShadow:
                    activeTab === "home"
                      ? "0 6px 20px rgba(102, 126, 234, 0.4)"
                      : "0 2px 8px rgba(102, 126, 234, 0.2)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              Kezdőlap
            </Button>

            <Button
              onClick={() => handleTabChange("my")}
              variant={activeTab === "my" ? "contained" : "outlined"}
              sx={{
                ml: 0.5,
                mr: 0.5,
                borderRadius: "999px",
                px: 2.5,
                py: 0.75,
                fontWeight: 600,
                textTransform: "none",
                background:
                  activeTab === "my"
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "transparent",
                color: activeTab === "my" ? "#ffffff" : "#667eea",
                borderColor: activeTab === "my" ? "#667eea" : "#667eea",
                boxShadow:
                  activeTab === "my"
                    ? "0 4px 15px rgba(102, 126, 234, 0.3)"
                    : "none",
                "&:hover": {
                  background:
                    activeTab === "my"
                      ? "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)"
                      : "rgba(102, 126, 234, 0.08)",
                  boxShadow:
                    activeTab === "my"
                      ? "0 6px 20px rgba(102, 126, 234, 0.4)"
                      : "0 2px 8px rgba(102, 126, 234, 0.2)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              Saját csoportok
            </Button>

            <Button
              onClick={handleAddButton}
              variant={activeTab === "search" ? "contained" : "outlined"}
              sx={{
                ml: 0.5,
                mr: 0.5,
                borderRadius: "999px",
                px: 2.5,
                py: 0.75,
                fontWeight: 600,
                textTransform: "none",
                background:
                  activeTab === "search"
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "transparent",
                color: activeTab === "search" ? "#ffffff" : "#667eea",
                borderColor: activeTab === "search" ? "#667eea" : "#667eea",
                boxShadow:
                  activeTab === "search"
                    ? "0 4px 15px rgba(102, 126, 234, 0.3)"
                    : "none",
                "&:hover": {
                  background:
                    activeTab === "search"
                      ? "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)"
                      : "rgba(102, 126, 234, 0.08)",
                  boxShadow:
                    activeTab === "search"
                      ? "0 6px 20px rgba(102, 126, 234, 0.4)"
                      : "0 2px 8px rgba(102, 126, 234, 0.2)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <SearchIcon /> Csoport keresés
            </Button>

            <Button
              onClick={() => setSettingsModalOpen(true)}
              variant={activeTab === "settings" ? "contained" : "outlined"}
              sx={{
                ml: 0.5,
                mr: 0.5,
                borderRadius: "999px",
                px: 2.5,
                py: 0.75,
                fontWeight: 600,
                textTransform: "none",
                background:
                  activeTab === "settings"
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "transparent",
                color: activeTab === "settings" ? "#ffffff" : "#667eea",
                borderColor: activeTab === "settings" ? "#667eea" : "#667eea",
                boxShadow:
                  activeTab === "settings"
                    ? "0 4px 15px rgba(102, 126, 234, 0.3)"
                    : "none",
                "&:hover": {
                  background:
                    activeTab === "settings"
                      ? "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)"
                      : "rgba(102, 126, 234, 0.08)",
                  boxShadow:
                    activeTab === "settings"
                      ? "0 6px 20px rgba(102, 126, 234, 0.4)"
                      : "0 2px 8px rgba(102, 126, 234, 0.2)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <SettingsIcon />  Beállitások
            </Button>

            <Button
              onClick={handleLogout}
              variant="contained"
              startIcon={<LogoutIcon />}
              sx={{
                ml: 0.5,
                mr: 1,
                borderRadius: "999px",
                background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)",
                color: "white",
                px: 2.5,
                py: 0.75,
                fontWeight: 600,
                boxShadow: "0 4px 15px rgba(255, 107, 107, 0.3)",
                transition: "all 0.3s ease",
                "&:hover": {
                  background: "linear-gradient(135deg, #ff5252 0%, #e63950 100%)",
                  boxShadow: "0 6px 20px rgba(255, 107, 107, 0.4)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              Kijelentkezés
            </Button>

            <Avatar
              onClick={handleProfileClick}
              sx={{
                width: 50,
                height: 50,
                bgcolor: "#000000",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: 600,
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
                "&:hover": {
                  transform: "scale(1.1)",
                  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
                  bgcolor: "#1a1a1a",
                },
                display: { xs: 'none', md: 'block' },
              }}
            >
            {getInitials(user?.name)}
            </Avatar>

          </Box>
          {mobileMenuOpen && (
            <div className="mobile-menu">
              {/* PROFIL - Avatar elsőként */}

              
              <Box 
                onClick={() => { 
                  handleProfileClick(); 
                  setMobileMenuOpen(false); 
                }} 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  p: 2, 
                  borderRadius: '12px',
                  cursor: 'pointer',
                  mb: 1,
                  '&:hover': {
                    background: 'rgba(102, 126, 234, 0.08)'
                  }
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 48, 
                    height: 48, 
                    bgcolor: '#000000', 
                    color: '#ffffff', 
                    fontSize: '18px', 
                    fontWeight: 600 
                  }}
                >
                  {getInitials(user?.name)}
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Profil
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.name || 'Felhasználó'}
                  </Typography>
                </Box>
              </Box>

              
              <Divider sx={{ my: 1 }} />
              <Button 
                onClick={() => { 
                  handleTabChange('home'); 
                  setMobileMenuOpen(false); 
                }} 
                fullWidth 
                variant={activeTab === 'home' ? 'contained' : 'outlined'}
                sx={{ 
                  justifyContent: 'flex-start',
                  borderRadius: '12px !important',
                  mb: 0.5,
                  background: activeTab === 'home' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                  color: activeTab === 'home' ? 'white' : '#667eea'
                }}
              >
                Kezdőlap
              </Button>
              
              <Button 
                onClick={() => { 
                  handleTabChange('my'); 
                  setMobileMenuOpen(false); 
                }} 
                fullWidth 
                variant={activeTab === 'my' ? 'contained' : 'outlined'}
                sx={{ 
                  justifyContent: 'flex-start',
                  borderRadius: '12px !important',
                  mb: 0.5,
                  background: activeTab === 'my' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                  color: activeTab === 'my' ? 'white' : '#667eea'
                }}
              >
                Saját csoportok
              </Button>
              
              <Button 
                onClick={() => { 
                  handleAddButton(); 
                  setMobileMenuOpen(false); 
                }} 
                fullWidth 
                startIcon={<SearchIcon />}
                variant={activeTab === 'search' ? 'contained' : 'outlined'}
                sx={{ 
                  justifyContent: 'flex-start',
                  borderRadius: '12px !important',
                  mb: 0.5,
                  background: activeTab === 'search' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                  color: activeTab === 'search' ? 'white' : '#667eea'
                }}
              >
                Csoport keresés
              </Button>
              
              <Button 
                onClick={() => { 
                  setSettingsModalOpen(true); 
                  setMobileMenuOpen(false); 
                }} 
                fullWidth 
                startIcon={<SettingsIcon />}
                sx={{ 
                  justifyContent: 'flex-start',
                  borderRadius: '12px !important',
                  mb: 0.5,
                  color: '#667eea'
                }}
              >
                Beállítások
              </Button>
              
              <Divider sx={{ my: 1 }} />
              
              <Button 
                onClick={() => { 
                  handleLogout(); 
                }} 
                fullWidth 
                variant="contained" 
                startIcon={<LogoutIcon />}
                sx={{ 
                  borderRadius: '12px !important',
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                  color: 'white',
                  fontWeight: 600,
                  mt: 1
                }}
              >
                Kijelentkezés
              </Button>

            </div>
          )}

        </div>
      </nav>

      <main className="dashboard-content">
        {/* KEZDŐLAP TAB */}
        {activeTab === "home" && (
          <>
          <Alert 
            severity="warning" 
            icon={false}
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              mb: 4, 
              mt: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#1a1a1a', 
              borderRadius: '20px', 
              boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)', 
              fontWeight: 700,
              border: '1px solid #000000',
              '& .MuiAlert-icon': { color: '#d84315' },
              position: 'sticky',
              top: 0,
              zIndex: 10,
              animation: 'pulse 2s infinite'
            }}
          >
            <Typography variant="h6" sx={{ 
              fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem' },
              lineHeight: 1.3,
              fontWeight: 700,
              letterSpacing: '0.02em'
            }}>
              Ez egy <strong>kezdetleges demo verzió</strong>! Az alkalmazás folyamatos fejlesztés alatt áll.
              <br />
              <span style={{ fontWeight: 600, color: '#333' }}>
                Kérlek segítsd a munkánkat ötleteiddel és tapasztalataiddal! 
              </span>
              <br />
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                mt: 2, 
                mb: 1 
              }}>
                <Link 
                  href="https://docs.google.com/forms/d/e/1FAIpQLSdo-Rx_eSzK5svhMc4vAx266AWmqeLJla7O00XeRwSWrkUnDw/viewform"
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ 
                    color: 'rgb(255, 255, 255)', 
                    fontWeight: 800, 
                    textDecoration: 'none !important',
                    fontSize: { xs: '0.7rem', md: '0.9rem' },
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    px: 4, py: 1.5, 
                    borderRadius: '20px',
                    border: '1px solid #000000',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.3s ease',
                    '&:hover': { 
                      color: 'rgb(0, 0, 0)', 
                      background: 'linear-gradient(135deg,  #f5f7fa 0%, #c3cfe2 100%)',
                      transform: 'scale(1.05) translateY(-2px)'
                    }
                  }}
                >
                  Küldj visszajelzést!
                </Link>
              </Box>
            </Typography>
          </Alert>
          <Box sx={{ maxWidth: '1100px', mx: 'auto', mt: 6, mb: 8 }}>
          
          {/* Study Buddy cím*/}
          <Typography 
            variant="h1" 
            sx={{ 
              fontSize: { xs: '3rem', sm: '4rem', md: '5.5rem' }, 
              fontWeight: 900, 
              textAlign: 'center', 
              mb: 2, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.1,
              letterSpacing: '-0.02em'
            }}
          >
            Study Buddy
          </Typography>

          {/* Slogan sor */}
          <Typography 
            variant="h3" 
            sx={{ 
              fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2.2rem' },
              fontWeight: 700,
              textAlign: 'center', 
              mb: 3, 
              color: '#333',
              lineHeight: 1.3
            }}
          >
            Együtt könnyebb a tanulás!
          </Typography>

          {/* Leírás */}
          <Typography 
            variant="h5" 
            sx={{ 
              fontSize: { xs: '1.1rem', sm: '1.2rem', md: '1.4rem' },
              textAlign: 'center', 
              mb: 6, 
              color: '#555',
              lineHeight: 1.6,
              maxWidth: '800px',
              mx: 'auto',
              px: 2
            }}
          >
            A Study Buddy egy tanulócsoport kereső és szervező felület, ahol tárgyak szerint találhatsz vagy hozhatsz létre csoportokat. Csatlakozhatsz más hallgatókhoz és könnyebben szervezhetitek a közös tanulást.
          </Typography>

          {/* Első GIF*/}
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <img 
              src={gif1}
              alt="Study Buddy animáció" 
              style={{ 
                maxWidth: '100%', 
                height: 'auto', 
                borderRadius: '20px', 
                boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                maxHeight: '400px'
              }} 
            />
          </Box>

          {/* Hogyan használd?*/}
          <Typography 
            variant="h2" 
            sx={{ 
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 800,
              textAlign: 'center', 
              mb: 5, 
              color: '#333',
              letterSpacing: '-0.01em'
            }}
          >
            Hogyan használd?
          </Typography>

          {/* Felsorolás*/}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '800px', mx: 'auto' }}>
            <Box sx={{ 
              p: 4, 
              background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%)', 
              borderRadius: '20px', 
              border: '1px solid rgba(102,126,234,0.2)',
              boxShadow: '0 8px 25px rgba(102,126,234,0.1)'
            }}>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.5, color: '#333' }}>
                Válaszd a <strong>Csoport keresés</strong> gombot, majd add meg a tárgyat, amihez csoportot keresel.
              </Typography>
            </Box>
            <Box sx={{ 
              p: 4, 
              background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%)', 
              borderRadius: '20px', 
              border: '1px solid rgba(102,126,234,0.2)',
              boxShadow: '0 8px 25px rgba(102,126,234,0.1)'
            }}>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.5, color: '#333' }}>
                A találati listában látod a csoport nevét, leírását, létszámát és közös hobbikat.
              </Typography>
            </Box>
            <Box sx={{ 
              p: 4, 
              background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%)', 
              borderRadius: '20px', 
              border: '1px solid rgba(102,126,234,0.2)',
              boxShadow: '0 8px 25px rgba(102,126,234,0.1)'
            }}>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.5, color: '#333' }}>
                A <strong>Csatlakozás</strong> gombbal beléphetsz a csoportba, ezután a <strong>Saját csoportok</strong> oldalon mindig elérhető lesz.
              </Typography>
            </Box>
          </Box>

          {/* Második GIF */}
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <img 
              src={gif2}
              alt="Hogyan használd animáció" 
              style={{ 
                maxWidth: '100%', 
                height: 'auto', 
                borderRadius: '20px', 
                boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                maxHeight: '400px'
              }} 
            />
          </Box>

        </Box>
          </>
        )}
        {/* KERESÉS TAB */}
        {activeTab === "search" && <SubjectGroupSearch />}

        {/* SAJÁT CSOPORTOK TAB */}
        {activeTab === "my" && (
          <>
            {myGroupsLoading ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress size={24} />
                <Typography sx={{ mt: 1 }}>
                  Saját csoportok betöltése...
                </Typography>
              </Box>
            ) : (
              myGroups.length > 0 && (
                <Box sx={{ mb: { xs: 4, md: 6 } }}>
                  <Box
                    sx={{
                      mb: { xs: 3, md: 4 },  // Kisebb távolság
                      p: { xs: 2, md: 3 },   // Kisebb padding
                      borderRadius: { xs: 12, md: 16 },  // Kisebb kerekítés
                      background: "linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(46, 125, 50, 0.1) 100%)",
                      border: "1px solid rgba(76, 175, 80, 0.3)",
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{
                        mb: 1,
                        background: "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        fontWeight: 700,
                        fontSize: { xs: '1.4rem', sm: '1.6rem', md: '2rem' },  // Progresszív méret
                        lineHeight: { xs: 1.2, md: 1.3 }
                      }}
                    >
                      Saját Csoportjaid ({myGroups.length})
                    </Typography>
                  </Box>

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {myGroups.map((group) => {
                      const unreadCount = unreadCounts[group.id] || 0;
                      return (
                        <Card
                          key={group.id}
                          onClick={() => navigate(`/forum/${group.id}`)}
                          sx={{
                            borderRadius: "20px",
                            border: "1px solid rgba(76, 175, 80, 0.3)",
                            boxShadow: "0 4px 20px rgba(76, 175, 80, 0.1)",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            position: "relative",
                            "&:hover": {
                              boxShadow: "0 8px 32px rgba(76, 175, 80, 0.2)",
                              transform: "translateY(-2px)",
                              borderColor: "rgba(76, 175, 80, 0.5)",
                            },
                          }}
                        >
                          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                            <Box
                              display="flex"
                              flexDirection={{ xs: 'column', sm: 'row' }}
                              justifyContent="space-between"
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                              gap={{ xs: 1.5, sm: 2 }}
                              width="100%"
                            >
                              {/* BAL/NÉV RÉSZ */}
                              <Box 
                                flex={1} 
                                minWidth={0} 
                                sx={{ 
                                  order: { xs: 1, sm: 1 },
                                  mb: { xs: 1.5, sm: 0 }  // Mobilon távolság a gomb előtt
                                }}
                              >
                                {/* NÉV + BADGE */}
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Typography
                                    variant={{ xs: 'h6', sm: 'h5' }}
                                    sx={{
                                      fontWeight: 700,
                                      color: "#2e7d32",
                                      fontSize: { xs: '1rem', sm: '1.2rem', md: '1.4rem' },
                                      lineHeight: { xs: 1.2, md: 1.3 },
                                      wordBreak: 'break-word',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      flexGrow: 1
                                    }}
                                  >
                                    {group.name}
                                  </Typography>
                                  
                                  {unreadCount > 0 && (
                                    <Box
                                      sx={{
                                        minWidth: 24,
                                        height: 24,
                                        borderRadius: "12px",
                                        background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)",
                                        color: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        px: 0.75,
                                        boxShadow: "0 2px 8px rgba(255, 107, 107, 0.4)",
                                      }}
                                    >
                                      {unreadCount > 99 ? "99+" : unreadCount}
                                    </Box>
                                  )}
                                </Box>

                                {/* INFO */}
                                <Typography
                                  variant={{ xs: 'caption', sm: 'body2' }}
                                  color="text.secondary"
                                  sx={{ mt: 0.5 }}
                                >
                                  {group.subject} • Csatlakoztál: {new Date(group.joined_at).toLocaleDateString("hu-HU")}
                                </Typography>

                                {group.description && (
                                  <Typography
                                    variant="body2"
                                    sx={{ mt: 1, fontStyle: "italic", fontSize: '0.9rem' }}
                                  >
                                    {group.description}
                                  </Typography>
                                )}
                              </Box>

                              {/* JOBB/ICON GOMB - MOBILON LENT */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  order: { xs: 2, sm: 2 },      // Mindig második
                                  mt: { xs: 1.5, sm: 0 },       // Mobilon lent
                                  ml: { xs: 0, sm: 2 },         // Desktop jobb
                                  width: { xs: 'fit-content', sm: 'auto' }
                                }}
                              >
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewMembers(group.id, group.name);
                                  }}
                                  size="medium"  // EGYSZERŰ: csak size="medium" vagy "large"
                                  sx={{
                                    color: "#667eea",           // Mindig látható kék
                                    p: { xs: 1.2, sm: 1 },
                                    borderRadius: 2,
                                    "&:hover": {
                                      bgcolor: "rgba(102, 126, 234, 0.15)",
                                      transform: 'scale(1.05)',
                                      boxShadow: '0 4px 12px rgba(102,126,234,0.25)'
                                    }
                                  }}
                                >
                                  <PeopleIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />  {/* Responsive ikon méret */}
                                </IconButton>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                </Box>
              )
            )}
          </>
        )}
      </main>

      {/* Profil Modal */}
      <Dialog
        open={profileModalOpen}
        onClose={handleCloseProfileModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 1)",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            pb: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: "#000000",
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: 600,
                border: "2px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
              }}
            >
              {getInitials(user?.name)}
            </Avatar>
            <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
              Profil
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Teljes név
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {user?.name || "Nincs megadva"}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Email cím
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {user?.email || "Nincs megadva"}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Szak
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {user?.major || "Nincs megadva"}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Hobbik
              </Typography>
              {user?.hobbies &&
              typeof user.hobbies === "string" &&
              user.hobbies.trim() !== "" ? (
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mt: 1,
                  }}
                >
                  {user.hobbies.split(",").map((hobby, index) => (
                    <Box
                      key={index}
                      sx={{
                        px: 2,
                        py: 0.75,
                        borderRadius: "20px",
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 600,
                        boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
                        },
                      }}
                    >
                      {hobby.trim()}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Nincs megadva hobbi
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseProfileModal}
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
              },
            }}
          >
            Bezárás
          </Button>
        </DialogActions>
      </Dialog>

      {/* Beállítások Modal */}
      <Dialog
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 1)",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            pb: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <SettingsIcon sx={{ fontSize: 28 }} />
            <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
              Beállítások
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  color: "#333",
                  mb: 2,
                }}
              >
                Értesítések
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 2,
                  borderRadius: "12px",
                  background: "rgba(102, 126, 234, 0.05)",
                  border: "1px solid rgba(102, 126, 234, 0.1)",
                }}
              >
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                    Felugró értesítések
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.75rem" }}
                  >
                    Értesítések új posztokról
                  </Typography>
                </Box>
                <Button
                  onClick={handleToggleToastNotifications}
                  variant={toastNotificationsEnabled ? "contained" : "outlined"}
                  sx={{
                    minWidth: 100,
                    borderRadius: "20px",
                    background: toastNotificationsEnabled
                      ? "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)"
                      : "transparent",
                    color: toastNotificationsEnabled ? "white" : "#667eea",
                    borderColor: toastNotificationsEnabled
                      ? "#4caf50"
                      : "#667eea",
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": {
                      background: toastNotificationsEnabled
                        ? "linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)"
                        : "rgba(102, 126, 234, 0.1)",
                    },
                  }}
                >
                  {toastNotificationsEnabled ? "Bekapcsolva" : "Kikapcsolva"}
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setSettingsModalOpen(false)}
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
              },
            }}
          >
            Bezárás
          </Button>
        </DialogActions>
      </Dialog>

      {/* Csatlakozás csoporthoz Modal */}
      <Dialog
        open={joinGroupModalOpen}
        onClose={handleCloseJoinGroupModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 1)",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            pb: 2,
          }}
        >
          <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
            Csatlakozás csoporthoz
          </Typography>
        </DialogTitle>

        {/* EDDIGI FormControl + Select HELYETT EZ */}
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <SubjectGroupSearch />
          </Box>
        </DialogContent>

        {/* Alsó gombsorban csak Bezárás kell, a keresést a SubjectGroupSearch intézi */}
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={handleCloseJoinGroupModal}
            sx={{
              borderRadius: "12px",
              px: 3,
              py: 1,
              fontWeight: 600,
              color: "#667eea",
              "&:hover": {
                background: "rgba(102, 126, 234, 0.1)",
              },
            }}
          >
            Bezárás
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tagok lista Modal */}
      <Dialog
        open={membersModalOpen}
        onClose={handleCloseMembersModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 1)",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            pb: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <PeopleIcon sx={{ fontSize: 28 }} />
            <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
              Tagok - {selectedGroupName}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedGroupMembers === null ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Tagok betöltése...
              </Typography>
            </Box>
          ) : selectedGroupMembers.length === 0 ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Még nincsenek tagok ebben a csoportban.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              {selectedGroupMembers.map((member, index) => (
                <Box key={member.id || index}>
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={2}
                    sx={{ py: 1.5 }}
                  >
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "#ffffff",
                        fontSize: "18px",
                        fontWeight: 600,
                        boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                      }}
                    >
                      {getInitials(member.name || member.email)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {member.name || "Névtelen felhasználó"}
                      </Typography>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 0.25 }}
                        >
                          {member.email || "Nincs email"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.major || ""}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  {index < selectedGroupMembers.length - 1 && <Divider />}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseMembersModal}
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
              },
            }}
          >
            Bezárás
          </Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <footer className="dashboard-footer">
        <Box
          sx={{
            maxWidth: "1400px",
            margin: "0 auto",
            width: "100%",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: "#666",
                fontWeight: 500,
                mb: 0.5,
              }}
            >
              Study Buddy
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "#999",
              }}
            >
              Együtt könnyebb a tanulás!
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 3,
              flexWrap: "wrap",
              justifyContent: { xs: "center", sm: "flex-end" },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#999",
              }}
            >
              © 2025 Study Buddy. Minden jog fenntartva.
            </Typography>
          </Box>
        </Box>
      </footer>

      {/* Toast üzenet új posztokhoz */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{
          mt: 8,
        }}
      >
        <Alert
          onClose={() => setToastOpen(false)}
          severity="info"
          sx={{
            width: "100%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            "& .MuiAlert-icon": {
              color: "white",
            },
            boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
            borderRadius: "12px",
          }}
        >
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
            Új poszt érkezett!
          </Typography>
          <Typography variant="body2">{toastMessage}</Typography>
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Dashboard;
